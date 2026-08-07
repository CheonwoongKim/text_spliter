"use client";

import { SplitResponse } from "@/lib/types";
import ChunkCard from "./ChunkCard";
import { memo } from "react";

interface CardViewProps {
  result: SplitResponse;
}

function CardView({ result }: CardViewProps) {
  return (
    <div className="h-full flex flex-col">
      <div className="mb-4 border-b border-border-subtle pb-4">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="text-left">
            <p className="text-2xs text-muted-foreground">Total Chunks</p>
            <p className="mt-1 text-xs font-medium text-surface-foreground">
              {result.totalChunks}
            </p>
          </div>
          <div className="text-left">
            <p className="text-2xs text-muted-foreground">Average Size</p>
            <p className="mt-1 text-xs font-medium text-surface-foreground">
              {result.statistics.averageChunkSize}
            </p>
          </div>
          <div className="text-left">
            <p className="text-2xs text-muted-foreground">Min / Max</p>
            <p className="mt-1 text-xs font-medium text-surface-foreground">
              {result.statistics.minChunkSize} / {result.statistics.maxChunkSize}
            </p>
          </div>
          <div className="text-left">
            <p className="text-2xs text-muted-foreground">Processing Time</p>
            <p className="mt-1 text-xs font-medium text-surface-foreground">
              {result.statistics.processingTime}ms
            </p>
          </div>
        </div>
      </div>

      <div className="scrollbar-thin flex-1 space-y-3 overflow-y-auto">
        {result.chunks.map((chunk) => (
          <ChunkCard key={chunk.index} chunk={chunk} />
        ))}
      </div>
    </div>
  );
}

export default memo(CardView);
