"""
Configuration module for the document ingestion engine.
"""

import os
from pathlib import Path
from dataclasses import dataclass, field
from typing import List

# Get the project root (parent of scripts folder)
PROJECT_ROOT = Path(__file__).parent.parent.absolute()


@dataclass
class IngestionConfig:
    """Configuration for document ingestion."""
    
    # Folder paths
    raw_docs_folder: Path = field(default_factory=lambda: PROJECT_ROOT / "raw_docs")
    processed_docs_folder: Path = field(default_factory=lambda: PROJECT_ROOT / "processed_docs")
    
    # Supported file extensions
    supported_extensions: List[str] = field(default_factory=lambda: [".pdf", ".docx", ".doc"])
    
    # Chunking settings
    chunk_size: int = 1000  # Target chunk size in characters
    chunk_overlap: int = 150  # Overlap between chunks
    min_chunk_size: int = 100  # Minimum chunk size to keep
    
    # Preserve semantic boundaries
    preserve_headings: bool = True  # Keep headings with their content
    preserve_tables: bool = True  # Keep tables intact
    preserve_lists: bool = True  # Keep list items together
    
    # Metadata settings
    include_filename: bool = True
    include_date_created: bool = True
    include_date_processed: bool = True
    
    # Watcher settings
    watch_interval: float = 1.0  # Seconds between folder checks
    process_existing: bool = True  # Process existing files on startup
    
    def __post_init__(self):
        """Ensure folders exist."""
        self.raw_docs_folder.mkdir(parents=True, exist_ok=True)
        self.processed_docs_folder.mkdir(parents=True, exist_ok=True)
    
    def is_supported_file(self, filepath: Path) -> bool:
        """Check if a file is supported for processing."""
        return filepath.suffix.lower() in self.supported_extensions


# Default configuration instance
default_config = IngestionConfig()
