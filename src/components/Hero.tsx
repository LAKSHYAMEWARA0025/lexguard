"use client";

import Image from 'next/image';
import { Upload, Loader2 } from 'lucide-react';
import { useState } from 'react';

export default function Hero() {
  const [isUploading, setIsUploading] = useState(false);

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('/api/ingest', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Upload failed');
      }

      const result = await response.json();
      alert(`Success! Document processed into ${result.documentId}`);
    } catch (error) {
      console.error('Upload error:', error);
      alert('Failed to upload and process document. Please check console for details.');
    } finally {
      setIsUploading(false);
      // Reset input
      event.target.value = '';
    }
  };

  return (
    <section className="relative w-full min-h-[85vh] flex items-center justify-center overflow-hidden bg-slate-950">
      {/* Background Image */}
      <div className="absolute inset-0 z-0">
        <Image
          src="/hero-background.png"
          alt="Legal Tech Background"
          fill
          priority
          className="object-cover opacity-50 mix-blend-overlay"
        />
        {/* Gradient overlays for depth and text readability */}
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/60 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-r from-slate-950/80 via-transparent to-slate-950/80" />
      </div>

      {/* Content */}
      <div className="relative z-10 container mx-auto px-6 text-center text-white">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-900/40 border border-blue-500/30 text-blue-300 text-sm font-medium mb-8 backdrop-blur-sm">
          <span className="w-2 h-2 rounded-full bg-blue-400 animate-pulse" />
          Next-Generation Legal Intelligence
        </div>
        
        <h1 className="text-4xl md:text-6xl lg:text-7xl font-extrabold tracking-tight mb-6">
          <span className="block text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-blue-200 to-amber-200">
            Secure Legal Document
          </span>
          <span className="block mt-2">Analysis & Review</span>
        </h1>
        
        <p className="mt-6 text-lg md:text-xl max-w-2xl mx-auto text-slate-300 font-light mb-12 leading-relaxed">
          Upload your legal documents for instant AI-powered insights, risk assessment, and comprehensive review tailored for modern law practices.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <label 
            htmlFor="file-upload" 
            className={`group relative cursor-pointer flex items-center justify-center gap-3 bg-blue-600 hover:bg-blue-500 text-white px-8 py-4 rounded-full font-semibold transition-all duration-300 ease-in-out shadow-[0_0_20px_rgba(37,99,235,0.4)] hover:shadow-[0_0_30px_rgba(37,99,235,0.6)] border border-blue-400/20 ${isUploading ? 'opacity-70 pointer-events-none' : 'hover:-translate-y-1'}`}
          >
            {isUploading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <Upload className="w-5 h-5 group-hover:animate-bounce" />
            )}
            <span>{isUploading ? 'Processing...' : 'Upload Document'}</span>
            <input 
              id="file-upload" 
              name="file-upload" 
              type="file" 
              accept=".pdf"
              className="sr-only" 
              onChange={handleFileUpload}
              disabled={isUploading}
            />
          </label>
          <button className="px-8 py-4 rounded-full font-semibold text-blue-100 bg-white/5 hover:bg-white/10 backdrop-blur-md transition-all duration-300 border border-white/10 hover:border-white/20">
            View Sample Report
          </button>
        </div>
      </div>
    </section>
  );
}
