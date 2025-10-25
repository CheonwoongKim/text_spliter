"use client";

import { SplitterType, SplitterConfig as SplitterConfigType } from "@/lib/types";
import TextInput from "./TextInput";
import SplitterSelector from "./SplitterSelector";
import SplitterConfig from "./SplitterConfig";
import SplitterDescription from "./SplitterDescription";

interface LeftPanelProps {
  text: string;
  config: SplitterConfigType;
  loading: boolean;
  onTextChange: (text: string) => void;
  onSplitterTypeChange: (type: SplitterType) => void;
  onConfigChange: (config: Partial<SplitterConfigType>) => void;
  onSplit: () => void;
  onReset: () => void;
}

export default function LeftPanel({
  text,
  config,
  loading,
  onTextChange,
  onSplitterTypeChange,
  onConfigChange,
  onSplit,
  onReset,
}: LeftPanelProps) {
  return (
    <div className="h-full flex flex-col relative">
      <div className="flex-1 overflow-y-auto py-6 pb-24">
        {/* Text Input */}
        <div className="mb-10 h-[400px]">
          <TextInput value={text} onChange={onTextChange} />
        </div>

        {/* Splitter Selector */}
        <div className="mb-4">
          <SplitterSelector
            value={config.splitterType}
            onChange={onSplitterTypeChange}
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
            onBreakpointTypeChange={(value) => onConfigChange({ breakpointType: value as any })}
          />
        </div>
      </div>

      {/* Buttons - Floating */}
      <div className="absolute bottom-0 left-0 right-0 bg-surface border-t border-border px-6 py-6">
        <div className="flex items-center justify-between">
          {/* Reset Button */}
          <button
            onClick={onReset}
            disabled={loading}
            className="text-muted-foreground hover:text-surface-foreground disabled:opacity-disabled
                     disabled:cursor-not-allowed font-medium text-sm
                     transition-smooth flex items-center gap-2"
          >
            <svg
              className="w-4 h-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
              />
            </svg>
            Reset
          </button>

          {/* Split Button */}
          <button
            onClick={onSplit}
            disabled={loading}
            className="text-blue-500 hover:text-blue-600 disabled:text-muted-foreground
                     disabled:cursor-not-allowed font-medium text-sm
                     transition-smooth flex items-center gap-2"
          >
          {loading ? (
            <>
              <svg
                className="animate-spin h-4 w-4"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                ></circle>
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                ></path>
              </svg>
              Processing...
            </>
          ) : (
            <>
              Split Text
              <svg
                className="w-4 h-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 5l7 7-7 7"
                />
              </svg>
            </>
          )}
          </button>
        </div>
      </div>
    </div>
  );
}
