import {
  CharacterTextSplitter,
  RecursiveCharacterTextSplitter,
  MarkdownTextSplitter,
  LatexTextSplitter,
} from "@langchain/textsplitters";
import { OpenAIEmbeddings } from "@langchain/openai";
import { getEncoding } from "@langchain/core/utils/tiktoken";
import type {
  SplitterConfig,
  ChunkResult,
  SplitResponse,
  SourceMetadata,
} from "./types";

/**
 * Calculate cosine similarity between two vectors
 */
function cosineSimilarity(vecA: number[], vecB: number[]): number {
  const dotProduct = vecA.reduce((sum, a, i) => sum + a * vecB[i], 0);
  const magnitudeA = Math.sqrt(vecA.reduce((sum, a) => sum + a * a, 0));
  const magnitudeB = Math.sqrt(vecB.reduce((sum, b) => sum + b * b, 0));
  return dotProduct / (magnitudeA * magnitudeB);
}

async function splitTextByGraphemeTokenCount(
  text: string,
  chunkSize: number,
  chunkOverlap: number,
  encodingName = "cl100k_base"
): Promise<string[]> {
  if (!text) return [];

  const tokenizer = await getEncoding(
    encodingName as Parameters<typeof getEncoding>[0]
  );
  const segmenter = new Intl.Segmenter(undefined, { granularity: "grapheme" });
  const offsets = [0];
  for (const part of segmenter.segment(text)) {
    offsets.push(part.index + part.segment.length);
  }

  const tokenCount = (start: number, end: number) =>
    tokenizer.encode(text.slice(offsets[start], offsets[end])).length;
  const chunks: string[] = [];
  let start = 0;

  while (start < offsets.length - 1) {
    let low = start + 1;
    let high = offsets.length - 1;
    let end = start + 1;

    while (low <= high) {
      const candidate = Math.floor((low + high) / 2);
      if (tokenCount(start, candidate) <= chunkSize) {
        end = candidate;
        low = candidate + 1;
      } else {
        high = candidate - 1;
      }
    }

    chunks.push(text.slice(offsets[start], offsets[end]));
    if (end === offsets.length - 1) break;

    if (chunkOverlap === 0) {
      start = end;
      continue;
    }

    let nextStart = end;
    for (let candidate = end - 1; candidate > start; candidate -= 1) {
      if (tokenCount(candidate, end) > chunkOverlap) break;
      nextStart = candidate;
    }
    start = nextStart > start ? nextStart : start + 1;
  }

  return chunks;
}

/**
 * Keep token-sized chunks on valid UTF-8 boundaries. The upstream token
 * splitter decodes arbitrary token slices, which can split a multibyte
 * character and insert Unicode replacement characters into CJK or emoji text.
 */
export async function splitTextByTokensSafely(
  text: string,
  chunkSize: number,
  chunkOverlap: number,
  encodingName = "cl100k_base"
): Promise<string[]> {
  if (!text) return [];

  // Preserve an intentional replacement character without confusing it with
  // a decoder error. This rare path is slower but operates on graphemes only.
  if (text.includes("�")) {
    return splitTextByGraphemeTokenCount(
      text,
      chunkSize,
      chunkOverlap,
      encodingName
    );
  }

  const tokenizer = await getEncoding(
    encodingName as Parameters<typeof getEncoding>[0]
  );
  const tokenIds = tokenizer.encode(text);
  const chunks: string[] = [];
  let start = 0;

  while (start < tokenIds.length) {
    let end = Math.min(start + chunkSize, tokenIds.length);
    let chunk = tokenizer.decode(tokenIds.slice(start, end));

    // Prefer shrinking to stay within the requested token limit.
    while (end > start + 1 && chunk.includes("�")) {
      end -= 1;
      chunk = tokenizer.decode(tokenIds.slice(start, end));
    }

    // A single grapheme can span more tokens than a very small chunk limit.
    // In that case, preserve the grapheme even if it exceeds the limit.
    while (chunk.includes("�") && end < tokenIds.length) {
      end += 1;
      chunk = tokenizer.decode(tokenIds.slice(start, end));
    }

    chunks.push(chunk);
    if (end === tokenIds.length) break;

    let nextStart = chunkOverlap === 0
      ? end
      : Math.max(start + 1, end - chunkOverlap);
    while (nextStart < end) {
      const overlapPrefix = tokenizer.decode(
        tokenIds.slice(nextStart, Math.min(end, nextStart + 8))
      );
      if (!overlapPrefix.startsWith("�")) break;
      nextStart += 1;
    }
    start = nextStart;
  }

  return chunks;
}

