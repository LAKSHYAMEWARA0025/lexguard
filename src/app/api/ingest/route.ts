export const dynamic = 'force-dynamic';
export const maxDuration = 60;

import { NextRequest, NextResponse } from 'next/server';
import { v2 as cloudinary } from 'cloudinary';
import { supabase } from '@/lib/supabase';
import { RecursiveCharacterTextSplitter } from '@langchain/textsplitters';
import { GoogleGenerativeAIEmbeddings } from '@langchain/google-genai';
import { extractText, getDocumentProxy } from "unpdf";
// @ts-ignore
import * as mammoth from "mammoth";

export async function POST(req: NextRequest) {
  try {
    console.log('1. File upload request received');
    const formData = await req.formData();
    console.log('1.1 Form data parsed');
    const file = formData.get('file') as File | null;
    
    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    console.log(`1.2 File received: ${file.name} (${file.size} bytes)`);

    // Vercel Free Tier Limit is 4.5MB. Prevent memory overflow crashes.
    const MAX_FILE_SIZE = 4.5 * 1024 * 1024; 
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: "File exceeds the 4.5MB limit. Please upload a smaller contract." }, 
        { status: 400 }
      );
    }

    // Convert file to buffer
    console.log('2. Reading file into memory');
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    console.log('2. File buffered successfully');

    // Add quiet connectivity check
    if (!process.env.CLOUDINARY_CLOUD_NAME || !process.env.CLOUDINARY_API_KEY || !process.env.CLOUDINARY_API_SECRET) {
      return NextResponse.json({ error: "Cloudinary configuration missing on server." }, { status: 500 });
    }

    cloudinary.config({
      cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
      api_key: process.env.CLOUDINARY_API_KEY,
      api_secret: process.env.CLOUDINARY_API_SECRET,
    });

    // 1. Upload to Cloudinary via stream
    console.log('3. Starting Cloudinary upload');
    const uploadResult = await new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        { resource_type: 'auto', folder: 'lexguard_docs' },
        (error, result) => {
          if (error) reject(error);
          else resolve(result);
        }
      );
      uploadStream.end(buffer);
    }) as any;
    console.log('3. Cloudinary upload complete');

    const fileUrl = uploadResult.secure_url;
    console.log('Cloudinary Upload Success:', fileUrl);

    // 2. Extract text from file (PDF, DOCX, TXT)
    console.log('4. Starting text extraction');
    const mimeType = file.type;
    let fullText = "";

    if (mimeType === "application/pdf") {
      // Handle PDF
      const pdf = await getDocumentProxy(new Uint8Array(buffer));
      const extractedResult = await extractText(pdf, { mergePages: true });
      const rawText = extractedResult.text as any;
      if (Array.isArray(rawText)) {
          fullText = rawText.join("\n");
      } else {
          fullText = String(rawText);
      }
      console.log('PDF Extraction Success, Text Length:', fullText.length);
    } 
    else if (mimeType === "text/plain") {
      // Handle TXT
      fullText = await file.text();
      console.log('TXT Extraction Success, Text Length:', fullText.length);
    } 
    else if (mimeType === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" || file.name.endsWith('.docx')) {
      // Handle DOCX
      const result = await mammoth.extractRawText({ buffer });
      fullText = result.value;
      console.log('DOCX Extraction Success, Text Length:', fullText.length);
    } 
    else {
      return NextResponse.json({ error: "Unsupported file type. Please upload a PDF, DOCX, or TXT file." }, { status: 400 });
    }

    console.log('4. Text extraction complete');
    
    if (!fullText || fullText.trim().length < 10) {
      console.error("[INGEST ERROR] Could not extract readable text. Length:", fullText ? fullText.length : 0);
      return NextResponse.json({ error: "Could not extract readable text from this document. Ensure it is not a scanned image." }, { status: 400 });
    }

    // 3. Split into semantic chunks by isolating distinct paragraphs and clauses
    console.log('5. Starting chunking');
    const rawChunks = fullText
      .split('\n\n')
      .map(chunk => chunk.trim())
      .filter(chunk => chunk.length >= 10);

    const mergeSemanticChunks = (
      chunks: string[],
      minChars = 500,
      targetChars = 900,
      maxChars = 1200
    ) => {
      const grouped: string[] = [];
      let current = '';

      for (const chunk of chunks) {
        if (!current) {
          current = chunk;
          continue;
        }

        const separator = current.endsWith('\n') ? '' : '\n\n';
        const candidate = `${current}${separator}${chunk}`;

        if (candidate.length <= targetChars) {
          current = candidate;
          continue;
        }

        if (current.length < minChars && candidate.length <= maxChars) {
          current = candidate;
          continue;
        }

        grouped.push(current);
        current = chunk;
      }

      if (current) {
        const previous = grouped[grouped.length - 1];

        if (previous && current.length < minChars && previous.length + current.length + 2 <= maxChars) {
          grouped[grouped.length - 1] = `${previous}\n\n${current}`;
        } else {
          grouped.push(current);
        }
      }

      return grouped;
    };

    const groupedChunks = mergeSemanticChunks(rawChunks);
    const chunks = groupedChunks.map(chunk => ({ pageContent: chunk }));
    
    const chunkTexts = chunks.map(chunk => chunk.pageContent);
    console.log(`Chunking Success, Raw chunks: ${rawChunks.length}, Grouped chunks: ${chunks.length}`);
    console.log(`5. Chunking complete: ${chunks.length} grouped chunks ready`);

    // Insert document first
    console.log('6. Saving document record to Supabase');
    const { data: docData, error: docError } = await supabase
      .from('documents')
      .insert({
        filename: file.name,
        file_url: fileUrl,
      })
      .select('id')
      .single();

    if (docError) {
      throw new Error(`Failed to insert document: ${docError.message}`);
    }

    const documentId = docData.id;
    console.log('6. Document record saved to Supabase:', documentId);

    // 1. Initialize Google Embeddings
    console.log('7. Initializing embedding model');
    const embeddingsModel = new GoogleGenerativeAIEmbeddings({
      model: "models/gemini-embedding-001",
      apiKey: process.env.GOOGLE_API_KEY,
    });
    console.log('7. Embedding model ready');

    console.log(`8. Generating embeddings for ${chunks.length} chunks in batches of 12`);
    
    // 2. Generate Embeddings & Format for Supabase
    const chunksToInsert = [];
    const batchSize = 12;
    for (let batchStart = 0; batchStart < chunks.length; batchStart += batchSize) {
      const batchNumber = Math.floor(batchStart / batchSize) + 1;
      const batch = chunks.slice(batchStart, batchStart + batchSize);
      console.log(`8.${batchNumber} Starting embedding batch ${batchNumber} with ${batch.length} chunks`);

      try {
        const batchVectors = await Promise.all(
          batch.map(async (chunk, batchIndex) => {
            const chunkIndex = batchStart + batchIndex;
            const contextualizedText = `[LexGuard Contract Clause] \n\n ${chunk.pageContent}`;
            console.log(`8.${batchNumber}.${batchIndex + 1} Embedding chunk ${chunkIndex + 1}`);
            const vector = await embeddingsModel.embedQuery(contextualizedText);

            if (!vector || vector.length === 0) {
              throw new Error(`Google API returned an empty vector for chunk ${chunkIndex + 1}.`);
            }

            console.log(`8.${batchNumber}.${batchIndex + 1} Embedding complete for chunk ${chunkIndex + 1}`);
            return {
              document_id: documentId,
              content: chunk.pageContent,
              embedding: vector,
            };
          })
        );

        chunksToInsert.push(...batchVectors);
        console.log(`8.${batchNumber} Finished embedding batch ${batchNumber}; accumulated vectors: ${chunksToInsert.length}`);
      } catch (error: any) {
        console.error(`[INGEST ERROR] Failed during embedding batch ${batchNumber}:`, error.message);
        return NextResponse.json({ error: `AI Embedding failed: ${error.message}` }, { status: 500 });
      }
    }
    
    console.log(`Embedding Success! Vectors generated for ${chunksToInsert.length} chunks.`);

    // 4. Insert into Supabase
    console.log('9. Saving vector batches to Supabase pgvector');
    const chunksInsertPromise = supabase
      .from('document_chunks')
      .insert(chunksToInsert);

    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => {
        reject(new Error('Supabase vector insert timed out after 15 seconds.'));
      }, 15000);
    });

    const { error: chunksError } = await Promise.race([
      chunksInsertPromise,
      timeoutPromise,
    ]) as { error: any };

    if (chunksError) {
      throw new Error(`Failed to insert document chunks: ${chunksError.message}`);
    }
    console.log('9. Supabase Insertion Success, Document ID:', documentId);

    return NextResponse.json({ 
      success: true, 
      documentId, 
      message: `Successfully processed ${file.name} into ${chunkTexts.length} chunks.` 
    });

  } catch (error: any) {
    console.error("[Backend Route Error]:", error);
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
  }
}
