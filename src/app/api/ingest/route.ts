import { NextRequest, NextResponse } from 'next/server';
import cloudinary from '@/lib/cloudinary';
import { supabase } from '@/lib/supabase';
import { RecursiveCharacterTextSplitter } from '@langchain/textsplitters';
import { GoogleGenerativeAIEmbeddings } from '@langchain/google-genai';
import { extractText, getDocumentProxy } from "unpdf";

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    
    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
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

    // 2. Extract text from PDF using unpdf
    const pdf = await getDocumentProxy(new Uint8Array(buffer));
    const extractedResult = await extractText(pdf, { mergePages: true });
    const fullText = extractedResult.text;
    console.log('PDF Extraction Success, Text Length:', fullText.length);

    // 3. Split into chunks (~1000 size, ~200 overlap)
    const splitter = new RecursiveCharacterTextSplitter({
      chunkSize: 1000,
      chunkOverlap: 200,
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
