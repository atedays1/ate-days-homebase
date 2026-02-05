#!/usr/bin/env python3
"""
Document Ingestion Engine

Watches the /raw_docs folder for new PDF and DOCX files,
converts them to Markdown, and outputs chunked versions to /processed_docs.

Usage:
    python ingest.py              # Watch mode (continuous)
    python ingest.py --once       # Process existing files and exit
    python ingest.py --file path  # Process a single file
"""

import os
import sys
import json
import time
import argparse
import hashlib
from pathlib import Path
from datetime import datetime
from typing import Optional, List

try:
    from watchdog.observers import Observer
    from watchdog.events import FileSystemEventHandler, FileCreatedEvent, FileModifiedEvent
    WATCHDOG_AVAILABLE = True
except ImportError:
    WATCHDOG_AVAILABLE = False

try:
    from rich.console import Console
    from rich.progress import Progress, SpinnerColumn, TextColumn
    from rich.panel import Panel
    from rich.table import Table
    RICH_AVAILABLE = True
except ImportError:
    RICH_AVAILABLE = False

from config import IngestionConfig, default_config
from converter import get_converter, DocumentMetadata
from chunker import SemanticChunker, DocumentChunk


# Console output
console = Console() if RICH_AVAILABLE else None


def log(message: str, style: str = ""):
    """Log a message to console."""
    if RICH_AVAILABLE and console:
        console.print(message, style=style)
    else:
        print(message)


def log_success(message: str):
    log(f"✓ {message}", "green")


def log_error(message: str):
    log(f"✗ {message}", "red")


def log_info(message: str):
    log(f"ℹ {message}", "blue")


def log_warning(message: str):
    log(f"⚠ {message}", "yellow")


class ProcessedTracker:
    """Track which files have been processed to avoid duplicates."""
    
    def __init__(self, tracker_file: Path):
        self.tracker_file = tracker_file
        self.processed: dict = {}
        self._load()
    
    def _load(self):
        """Load processed files from tracker."""
        if self.tracker_file.exists():
            try:
                self.processed = json.loads(self.tracker_file.read_text())
            except Exception:
                self.processed = {}
    
    def _save(self):
        """Save processed files to tracker."""
        self.tracker_file.write_text(json.dumps(self.processed, indent=2))
    
    def get_file_hash(self, filepath: Path) -> str:
        """Get hash of file for change detection."""
        hasher = hashlib.md5()
        with open(filepath, 'rb') as f:
            for chunk in iter(lambda: f.read(65536), b''):
                hasher.update(chunk)
        return hasher.hexdigest()
    
    def is_processed(self, filepath: Path) -> bool:
        """Check if file has already been processed."""
        str_path = str(filepath.absolute())
        if str_path not in self.processed:
            return False
        
        # Check if file has changed
        current_hash = self.get_file_hash(filepath)
        return self.processed[str_path].get("hash") == current_hash
    
    def mark_processed(self, filepath: Path, output_path: Path):
        """Mark file as processed."""
        str_path = str(filepath.absolute())
        self.processed[str_path] = {
            "hash": self.get_file_hash(filepath),
            "processed_at": datetime.now().isoformat(),
            "output": str(output_path.absolute()),
        }
        self._save()


