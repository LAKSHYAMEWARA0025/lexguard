import { NextRequest, NextResponse } from 'next/server';
import cloudinary from '@/lib/cloudinary';
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
    
    if (!fullText || fullText.trim().length === 0) {
        throw new Error("Failed to extract text from the document. The file may be empty or unreadable.");
    }

    // 3. Split into chunks (~2000 size, ~500 overlap)
    const splitter = new RecursiveCharacterTextSplitter({
      chunkSize: 2000,
      chunkOverlap: 500,
    });
    
    const chunks = await splitter.createDocuments([fullText]);
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
      model: "models/gemini-embedding-001", // Ensure this exact string
    });

    // 2. Generate Embeddings (Crucial: await the result)
    console.log('Generating embeddings for', chunkTexts.length, 'chunks...');
    const embeddings = await embeddingsModel.embedDocuments(chunkTexts);

    if (!embeddings || embeddings.length === 0 || !embeddings[0]) {
      throw new Error("Google API returned empty embeddings.");
    }
    console.log(`Embedding Success! Vector dimensions: ${embeddings[0].length}`);

    // 3. Format data for Supabase pgvector
    const chunksToInsert = chunks.map((chunk, index) => ({
      document_id: documentId,
      content: chunk.pageContent,
      embedding: embeddings[index] 
    }));

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
    console.error('Ingestion Pipeline Failed:', error);
    return NextResponse.json(
      { error: error.message || 'An error occurred during ingestion' }, 
      { status: 500 }
    );
  }
}