/**
 * Split text using the specified splitter configuration
 */
export async function splitText(
  text: string,
  config: SplitterConfig,
  sourceMetadata?: SourceMetadata
): Promise<SplitResponse> {
  const startTime = Date.now();

  let splitter;
  let chunks: string[] = [];

  try {
    switch (config.splitterType) {
      case "CharacterTextSplitter":
        const charSplitterConfig: any = {
          chunkSize: config.chunkSize,
          chunkOverlap: config.chunkOverlap,
        };
        // Only add separator if explicitly provided
        if (config.separator !== undefined) {
          charSplitterConfig.separator = config.separator;
        }
        splitter = new CharacterTextSplitter(charSplitterConfig);
        chunks = await splitter.splitText(text);
        break;

      case "RecursiveCharacterTextSplitter":
        // Parse separator string into array if provided
        let separators = config.separators || ["\n\n", "\n", " ", ""];
        if (config.separator) {
          // Split by comma and handle escape sequences
          separators = config.separator.split(",").map(s => {
            // Replace literal \n with actual newline, etc.
            return s.replace(/\\n/g, "\n")
                    .replace(/\\t/g, "\t")
                    .replace(/\\r/g, "\r");
          });
        }
        splitter = new RecursiveCharacterTextSplitter({
          chunkSize: config.chunkSize,
          chunkOverlap: config.chunkOverlap,
          separators: separators,
        });
        chunks = await splitter.splitText(text);
        break;

      case "TokenTextSplitter":
        chunks = await splitTextByTokensSafely(
          text,
          config.chunkSize,
          config.chunkOverlap,
          config.encodingName || "cl100k_base"
        );
        break;


      case "MarkdownTextSplitter":
        splitter = new MarkdownTextSplitter({
          chunkSize: config.chunkSize,
          chunkOverlap: config.chunkOverlap,
        });
        chunks = await splitter.splitText(text);
        break;



      case "LatexTextSplitter":
        splitter = new LatexTextSplitter({
          chunkSize: config.chunkSize,
          chunkOverlap: config.chunkOverlap,
        });
        chunks = await splitter.splitText(text);
        break;

      case "CodeSplitter":
        const language = config.language || "python";
        splitter = RecursiveCharacterTextSplitter.fromLanguage(language as any, {
          chunkSize: config.chunkSize,
          chunkOverlap: config.chunkOverlap,
        });
        chunks = await splitter.splitText(text);
        break;

      case "SemanticChunker":
        // Implement semantic chunking using embeddings
        const embeddings = new OpenAIEmbeddings({
          apiKey: process.env.OPENAI_API_KEY,
        });

        // Split text into sentences
        const sentences = text
          .split(/[.!?]+/)
          .map(s => s.trim())
          .filter(s => s.length > 0);

        if (sentences.length === 0) {
          chunks = [text];
          break;
        }

        // Get embeddings for each sentence
        const sentenceEmbeddings = await embeddings.embedDocuments(sentences);

        // Calculate cosine similarity between consecutive sentences
        const similarities: number[] = [];
        for (let i = 0; i < sentenceEmbeddings.length - 1; i++) {
          const sim = cosineSimilarity(sentenceEmbeddings[i], sentenceEmbeddings[i + 1]);
          similarities.push(sim);
        }

        // Determine breakpoints based on breakpointType
        const breakpointType = config.breakpointType || "percentile";
        const breakpoints: number[] = [];

        if (breakpointType === "percentile") {
          // Use 25th percentile as threshold
          const sorted = [...similarities].sort((a, b) => a - b);
          const threshold = sorted[Math.floor(sorted.length * 0.25)];
          similarities.forEach((sim, idx) => {
            if (sim < threshold) breakpoints.push(idx);
          });
        } else if (breakpointType === "standard_deviation") {
          // Use mean - 1 standard deviation
          const mean = similarities.reduce((a, b) => a + b, 0) / similarities.length;
          const std = Math.sqrt(
            similarities.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / similarities.length
          );
          const threshold = mean - std;
          similarities.forEach((sim, idx) => {
            if (sim < threshold) breakpoints.push(idx);
          });
        } else if (breakpointType === "interquartile") {
          // Use Q1 - 1.5 * IQR
          const sorted = [...similarities].sort((a, b) => a - b);
          const q1 = sorted[Math.floor(sorted.length * 0.25)];
          const q3 = sorted[Math.floor(sorted.length * 0.75)];
          const iqr = q3 - q1;
          const threshold = q1 - 1.5 * iqr;
          similarities.forEach((sim, idx) => {
            if (sim < threshold) breakpoints.push(idx);
          });
        } else if (breakpointType === "gradient") {
          // Calculate gradients (differences between consecutive similarities)
          const gradients: number[] = [];
          for (let i = 0; i < similarities.length - 1; i++) {
            gradients.push(Math.abs(similarities[i + 1] - similarities[i]));
          }

          // Use 95th percentile of gradients as threshold for significant changes
          const sortedGradients = [...gradients].sort((a, b) => a - b);
          const threshold = sortedGradients[Math.floor(sortedGradients.length * 0.95)];

          // Mark points where gradient exceeds threshold
          gradients.forEach((grad, idx) => {
            if (grad > threshold) breakpoints.push(idx);
          });
        }

        // Create chunks based on breakpoints
        chunks = [];
        let currentChunk: string[] = [];
        sentences.forEach((sentence, idx) => {
          currentChunk.push(sentence);
          if (breakpoints.includes(idx) || idx === sentences.length - 1) {
            chunks.push(currentChunk.join('. ') + '.');
            currentChunk = [];
          }
        });

        // Filter empty chunks
        chunks = chunks.filter(c => c.trim().length > 0);
        break;

      default:
        throw new Error(`Unknown splitter type: ${config.splitterType}`);
    }

    // Build chunk results with metadata
    const chunkResults: ChunkResult[] = [];
    let previousStartIndex = -1;
    let previousEndIndex = 0;

    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];
      let startIndex = text.indexOf(chunk, Math.max(0, previousStartIndex + 1));

      // If exact match not found (e.g., SemanticChunker modifies text),
      // use the current position as fallback
      if (startIndex === -1) {
        startIndex = Math.min(previousEndIndex, text.length);
      }

      const endIndex = Math.min(startIndex + chunk.length, text.length);

      chunkResults.push({
        index: i,
        content: chunk,
        metadata: {
          startIndex,
          endIndex,
          length: chunk.length,
          chunkSize: config.chunkSize,
          chunkOverlap: config.chunkOverlap,
          source: sourceMetadata, // Include source metadata if provided
        },
      });

      previousStartIndex = startIndex;
      previousEndIndex = endIndex;
    }

    // Calculate statistics
    const chunkSizes = chunkResults.map((c) => c.metadata.length);
    const averageChunkSize =
      chunkSizes.reduce((a, b) => a + b, 0) / chunkSizes.length;
    const minChunkSize = Math.min(...chunkSizes);
    const maxChunkSize = Math.max(...chunkSizes);
    const processingTime = Date.now() - startTime;

    return {
      chunks: chunkResults,
      totalChunks: chunkResults.length,
      splitterType: config.splitterType,
      parameters: config,
      statistics: {
        averageChunkSize: Math.round(averageChunkSize),
        minChunkSize,
        maxChunkSize,
        processingTime,
      },
    };
  } catch (error) {
    throw new Error(
      `Failed to split text: ${error instanceof Error ? error.message : "Unknown error"}`
    );
  }
}

/**
 * Validate splitter configuration
 */
export function validateConfig(config: SplitterConfig): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (config.chunkSize <= 0) {
    errors.push("Chunk size must be greater than 0");
  }

  if (config.chunkOverlap < 0) {
    errors.push("Chunk overlap must be non-negative");
  }

  if (config.chunkOverlap >= config.chunkSize) {
    errors.push("Chunk overlap must be less than chunk size");
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}