class IngestionEngine:
    """
    Main ingestion engine that processes documents.
    """
    
    def __init__(self, config: Optional[IngestionConfig] = None):
        self.config = config or default_config
        self.converter = get_converter()
        self.chunker = SemanticChunker(
            chunk_size=self.config.chunk_size,
            chunk_overlap=self.config.chunk_overlap,
            min_chunk_size=self.config.min_chunk_size,
            preserve_headings=self.config.preserve_headings,
            preserve_tables=self.config.preserve_tables,
            preserve_lists=self.config.preserve_lists,
        )
        self.tracker = ProcessedTracker(
            self.config.processed_docs_folder / ".processed_tracker.json"
        )
    
    def process_file(self, filepath: Path, force: bool = False) -> Optional[Path]:
        """
        Process a single file.
        
        Args:
            filepath: Path to the document
            force: Process even if already processed
            
        Returns:
            Path to the output file, or None if skipped/failed
        """
        filepath = Path(filepath)
        
        # Validate file
        if not filepath.exists():
            log_error(f"File not found: {filepath}")
            return None
        
        if not self.config.is_supported_file(filepath):
            log_warning(f"Unsupported file type: {filepath.suffix}")
            return None
        
        # Check if already processed
        if not force and self.tracker.is_processed(filepath):
            log_info(f"Already processed (unchanged): {filepath.name}")
            return None
        
        log_info(f"Processing: {filepath.name}")
        
        try:
            # Convert to Markdown
            markdown_content, metadata = self.converter.convert_file(filepath)
            
            if not markdown_content.strip():
                log_warning(f"No content extracted from: {filepath.name}")
                return None
            
            # Chunk the content
            chunks = self.chunker.chunk_document(
                markdown_content,
                metadata=metadata.to_dict()
            )
            
            # Generate output
            output_path = self._save_output(filepath, markdown_content, chunks, metadata)
            
            # Mark as processed
            self.tracker.mark_processed(filepath, output_path)
            
            log_success(
                f"Processed: {filepath.name} → {output_path.name} "
                f"({len(chunks)} chunks)"
            )
            
            return output_path
            
        except Exception as e:
            log_error(f"Failed to process {filepath.name}: {str(e)}")
            import traceback
            traceback.print_exc()
            return None
    
    def _save_output(
        self,
        source_path: Path,
        markdown_content: str,
        chunks: List[DocumentChunk],
        metadata: DocumentMetadata
    ) -> Path:
        """Save processed output files."""
        # Create output filename (preserving original name)
        base_name = source_path.stem
        
        # Create output directory for this document
        output_dir = self.config.processed_docs_folder / base_name
        output_dir.mkdir(parents=True, exist_ok=True)
        
        # Save full Markdown
        markdown_path = output_dir / f"{base_name}.md"
        
        # Add metadata header to Markdown
        header = f"""---
filename: {metadata.filename}
date_created: {metadata.date_created or 'unknown'}
date_processed: {metadata.date_processed}
title: {metadata.title or 'untitled'}
page_count: {metadata.page_count or 'unknown'}
has_tables: {metadata.has_tables}
---

"""
        markdown_path.write_text(header + markdown_content, encoding='utf-8')
        
        # Save metadata as JSON
        metadata_path = output_dir / f"{base_name}_metadata.json"
        metadata_path.write_text(metadata.to_json(), encoding='utf-8')
        
        # Save chunks as JSON (for RAG pipeline)
        chunks_path = output_dir / f"{base_name}_chunks.json"
        chunks_data = {
            "source_file": metadata.filename,
            "total_chunks": len(chunks),
            "chunk_size": self.config.chunk_size,
            "chunk_overlap": self.config.chunk_overlap,
            "chunks": [chunk.to_dict() for chunk in chunks],
        }
        chunks_path.write_text(json.dumps(chunks_data, indent=2), encoding='utf-8')
        
        return output_dir
    
    def process_folder(self, folder: Optional[Path] = None) -> int:
        """
        Process all supported files in a folder.
        
        Returns:
            Number of files processed
        """
        folder = folder or self.config.raw_docs_folder
        processed_count = 0
        
        log_info(f"Scanning folder: {folder}")
        
        for filepath in folder.iterdir():
            if filepath.is_file() and self.config.is_supported_file(filepath):
                result = self.process_file(filepath)
                if result:
                    processed_count += 1
        
        return processed_count


