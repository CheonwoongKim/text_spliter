"use client";

import { ArrowRight, LoaderCircle, RotateCcw } from "lucide-react";
import { memo } from "react";
import { SplitterType, SplitterConfig as SplitterConfigType, SourceMetadata } from "@/lib/types";
import TextInput from "./TextInput";
import SplitterSelector from "./SplitterSelector";
import SplitterConfig from "./SplitterConfig";
import SplitterDescription from "./SplitterDescription";

interface LeftPanelProps {
  text: string;
  config: SplitterConfigType;
  loading: boolean;
  onTextChange: (text: string) => void;
  onSourceMetadataChange?: (metadata: SourceMetadata | null) => void;
  onSplitterTypeChange: (type: SplitterType) => void;
  onConfigChange: (config: Partial<SplitterConfigType>) => void;
  onSplit: () => void;
  onReset: () => void;
  handoff?: { token: number; label: string } | null;
  structureSplitAvailable?: boolean;
}

const LeftPanel = memo(function LeftPanel({
  text,
  config,
  loading,
  onTextChange,
  onSourceMetadataChange,
  onSplitterTypeChange,
  onConfigChange,
  onSplit,
  onReset,
  handoff,
  structureSplitAvailable = false,
}: LeftPanelProps) {
  return (
    <div className="relative flex h-full flex-col">
      <div className="flex-1 overflow-y-auto py-6 pb-16 lg:pr-10">
        {/* Text Input */}
        <div className="mb-10 h-splitter-source">
          <TextInput
            value={text}
            onChange={onTextChange}
            onSourceMetadataChange={onSourceMetadataChange}
            handoff={handoff}
          />
        </div>

        {/* Splitter Selector */}
        <div className="mb-4">
          <SplitterSelector
            value={config.splitterType}
            onChange={onSplitterTypeChange}
            structureSplitAvailable={structureSplitAvailable}
          />
        </div>

        {/* Splitter Description */}
        <div className="mb-10">
          <SplitterDescription splitterType={config.splitterType} />
        </div>

        {/* Splitter Configuration */}
        <div className="mb-6">
          <SplitterConfig
            splitterType={config.splitterType}
            chunkSize={config.chunkSize}
            chunkOverlap={config.chunkOverlap}
            separator={config.separator}
            encodingName={config.encodingName}
            language={config.language}
            breakpointType={config.breakpointType}
            onChunkSizeChange={(value) => onConfigChange({ chunkSize: value })}
            onChunkOverlapChange={(value) => onConfigChange({ chunkOverlap: value })}
            onSeparatorChange={(value) => onConfigChange({ separator: value })}
            onEncodingNameChange={(value) => onConfigChange({ encodingName: value })}
            onLanguageChange={(value) => onConfigChange({ language: value })}
            onBreakpointTypeChange={(value) => onConfigChange({ breakpointType: value })}
          />
        </div>
      </div>

      <div className="absolute bottom-0 left-0 right-0 border-t border-border-subtle bg-surface px-6 py-6">
        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={onReset}
            disabled={loading}
            className="flex items-center gap-2 text-xs font-medium text-muted-foreground transition-smooth
                     hover:text-surface-foreground disabled:cursor-not-allowed disabled:opacity-disabled"
          >
            <RotateCcw className="h-4 w-4" strokeWidth={1.5} aria-hidden="true" />
            Reset
          </button>

          <button
            type="button"
            onClick={onSplit}
            disabled={loading}
            className="flex h-control-md items-center gap-2 rounded-lg bg-surface-foreground px-3 text-xs
                     font-medium text-surface transition-smooth hover:opacity-hover
                     disabled:cursor-not-allowed disabled:opacity-disabled"
          >
          {loading ? (
            <>
              <LoaderCircle className="h-4 w-4 animate-spin" strokeWidth={1.5} aria-hidden="true" />
              Processing...
            </>
          ) : (
            <>
              Split Text
              <ArrowRight className="h-4 w-4" strokeWidth={1.5} aria-hidden="true" />
            </>
          )}
          </button>
        </div>
      </div>
    </div>
  );
});

LeftPanel.displayName = 'LeftPanel';

export default LeftPanel;
