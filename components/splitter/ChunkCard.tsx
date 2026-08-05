"use client";

import { ChunkResult } from "@/lib/types";
import { useState, useCallback, memo } from "react";

interface ChunkCardProps {
  chunk: ChunkResult;
}

function ChunkCard({ chunk }: ChunkCardProps) {
  const [copied, setCopied] = useState(false);

  const copyToClipboard = useCallback(() => {
    navigator.clipboard.writeText(chunk.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [chunk.content]);

  return (
    <div className="bg-card border border-border rounded-lg p-4 hover:shadow-md transition-smooth">
      {/* Header */}
      <div className="flex justify-between items-start mb-3">
        <div className="flex items-center gap-2">
          <span className="inline-block px-2 py-1 bg-accent/10 text-accent text-xs font-medium rounded">
            Chunk #{chunk.index + 1}
          </span>
          <span className="text-xs text-muted-foreground">
            {chunk.metadata.length} Characters
          </span>
        </div>
        <button
          onClick={copyToClipboard}
          className="text-xs px-2 py-1 bg-subtle hover:bg-secondary-background rounded transition-smooth"
          title="Copy"
        >
          {copied ? "✓ Copied" : "Copy"}
        </button>
      </div>

      {/* Content */}
      <div className="mb-3">
        <p className="text-sm text-card-foreground whitespace-pre-wrap break-words font-mono leading-relaxed">
          {chunk.content}
        </p>
      </div>

      {/* Metadata */}
      <div className="border-t border-border pt-3">
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div>
            <span className="text-muted-foreground">Start:</span>{" "}
            <span className="text-surface-foreground font-mono">
              {chunk.metadata.startIndex}
            </span>
          </div>
          <div>
            <span className="text-muted-foreground">End:</span>{" "}
            <span className="text-surface-foreground font-mono">
              {chunk.metadata.endIndex}
            </span>
          </div>
          <div>
            <span className="text-muted-foreground">Chunk Size:</span>{" "}
            <span className="text-surface-foreground font-mono">
              {chunk.metadata.chunkSize}
            </span>
          </div>
          <div>
            <span className="text-muted-foreground">Overlap:</span>{" "}
            <span className="text-surface-foreground font-mono">
              {chunk.metadata.chunkOverlap}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default memo(ChunkCard);