class FolderWatcher(FileSystemEventHandler):
    """Watch folder for new files and process them."""
    
    def __init__(self, engine: IngestionEngine):
        self.engine = engine
        self._debounce: dict = {}  # Prevent duplicate events
    
    def on_created(self, event):
        """Handle new file creation."""
        if event.is_directory:
            return
        
        filepath = Path(event.src_path)
        if self.engine.config.is_supported_file(filepath):
            # Debounce - wait for file to be fully written
            self._debounce[str(filepath)] = time.time()
            time.sleep(1)  # Wait 1 second
            
            # Check if this is the latest event for this file
            if self._debounce.get(str(filepath), 0) <= time.time() - 0.9:
                self.engine.process_file(filepath)
    
    def on_modified(self, event):
        """Handle file modification."""
        if event.is_directory:
            return
        
        filepath = Path(event.src_path)
        if self.engine.config.is_supported_file(filepath):
            self._debounce[str(filepath)] = time.time()
            time.sleep(1)
            
            if self._debounce.get(str(filepath), 0) <= time.time() - 0.9:
                self.engine.process_file(filepath, force=True)


def watch_folder(engine: IngestionEngine):
    """Start watching the raw_docs folder."""
    if not WATCHDOG_AVAILABLE:
        log_error("Watchdog not installed. Run: pip install watchdog")
        log_info("Running in one-time mode instead...")
        engine.process_folder()
        return
    
    # Process existing files first
    if engine.config.process_existing:
        log_info("Processing existing files...")
        count = engine.process_folder()
        log_info(f"Processed {count} existing file(s)")
    
    # Start watching
    event_handler = FolderWatcher(engine)
    observer = Observer()
    observer.schedule(
        event_handler,
        str(engine.config.raw_docs_folder),
        recursive=False
    )
    observer.start()
    
    log_success(f"Watching folder: {engine.config.raw_docs_folder}")
    log_info("Press Ctrl+C to stop")
    
    try:
        while True:
            time.sleep(engine.config.watch_interval)
    except KeyboardInterrupt:
        log_info("Stopping watcher...")
        observer.stop()
    
    observer.join()


def print_banner():
    """Print startup banner."""
    if RICH_AVAILABLE and console:
        console.print(Panel.fit(
            "[bold blue]Ate Days Document Ingestion Engine[/bold blue]\n"
            "PDF & DOCX → Markdown → Chunked for RAG",
            border_style="blue"
        ))
    else:
        print("=" * 50)
        print("Ate Days Document Ingestion Engine")
        print("PDF & DOCX → Markdown → Chunked for RAG")
        print("=" * 50)


def main():
    """Main entry point."""
    parser = argparse.ArgumentParser(
        description="Document Ingestion Engine for Ate Days"
    )
    parser.add_argument(
        "--once",
        action="store_true",
        help="Process existing files and exit (don't watch)"
    )
    parser.add_argument(
        "--file",
        type=str,
        help="Process a single file"
    )
    parser.add_argument(
        "--force",
        action="store_true",
        help="Force reprocessing of already processed files"
    )
    parser.add_argument(
        "--chunk-size",
        type=int,
        default=1000,
        help="Target chunk size in characters (default: 1000)"
    )
    parser.add_argument(
        "--chunk-overlap",
        type=int,
        default=150,
        help="Overlap between chunks (default: 150)"
    )
    
    args = parser.parse_args()
    
    print_banner()
    
    # Create config with any overrides
    config = IngestionConfig(
        chunk_size=args.chunk_size,
        chunk_overlap=args.chunk_overlap,
    )
    
    # Create engine
    engine = IngestionEngine(config)
    
    log_info(f"Raw docs folder: {config.raw_docs_folder}")
    log_info(f"Output folder: {config.processed_docs_folder}")
    log_info(f"Chunk size: {config.chunk_size}, overlap: {config.chunk_overlap}")
    print()
    
    if args.file:
        # Process single file
        filepath = Path(args.file)
        result = engine.process_file(filepath, force=args.force)
        if result:
            log_success(f"Output saved to: {result}")
        sys.exit(0 if result else 1)
    
    elif args.once:
        # Process existing files and exit
        count = engine.process_folder()
        log_success(f"Processed {count} file(s)")
        sys.exit(0)
    
    else:
        # Watch mode
        watch_folder(engine)


if __name__ == "__main__":
    main()
