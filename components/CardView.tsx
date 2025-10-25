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
      {/* Statistics */}
      <div className="mb-4 px-6 py-4 bg-accent/5 rounded-lg border border-accent/10">
        <div className="grid grid-cols-4 gap-3">
          <div className="text-left">
            <p className="text-xs text-muted-foreground">Total Chunks</p>
            <p className="text-lg font-semibold text-surface-foreground">
              {result.totalChunks}
            </p>
          </div>
          <div className="text-left">
            <p className="text-xs text-muted-foreground">Average Size</p>
            <p className="text-lg font-semibold text-surface-foreground">
              {result.statistics.averageChunkSize}
            </p>
          </div>
          <div className="text-left">
            <p className="text-xs text-muted-foreground">Min / Max</p>
            <p className="text-lg font-semibold text-surface-foreground">
              {result.statistics.minChunkSize} / {result.statistics.maxChunkSize}
            </p>
          </div>
          <div className="text-left">
            <p className="text-xs text-muted-foreground">Processing Time</p>
            <p className="text-lg font-semibold text-surface-foreground">
              {result.statistics.processingTime}ms
            </p>
          </div>
        </div>
      </div>

      {/* Chunks */}
      <div className="flex-1 overflow-y-auto scrollbar-thin space-y-4">
        {result.chunks.map((chunk) => (
          <ChunkCard key={chunk.index} chunk={chunk} />
        ))}
      </div>
    </div>
  );
}

export default memo(CardView);
