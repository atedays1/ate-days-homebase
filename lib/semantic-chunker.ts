/**
 * Semantic Chunking Module
 * 
 * Intelligently chunks Markdown/text content while preserving:
 * - Heading context
 * - Table integrity
 * - List groupings
 * - Paragraph boundaries
 */

export interface DocumentChunk {
  content: string
  chunkIndex: number
  headingContext: string | null
  chunkType: "text" | "table" | "list" | "code"
  metadata?: Record<string, unknown>
}

export interface ChunkingOptions {
  chunkSize?: number
  chunkOverlap?: number
  minChunkSize?: number
  preserveHeadings?: boolean
  preserveTables?: boolean
  preserveLists?: boolean
}

const DEFAULT_OPTIONS: Required<ChunkingOptions> = {
  chunkSize: 1000,
  chunkOverlap: 150,
  minChunkSize: 100,
  preserveHeadings: true,
  preserveTables: true,
  preserveLists: true,
}

// Regex patterns for content detection
const HEADING_PATTERN = /^(#{1,6})\s+(.+)$/gm
const TABLE_PATTERN = /(\|[^\n]+\|\n)+/g
const LIST_PATTERN = /^(\s*[-*+]|\s*\d+\.)\s+.+(\n\s+.+)*/gm
const CODE_BLOCK_PATTERN = /```[\s\S]*?```/g

interface Section {
  heading: string | null
  content: string
}

/**
 * Semantic chunker that respects document structure
 */
export class SemanticChunker {
  private options: Required<ChunkingOptions>

  constructor(options: ChunkingOptions = {}) {
    this.options = { ...DEFAULT_OPTIONS, ...options }
  }

  /**
   * Chunk a document while preserving semantic structure
   */
  chunkDocument(content: string, metadata?: Record<string, unknown>): DocumentChunk[] {
    if (!content || content.trim().length === 0) {
      return []
    }

    // Split by sections (headings)
    const sections = this.splitByHeadings(content)
    
    const chunks: DocumentChunk[] = []
    let chunkIndex = 0

    for (const section of sections) {
      const sectionChunks = this.chunkSection(section.content, section.heading)
      
      for (const { content: chunkContent, chunkType } of sectionChunks) {
        if (chunkContent.trim().length >= this.options.minChunkSize) {
          chunks.push({
            content: chunkContent.trim(),
            chunkIndex,
            headingContext: section.heading,
            chunkType,
            metadata,
          })
          chunkIndex++
        }
      }
    }

    // Apply overlap between text chunks
    return this.applyOverlap(chunks)
  }

  /**
   * Split content into sections based on headings
   */
  private splitByHeadings(content: string): Section[] {
    const sections: Section[] = []
    let currentHeading: string | null = null
    let currentContent: string[] = []

    const lines = content.split('\n')
    const headingRegex = /^(#{1,6})\s+(.+)$/

    for (const line of lines) {
      const match = line.match(headingRegex)

      if (match) {
        // Save previous section
        if (currentContent.length > 0) {
          sections.push({
            heading: currentHeading,
            content: currentContent.join('\n'),
          })
        }

        // Start new section
        currentHeading = match[2].trim()
        currentContent = [line]
      } else {
        currentContent.push(line)
      }
    }

    // Don't forget the last section
    if (currentContent.length > 0) {
      sections.push({
        heading: currentHeading,
        content: currentContent.join('\n'),
      })
    }

    return sections.length > 0 
      ? sections 
      : [{ heading: null, content }]
  }

  /**
   * Chunk a section while respecting tables and lists
   */
  private chunkSection(
    content: string, 
    heading: string | null
  ): Array<{ content: string; chunkType: DocumentChunk["chunkType"] }> {
    const chunks: Array<{ content: string; chunkType: DocumentChunk["chunkType"] }> = []

    // Check for tables
    if (this.options.preserveTables && content.includes('|')) {
      const parts = this.splitAroundPattern(content, TABLE_PATTERN)
      
      for (const { text, isMatch } of parts) {
        if (isMatch) {
          // Table - keep intact
          chunks.push({ content: text, chunkType: "table" })
        } else if (text.trim()) {
          // Regular text - chunk it
          const textChunks = this.chunkText(text)
          chunks.push(...textChunks.map(c => ({ content: c, chunkType: "text" as const })))
        }
      }
    } else {
      // No tables, chunk normally
      const textChunks = this.chunkText(content)
      chunks.push(...textChunks.map(c => ({ content: c, chunkType: "text" as const })))
    }

    return chunks
  }

  /**
   * Split content around pattern matches
   */
  private splitAroundPattern(
    content: string, 
    pattern: RegExp
  ): Array<{ text: string; isMatch: boolean }> {
    const result: Array<{ text: string; isMatch: boolean }> = []
    let lastEnd = 0

    // Reset regex state
    const regex = new RegExp(pattern.source, pattern.flags)
    let match: RegExpExecArray | null

    while ((match = regex.exec(content)) !== null) {
      // Text before match
      if (match.index > lastEnd) {
        result.push({ text: content.slice(lastEnd, match.index), isMatch: false })
      }
      // The match itself
      result.push({ text: match[0], isMatch: true })
      lastEnd = match.index + match[0].length
    }

    // Text after last match
    if (lastEnd < content.length) {
      result.push({ text: content.slice(lastEnd), isMatch: false })
    }

    return result
  }

  /**
   * Chunk plain text while respecting paragraph boundaries
   */
  private chunkText(text: string): string[] {
    if (text.length <= this.options.chunkSize) {
      return text.trim() ? [text.trim()] : []
    }

    const chunks: string[] = []
    const paragraphs = text.split(/\n\n+/)
    let currentChunk = ""

    for (const para of paragraphs) {
      const trimmedPara = para.trim()
      if (!trimmedPara) continue

      const potentialChunk = currentChunk 
        ? currentChunk + "\n\n" + trimmedPara 
        : trimmedPara

      if (potentialChunk.length <= this.options.chunkSize) {
        currentChunk = potentialChunk
      } else {
        // Save current chunk if it has content
        if (currentChunk) {
          chunks.push(currentChunk)
        }

        // Handle very long paragraphs
        if (trimmedPara.length > this.options.chunkSize) {
          const sentenceChunks = this.splitBySentences(trimmedPara)
          chunks.push(...sentenceChunks.slice(0, -1))
          currentChunk = sentenceChunks[sentenceChunks.length - 1] || ""
        } else {
          currentChunk = trimmedPara
        }
      }
    }

    // Don't forget the last chunk
    if (currentChunk) {
      chunks.push(currentChunk)
    }

    return chunks
  }

  /**
   * Split text by sentences when paragraphs are too long
   */
  private splitBySentences(text: string): string[] {
    const sentences = text.split(/(?<=[.!?])\s+/)
    const chunks: string[] = []
    let currentChunk = ""

    for (const sentence of sentences) {
      const potentialChunk = currentChunk 
        ? currentChunk + " " + sentence 
        : sentence

      if (potentialChunk.length <= this.options.chunkSize) {
        currentChunk = potentialChunk
      } else {
        if (currentChunk) {
          chunks.push(currentChunk)
        }

        // If single sentence is too long, force split by words
        if (sentence.length > this.options.chunkSize) {
          const words = sentence.split(/\s+/)
          currentChunk = ""
          
          for (const word of words) {
            if (currentChunk.length + word.length + 1 <= this.options.chunkSize) {
              currentChunk += (currentChunk ? " " : "") + word
            } else {
              if (currentChunk) chunks.push(currentChunk)
              currentChunk = word
            }
          }
        } else {
          currentChunk = sentence
        }
      }
    }

    if (currentChunk) {
      chunks.push(currentChunk)
    }

    return chunks
  }

  /**
   * Apply overlap between consecutive text chunks
   */
  private applyOverlap(chunks: DocumentChunk[]): DocumentChunk[] {
    if (this.options.chunkOverlap <= 0 || chunks.length <= 1) {
      return chunks
    }

    for (let i = 1; i < chunks.length; i++) {
      const prevChunk = chunks[i - 1]
      const currChunk = chunks[i]

      // Only apply overlap between text chunks
      if (prevChunk.chunkType === "text" && currChunk.chunkType === "text") {
        const overlapText = this.getOverlapText(prevChunk.content)
        if (overlapText) {
          currChunk.content = overlapText + "\n\n" + currChunk.content
        }
      }
    }

    return chunks
  }

  /**
   * Get overlap text from the end of a chunk
   */
  private getOverlapText(text: string): string {
    if (text.length <= this.options.chunkOverlap) {
      return ""
    }

    let overlap = text.slice(-this.options.chunkOverlap)
    
    // Find first word boundary
    const firstSpace = overlap.indexOf(' ')
    if (firstSpace > 0) {
      overlap = overlap.slice(firstSpace + 1)
    }

    return overlap ? `[...] ${overlap}` : ""
  }
}

/**
 * Convenience function to chunk content with default settings
 */
export function chunkDocumentSemantically(
  content: string,
  options?: ChunkingOptions,
  metadata?: Record<string, unknown>
): DocumentChunk[] {
  const chunker = new SemanticChunker(options)
  return chunker.chunkDocument(content, metadata)
}

/**
 * Simple chunking function that returns just the text chunks
 * (for backward compatibility with existing code)
 */
export function chunkTextSemantically(
  text: string,
  chunkSize: number = 1000,
  chunkOverlap: number = 150
): string[] {
  const chunker = new SemanticChunker({ chunkSize, chunkOverlap })
  const chunks = chunker.chunkDocument(text)
  return chunks.map(c => c.content)
}
