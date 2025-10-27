import {
  CharacterTextSplitter,
  RecursiveCharacterTextSplitter,
  TokenTextSplitter,
  MarkdownTextSplitter,
  LatexTextSplitter,
} from "@langchain/textsplitters";
import { OpenAIEmbeddings } from "@langchain/openai";
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
        splitter = new TokenTextSplitter({
          chunkSize: config.chunkSize,
          chunkOverlap: config.chunkOverlap,
          encodingName: (config.encodingName as any) || "cl100k_base",
        });
        chunks = await splitter.splitText(text);
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
    let currentIndex = 0;

    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];
      let startIndex = text.indexOf(chunk, currentIndex);

      // If exact match not found (e.g., SemanticChunker modifies text),
      // use the current position as fallback
      if (startIndex === -1) {
        startIndex = currentIndex;
      }

      const endIndex = startIndex + chunk.length;

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

      currentIndex = endIndex;
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
