"""
Semantic chunking module for Markdown documents.
Keeps related content together for better RAG performance.
"""

import re
from dataclasses import dataclass, field
from typing import List, Optional
from datetime import datetime


@dataclass
class DocumentChunk:
    """Represents a chunk of document content with metadata."""
    content: str
    chunk_index: int
    metadata: dict = field(default_factory=dict)
    
    # Semantic context
    heading_context: Optional[str] = None  # Parent heading(s)
    chunk_type: str = "text"  # text, table, list, code
    
    def to_dict(self) -> dict:
        """Convert to dictionary for serialization."""
        return {
            "content": self.content,
            "chunk_index": self.chunk_index,
            "metadata": self.metadata,
            "heading_context": self.heading_context,
            "chunk_type": self.chunk_type,
        }


class SemanticChunker:
    """
    Chunks Markdown documents while preserving semantic structure.
    """
    
    def __init__(
        self,
        chunk_size: int = 1000,
        chunk_overlap: int = 150,
        min_chunk_size: int = 100,
        preserve_headings: bool = True,
        preserve_tables: bool = True,
        preserve_lists: bool = True,
    ):
        self.chunk_size = chunk_size
        self.chunk_overlap = chunk_overlap
        self.min_chunk_size = min_chunk_size
        self.preserve_headings = preserve_headings
        self.preserve_tables = preserve_tables
        self.preserve_lists = preserve_lists
        
        # Regex patterns for Markdown elements
        self.heading_pattern = re.compile(r'^(#{1,6})\s+(.+)$', re.MULTILINE)
        self.table_pattern = re.compile(r'(\|[^\n]+\|\n)+', re.MULTILINE)
        self.list_pattern = re.compile(r'^(\s*[-*+]|\s*\d+\.)\s+.+(\n\s+.+)*', re.MULTILINE)
        self.code_block_pattern = re.compile(r'```[\s\S]*?```', re.MULTILINE)
    
    def chunk_document(
        self,
        markdown_content: str,
        metadata: Optional[dict] = None
    ) -> List[DocumentChunk]:
        """
        Chunk a Markdown document while preserving semantic structure.
        
        Args:
            markdown_content: The Markdown text to chunk
            metadata: Optional metadata to attach to all chunks
            
        Returns:
            List of DocumentChunk objects
        """
        if metadata is None:
            metadata = {}
        
        # First, identify and protect special blocks
        protected_blocks = self._extract_protected_blocks(markdown_content)
        
        # Split by sections (headings)
        sections = self._split_by_headings(markdown_content)
        
        chunks = []
        chunk_index = 0
        
        for section in sections:
            section_chunks = self._chunk_section(
                section["content"],
                section["heading"],
                protected_blocks
            )
            
            for content, chunk_type in section_chunks:
                if len(content.strip()) >= self.min_chunk_size:
                    chunk = DocumentChunk(
                        content=content.strip(),
                        chunk_index=chunk_index,
                        metadata=metadata.copy(),
                        heading_context=section["heading"],
                        chunk_type=chunk_type,
                    )
                    chunks.append(chunk)
                    chunk_index += 1
        
        # Apply overlap between chunks if needed
        chunks = self._apply_overlap(chunks)
        
        return chunks
    
    def _extract_protected_blocks(self, content: str) -> dict:
        """Extract blocks that should not be split (tables, code blocks)."""
        protected = {
            "tables": [],
            "code_blocks": [],
        }
        
        if self.preserve_tables:
            for match in self.table_pattern.finditer(content):
                protected["tables"].append({
                    "start": match.start(),
                    "end": match.end(),
                    "content": match.group(0),
                })
        
        for match in self.code_block_pattern.finditer(content):
            protected["code_blocks"].append({
                "start": match.start(),
                "end": match.end(),
                "content": match.group(0),
            })
        
        return protected
    
    def _split_by_headings(self, content: str) -> List[dict]:
        """Split content into sections based on headings."""
        sections = []
        current_heading = None
        current_content = []
        
        lines = content.split('\n')
        
        for line in lines:
            heading_match = self.heading_pattern.match(line)
            
            if heading_match:
                # Save previous section
                if current_content:
                    sections.append({
                        "heading": current_heading,
                        "content": '\n'.join(current_content),
                    })
                
                # Start new section
                current_heading = heading_match.group(2).strip()
                current_content = [line]
            else:
                current_content.append(line)
        
        # Don't forget the last section
        if current_content:
            sections.append({
                "heading": current_heading,
                "content": '\n'.join(current_content),
            })
        
        return sections if sections else [{"heading": None, "content": content}]
    
    def _chunk_section(
        self,
        content: str,
        heading: Optional[str],
        protected_blocks: dict
    ) -> List[tuple]:
        """
        Chunk a section while respecting protected blocks.
        Returns list of (content, chunk_type) tuples.
        """
        chunks = []
        
        # Check if this section contains a table
        if self.preserve_tables and self.table_pattern.search(content):
            # Split around tables
            parts = self._split_around_pattern(content, self.table_pattern)
            for part, is_match in parts:
                if is_match:
                    # Table - keep intact
                    chunks.append((part, "table"))
                else:
                    # Regular text - chunk it
                    text_chunks = self._chunk_text(part)
                    chunks.extend([(c, "text") for c in text_chunks])
        else:
            # No tables, chunk normally
            text_chunks = self._chunk_text(content)
            chunks.extend([(c, "text") for c in text_chunks])
        
        return chunks
    
    def _split_around_pattern(self, content: str, pattern) -> List[tuple]:
        """Split content around pattern matches, returning (text, is_match) tuples."""
        result = []
        last_end = 0
        
        for match in pattern.finditer(content):
            # Text before match
            if match.start() > last_end:
                result.append((content[last_end:match.start()], False))
            # The match itself
            result.append((match.group(0), True))
            last_end = match.end()
        
        # Text after last match
        if last_end < len(content):
            result.append((content[last_end:], False))
        
        return result
    
    def _chunk_text(self, text: str) -> List[str]:
        """Chunk plain text while respecting paragraph boundaries."""
        if len(text) <= self.chunk_size:
            return [text] if text.strip() else []
        
        chunks = []
        paragraphs = text.split('\n\n')
        current_chunk = ""
        
        for para in paragraphs:
            para = para.strip()
            if not para:
                continue
            
            # Check if adding this paragraph exceeds chunk size
            potential_chunk = current_chunk + ("\n\n" if current_chunk else "") + para
            
            if len(potential_chunk) <= self.chunk_size:
                current_chunk = potential_chunk
            else:
                # Save current chunk if it has content
                if current_chunk:
                    chunks.append(current_chunk)
                
                # Handle very long paragraphs
                if len(para) > self.chunk_size:
                    # Split by sentences
                    sentence_chunks = self._split_by_sentences(para)
                    chunks.extend(sentence_chunks[:-1])
                    current_chunk = sentence_chunks[-1] if sentence_chunks else ""
                else:
                    current_chunk = para
        
        # Don't forget the last chunk
        if current_chunk:
            chunks.append(current_chunk)
        
        return chunks
    
    def _split_by_sentences(self, text: str) -> List[str]:
        """Split text by sentences when paragraphs are too long."""
        # Simple sentence splitting (handles common cases)
        sentence_endings = re.compile(r'(?<=[.!?])\s+')
        sentences = sentence_endings.split(text)
        
        chunks = []
        current_chunk = ""
        
        for sentence in sentences:
            potential_chunk = current_chunk + (" " if current_chunk else "") + sentence
            
            if len(potential_chunk) <= self.chunk_size:
                current_chunk = potential_chunk
            else:
                if current_chunk:
                    chunks.append(current_chunk)
                
                # If single sentence is too long, force split
                if len(sentence) > self.chunk_size:
                    words = sentence.split()
                    current_chunk = ""
                    for word in words:
                        if len(current_chunk) + len(word) + 1 <= self.chunk_size:
                            current_chunk += (" " if current_chunk else "") + word
                        else:
                            if current_chunk:
                                chunks.append(current_chunk)
                            current_chunk = word
                else:
                    current_chunk = sentence
        
        if current_chunk:
            chunks.append(current_chunk)
        
        return chunks
    
    def _apply_overlap(self, chunks: List[DocumentChunk]) -> List[DocumentChunk]:
        """Apply overlap between chunks for better context continuity."""
        if self.chunk_overlap <= 0 or len(chunks) <= 1:
            return chunks
        
        for i in range(1, len(chunks)):
            prev_chunk = chunks[i - 1]
            curr_chunk = chunks[i]
            
            # Only apply overlap to text chunks
            if prev_chunk.chunk_type == "text" and curr_chunk.chunk_type == "text":
                # Get overlap from end of previous chunk
                overlap_text = self._get_overlap_text(prev_chunk.content)
                if overlap_text:
                    curr_chunk.content = overlap_text + "\n\n" + curr_chunk.content
        
        return chunks
    
    def _get_overlap_text(self, text: str) -> str:
        """Get the last N characters as overlap, respecting word boundaries."""
        if len(text) <= self.chunk_overlap:
            return ""
        
        # Get approximate overlap
        overlap = text[-self.chunk_overlap:]
        
        # Find first word boundary
        first_space = overlap.find(' ')
        if first_space > 0:
            overlap = overlap[first_space + 1:]
        
        return f"[...] {overlap}" if overlap else ""


def chunk_markdown(
    content: str,
    metadata: Optional[dict] = None,
    chunk_size: int = 1000,
    chunk_overlap: int = 150,
) -> List[DocumentChunk]:
    """
    Convenience function to chunk Markdown content.
    
    Args:
        content: Markdown text to chunk
        metadata: Optional metadata dict
        chunk_size: Target size for each chunk
        chunk_overlap: Overlap between consecutive chunks
        
    Returns:
        List of DocumentChunk objects
    """
    chunker = SemanticChunker(
        chunk_size=chunk_size,
        chunk_overlap=chunk_overlap,
    )
    return chunker.chunk_document(content, metadata)
