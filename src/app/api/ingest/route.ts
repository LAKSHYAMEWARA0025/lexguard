export const dynamic = 'force-dynamic';

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
    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    
    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    // Vercel Free Tier Limit is 4.5MB. Prevent memory overflow crashes.
    const MAX_FILE_SIZE = 4.5 * 1024 * 1024; 
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: "File exceeds the 4.5MB limit. Please upload a smaller contract." }, 
        { status: 400 }
      );
    }

    // Convert file to buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

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

    const fileUrl = uploadResult.secure_url;
    console.log('Cloudinary Upload Success:', fileUrl);

    // 2. Extract text from file (PDF, DOCX, TXT)
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
    
    if (!fullText || fullText.trim().length < 10) {
      console.error("[INGEST ERROR] Could not extract readable text. Length:", fullText ? fullText.length : 0);
      return NextResponse.json({ error: "Could not extract readable text from this document. Ensure it is not a scanned image." }, { status: 400 });
    }

    // 3. Split into semantic chunks by isolating distinct paragraphs and clauses
    const rawChunks = fullText.split('\n\n');
    const chunks = rawChunks
      .map(chunk => chunk.trim())
      .filter(chunk => chunk.length >= 10)
      .map(chunk => ({ pageContent: chunk }));
    
    const chunkTexts = chunks.map(chunk => chunk.pageContent);
    console.log('Chunking Success, Total Chunks:', chunks.length);

    // Insert document first
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

    // 1. Initialize Google Embeddings
    const embeddingsModel = new GoogleGenerativeAIEmbeddings({
      model: "models/gemini-embedding-001",
      apiKey: process.env.GOOGLE_API_KEY,
    });

    console.log('Generating embeddings for', chunks.length, 'chunks...');
    
    // 2. Generate Embeddings & Format for Supabase
    const chunksToInsert = [];
    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];
      let vector;
      try {
        const contextualizedText = `[LexGuard Contract Clause] \n\n ${chunk.pageContent}`;
        vector = await embeddingsModel.embedQuery(contextualizedText);
        // 3. Pre-Insert Database Check
        if (!vector || vector.length === 0) throw new Error("Google API returned an empty vector.");
        
        chunksToInsert.push({
          document_id: documentId,
          content: chunk.pageContent,
          embedding: vector
        });
      } catch (error: any) {
        console.error(`[INGEST ERROR] Failed to generate embedding for chunk ${i}:`, error.message);
        return NextResponse.json({ error: `AI Embedding failed: ${error.message}` }, { status: 500 });
      }
    }
    
    console.log(`Embedding Success! Vectors generated for ${chunksToInsert.length} chunks.`);

    // 4. Insert into Supabase
    const { error: chunksError } = await supabase
      .from('document_chunks')
      .insert(chunksToInsert);

    if (chunksError) {
      throw new Error(`Failed to insert document chunks: ${chunksError.message}`);
    }
    console.log('Supabase Insertion Success, Document ID:', documentId);

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
