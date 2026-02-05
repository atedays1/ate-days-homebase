#!/usr/bin/env python3
"""
Sync processed document chunks to Supabase for the RAG pipeline.

This script reads the chunked JSON files from /processed_docs and 
uploads them to the Supabase database with embeddings.

Usage:
    python sync_to_supabase.py              # Sync all processed docs
    python sync_to_supabase.py --folder X   # Sync specific document folder
"""

import os
import sys
import json
import argparse
from pathlib import Path
from typing import Optional
from dotenv import load_dotenv

# Add parent directory to path for imports
sys.path.insert(0, str(Path(__file__).parent.parent))

try:
    from openai import OpenAI
    OPENAI_AVAILABLE = True
except ImportError:
    OPENAI_AVAILABLE = False

try:
    from supabase import create_client, Client
    SUPABASE_AVAILABLE = True
except ImportError:
    SUPABASE_AVAILABLE = False

try:
    from rich.console import Console
    from rich.progress import Progress
    console = Console()
except ImportError:
    console = None


def log(message: str, style: str = ""):
    if console:
        console.print(message, style=style)
    else:
        print(message)


def log_success(msg): log(f"✓ {msg}", "green")
def log_error(msg): log(f"✗ {msg}", "red")
def log_info(msg): log(f"ℹ {msg}", "blue")


class SupabaseSync:
    """Sync document chunks to Supabase with embeddings."""
    
    def __init__(self):
        # Load environment variables from parent .env.local
        env_path = Path(__file__).parent.parent / ".env.local"
        load_dotenv(env_path)
        
        self.supabase_url = os.getenv("NEXT_PUBLIC_SUPABASE_URL")
        self.supabase_key = os.getenv("NEXT_PUBLIC_SUPABASE_ANON_KEY")
        self.openai_key = os.getenv("OPENAI_API_KEY")
        
        if not all([self.supabase_url, self.supabase_key]):
            raise ValueError(
                "Missing Supabase credentials. "
                "Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in .env.local"
            )
        
        if not self.openai_key:
            raise ValueError(
                "Missing OpenAI API key. Set OPENAI_API_KEY in .env.local"
            )
        
        if not SUPABASE_AVAILABLE:
            raise ImportError("Supabase client not installed. Run: pip install supabase")
        
        if not OPENAI_AVAILABLE:
            raise ImportError("OpenAI client not installed. Run: pip install openai")
        
        self.supabase: Client = create_client(self.supabase_url, self.supabase_key)
        self.openai = OpenAI(api_key=self.openai_key)
    
    def generate_embedding(self, text: str) -> list:
        """Generate embedding using OpenAI."""
        response = self.openai.embeddings.create(
            model="text-embedding-3-small",
            input=text
        )
        return response.data[0].embedding
    
    def sync_document(self, chunks_file: Path) -> int:
        """
        Sync a single document's chunks to Supabase.
        
        Returns number of chunks synced.
        """
        with open(chunks_file) as f:
            data = json.load(f)
        
        source_file = data.get("source_file", chunks_file.stem)
        chunks = data.get("chunks", [])
        
        if not chunks:
            log_info(f"No chunks in {chunks_file.name}")
            return 0
        
        # First, create the document record
        doc_result = self.supabase.table("documents").insert({
            "name": source_file,
            "type": "PDF" if source_file.lower().endswith('.pdf') else "DOCX",
            "size": 0,  # We don't have the original size here
        }).execute()
        
        if not doc_result.data:
            log_error(f"Failed to create document record for {source_file}")
            return 0
        
        document_id = doc_result.data[0]["id"]
        synced = 0
        
        for chunk in chunks:
            try:
                # Generate embedding
                embedding = self.generate_embedding(chunk["content"])
                
                # Insert chunk
                self.supabase.table("document_chunks").insert({
                    "document_id": document_id,
                    "content": chunk["content"],
                    "embedding": embedding,
                    "page_number": chunk.get("chunk_index", 0) + 1,
                }).execute()
                
                synced += 1
                
            except Exception as e:
                log_error(f"Failed to sync chunk {chunk.get('chunk_index', '?')}: {e}")
        
        return synced
    
    def sync_all(self, processed_folder: Path) -> tuple:
        """
        Sync all processed documents.
        
        Returns (documents_synced, total_chunks_synced)
        """
        docs_synced = 0
        chunks_synced = 0
        
        for doc_folder in processed_folder.iterdir():
            if not doc_folder.is_dir():
                continue
            
            chunks_file = doc_folder / f"{doc_folder.name}_chunks.json"
            if not chunks_file.exists():
                continue
            
            log_info(f"Syncing: {doc_folder.name}")
            count = self.sync_document(chunks_file)
            
            if count > 0:
                docs_synced += 1
                chunks_synced += count
                log_success(f"Synced {count} chunks from {doc_folder.name}")
        
        return docs_synced, chunks_synced


def main():
    parser = argparse.ArgumentParser(
        description="Sync processed documents to Supabase"
    )
    parser.add_argument(
        "--folder",
        type=str,
        help="Sync only a specific document folder"
    )
    
    args = parser.parse_args()
    
    log_info("Supabase Document Sync")
    log_info("=" * 40)
    
    try:
        syncer = SupabaseSync()
    except (ValueError, ImportError) as e:
        log_error(str(e))
        sys.exit(1)
    
    processed_folder = Path(__file__).parent.parent / "processed_docs"
    
    if args.folder:
        folder = processed_folder / args.folder
        chunks_file = folder / f"{args.folder}_chunks.json"
        
        if not chunks_file.exists():
            log_error(f"Chunks file not found: {chunks_file}")
            sys.exit(1)
        
        count = syncer.sync_document(chunks_file)
        log_success(f"Synced {count} chunks")
    else:
        docs, chunks = syncer.sync_all(processed_folder)
        log_success(f"Synced {docs} document(s), {chunks} total chunks")


if __name__ == "__main__":
    main()
