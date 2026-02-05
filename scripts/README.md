# Document Ingestion Engine

A Python-based document processing pipeline that converts PDFs and DOCX files to high-quality Markdown, preserving tables and document structure, then chunks them semantically for the RAG pipeline.

## Features

- **High-Quality Conversion**: Uses Docling (IBM) for accurate PDF/DOCX to Markdown conversion
- **Table Preservation**: Maintains table structure in Markdown format
- **Metadata Extraction**: Captures filename, creation date, title, author, and page count
- **Semantic Chunking**: Intelligently splits content while keeping related context together
- **Folder Watching**: Automatically processes new files dropped into `/raw_docs`
- **Duplicate Detection**: Tracks processed files to avoid reprocessing unchanged documents

## Installation

### 1. Set up Python environment

```bash
# Navigate to scripts folder
cd scripts

# Create virtual environment (recommended)
python -m venv venv

# Activate virtual environment
# On macOS/Linux:
source venv/bin/activate
# On Windows:
# venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt
```

### 2. Install Docling (for best results)

Docling requires some system dependencies for optimal performance:

```bash
# macOS
brew install poppler tesseract

# Ubuntu/Debian
sudo apt-get install poppler-utils tesseract-ocr

# Then install Docling
pip install docling
```

> **Note**: The engine includes a fallback converter if Docling isn't available, but Docling provides significantly better table handling and formatting.

## Usage

### Watch Mode (Continuous)

Start the engine to continuously watch for new files:

```bash
python ingest.py
```

The engine will:
1. Process any existing files in `/raw_docs`
2. Watch for new files and process them automatically
3. Skip files that have already been processed (unless they've changed)

Press `Ctrl+C` to stop.

### One-Time Processing

Process existing files and exit:

```bash
python ingest.py --once
```

### Process Single File

Process a specific file:

```bash
python ingest.py --file /path/to/document.pdf
```

### Force Reprocessing

Reprocess files even if they've already been processed:

```bash
python ingest.py --once --force
```

### Custom Chunk Size

Adjust chunking parameters:

```bash
python ingest.py --chunk-size 1500 --chunk-overlap 200
```

## Folder Structure

```
ate-days-homebase/
├── raw_docs/              # Drop PDFs and DOCX files here
├── processed_docs/        # Processed output
│   └── document_name/
│       ├── document_name.md           # Full Markdown content
│       ├── document_name_metadata.json # Document metadata
│       └── document_name_chunks.json   # Chunked content for RAG
└── scripts/
    ├── ingest.py          # Main entry point
    ├── converter.py       # Document conversion logic
    ├── chunker.py         # Semantic chunking
    ├── config.py          # Configuration
    └── requirements.txt   # Python dependencies
```

## Output Format

### Markdown File (`document.md`)

The full document converted to Markdown with a YAML frontmatter header:

```markdown
---
filename: Annual_Report_2025.pdf
date_created: 2025-01-15T10:30:00
date_processed: 2025-02-04T14:22:33
title: Annual Report
page_count: 45
has_tables: true
---

# Annual Report 2025

Content here...
```

### Chunks File (`document_chunks.json`)

Ready for the RAG pipeline:

```json
{
  "source_file": "Annual_Report_2025.pdf",
  "total_chunks": 23,
  "chunk_size": 1000,
  "chunk_overlap": 150,
  "chunks": [
    {
      "content": "# Annual Report 2025\n\nOur company achieved...",
      "chunk_index": 0,
      "metadata": {
        "filename": "Annual_Report_2025.pdf",
        "date_created": "2025-01-15T10:30:00"
      },
      "heading_context": "Annual Report 2025",
      "chunk_type": "text"
    },
    {
      "content": "| Quarter | Revenue | Growth |\n|---|---|---|\n| Q1 | $1.2M | 15% |",
      "chunk_index": 1,
      "heading_context": "Financial Overview",
      "chunk_type": "table"
    }
  ]
}
```

## Semantic Chunking

The chunker preserves document structure:

- **Headings**: Keeps heading context with related content
- **Tables**: Never splits tables mid-row
- **Lists**: Keeps list items together
- **Paragraphs**: Respects paragraph boundaries
- **Overlap**: Adds context overlap between chunks for better retrieval

## Configuration

Edit `config.py` to customize:

```python
@dataclass
class IngestionConfig:
    # Folders
    raw_docs_folder: Path = PROJECT_ROOT / "raw_docs"
    processed_docs_folder: Path = PROJECT_ROOT / "processed_docs"
    
    # Supported files
    supported_extensions: List[str] = [".pdf", ".docx", ".doc"]
    
    # Chunking
    chunk_size: int = 1000        # Target characters per chunk
    chunk_overlap: int = 150      # Overlap between chunks
    min_chunk_size: int = 100     # Minimum chunk size
    
    # Semantic preservation
    preserve_headings: bool = True
    preserve_tables: bool = True
    preserve_lists: bool = True
```

## Integration with RAG Pipeline

The generated `_chunks.json` files can be directly imported into your Supabase vector database. Each chunk includes:

- `content`: The text to embed
- `chunk_index`: Order in the document
- `metadata`: Source document info
- `heading_context`: Parent section heading
- `chunk_type`: "text", "table", or "list"

Example integration:

```python
import json
from your_embedding_module import generate_embedding
from your_supabase_client import supabase

# Load chunks
with open('processed_docs/report/report_chunks.json') as f:
    data = json.load(f)

# Insert into Supabase
for chunk in data['chunks']:
    embedding = generate_embedding(chunk['content'])
    
    supabase.table('document_chunks').insert({
        'content': chunk['content'],
        'embedding': embedding,
        'metadata': chunk['metadata'],
        'heading_context': chunk['heading_context'],
    }).execute()
```

## Troubleshooting

### "Docling not installed"

Install Docling for best results:
```bash
pip install docling
```

The engine will use a fallback converter but table handling may be less accurate.

### "No content extracted"

- Ensure the PDF is not image-only (scanned document)
- For scanned PDFs, enable OCR in Docling options
- Check that the file is not corrupted

### Files not being detected

- Ensure files have supported extensions (.pdf, .docx, .doc)
- Check that files are fully copied (not still being written)
- Look for errors in the console output
