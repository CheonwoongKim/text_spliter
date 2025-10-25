"use client";

import { memo } from "react";
import { SplitterType, EncodingName, ProgrammingLanguage, BreakpointType } from "@/lib/types";

interface SplitterConfigProps {
  splitterType: SplitterType;
  chunkSize: number;
  chunkOverlap: number;
  separator?: string;
  encodingName?: EncodingName;
  language?: ProgrammingLanguage;
  breakpointType?: BreakpointType;
  onChunkSizeChange: (value: number) => void;
  onChunkOverlapChange: (value: number) => void;
  onSeparatorChange?: (value: string | undefined) => void;
  onEncodingNameChange?: (value: EncodingName) => void;
  onLanguageChange?: (value: ProgrammingLanguage) => void;
  onBreakpointTypeChange?: (value: BreakpointType) => void;
}

// Common className constants to reduce duplication
const INPUT_BASE_CLASS = `w-full h-12 px-3 border border-border rounded-lg
                   focus-ring
                   bg-card text-card-foreground placeholder-light
                   transition-smooth`;

const LABEL_CLASS = "block text-sm text-muted-foreground mb-1";
const HELP_TEXT_CLASS = "text-xs text-muted-foreground mt-2";

function SplitterConfig({
  splitterType,
  chunkSize,
  chunkOverlap,
  separator,
  encodingName = "cl100k_base",
  language = "python",
  breakpointType = "percentile",
  onChunkSizeChange,
  onChunkOverlapChange,
  onSeparatorChange,
  onEncodingNameChange,
  onLanguageChange,
  onBreakpointTypeChange,
}: SplitterConfigProps) {
  return (
    <div className="space-y-4">
      <h3 className="text-sm font-medium text-surface-foreground">
        Configuration
      </h3>

      {/* Chunk Size - hide for SemanticChunker */}
      {splitterType !== "SemanticChunker" && (
        <div>
          <label className={LABEL_CLASS}>
            Chunk Size
          </label>
          <input
            type="number"
            value={chunkSize || ''}
            onChange={(e) => {
              const value = e.target.value;
              onChunkSizeChange(value === '' ? 0 : Number(value));
            }}
            onBlur={(e) => {
              if (Number(e.target.value) < 1 || e.target.value === '') {
                onChunkSizeChange(1);
              }
            }}
            min={1}
            max={10000}
            className={INPUT_BASE_CLASS}
          />
          <p className={HELP_TEXT_CLASS}>
            Maximum number of {splitterType.includes("Token") ? "tokens" : "characters"} per chunk
          </p>
        </div>
      )}

      {/* Chunk Overlap - hide for SemanticChunker */}
      {splitterType !== "SemanticChunker" && (
        <div>
          <label className={LABEL_CLASS}>
            Chunk Overlap
          </label>
          <input
            type="number"
            value={chunkOverlap || ''}
            onChange={(e) => {
              const value = e.target.value;
              onChunkOverlapChange(value === '' ? 0 : Number(value));
            }}
            onBlur={(e) => {
              if (e.target.value === '' || Number(e.target.value) < 0) {
                onChunkOverlapChange(0);
              }
            }}
            min={0}
            max={chunkSize - 1}
            className={INPUT_BASE_CLASS}
          />
          <p className={HELP_TEXT_CLASS}>
            Number of overlapping {splitterType.includes("Token") ? "tokens" : "characters"} between chunks
          </p>
        </div>
      )}

      {/* Separator (only for CharacterTextSplitter) */}
      {splitterType === "CharacterTextSplitter" && (
        <div>
          <label className={LABEL_CLASS}>
            Separator
          </label>
          <input
            type="text"
            value={separator || ""}
            onChange={(e) => {
              const value = e.target.value;
              onSeparatorChange?.(value === "" ? undefined : value);
            }}
            placeholder="\n\n (default)"
            className={INPUT_BASE_CLASS}
          />
          <p className={HELP_TEXT_CLASS}>
            Single character sequence to split on. Leave empty to use default (\n\n)
          </p>
        </div>
      )}

      {/* Separators (only for RecursiveCharacterTextSplitter) */}
      {splitterType === "RecursiveCharacterTextSplitter" && (
        <div>
          <label className={LABEL_CLASS}>
            Separators (comma-separated)
          </label>
          <input
            type="text"
            value={separator || ""}
            onChange={(e) => onSeparatorChange?.(e.target.value || undefined)}
            placeholder="\n\n,\n, , (default)"
            className={`${INPUT_BASE_CLASS} font-mono text-sm`}
          />
          <p className={HELP_TEXT_CLASS}>
            Enter separators separated by commas. Leave empty to use default: ["\n\n", "\n", " ", ""]
          </p>
        </div>
      )}

      {/* Encoding Name (for Token splitters) */}
      {splitterType === "TokenTextSplitter" && (
        <div>
          <label className={LABEL_CLASS}>
            Encoding Name
          </label>
          <select
            value={encodingName}
            onChange={(e) => onEncodingNameChange?.(e.target.value as EncodingName)}
            className={INPUT_BASE_CLASS}
          >
            <option value="cl100k_base">cl100k_base (GPT-4, GPT-3.5-turbo)</option>
            <option value="p50k_base">p50k_base (GPT-3)</option>
            <option value="r50k_base">r50k_base (GPT-3 davinci)</option>
          </select>
          <p className={HELP_TEXT_CLASS}>
            Token encoding scheme to use
          </p>
        </div>
      )}

      {/* Language (for Code splitter) */}
      {splitterType === "CodeSplitter" && (
        <div>
          <label className={LABEL_CLASS}>
            Programming Language
          </label>
          <select
            value={language}
            onChange={(e) => onLanguageChange?.(e.target.value as ProgrammingLanguage)}
            className={INPUT_BASE_CLASS}
          >
            <option value="python">Python</option>
            <option value="js">JavaScript</option>
            <option value="ts">TypeScript</option>
            <option value="java">Java</option>
            <option value="cpp">C++</option>
            <option value="go">Go</option>
            <option value="rust">Rust</option>
            <option value="php">PHP</option>
            <option value="ruby">Ruby</option>
            <option value="swift">Swift</option>
            <option value="kotlin">Kotlin</option>
            <option value="csharp">C#</option>
            <option value="html">HTML</option>
            <option value="markdown">Markdown</option>
            <option value="latex">LaTeX</option>
          </select>
          <p className={HELP_TEXT_CLASS}>
            Select the programming language for code splitting
          </p>
        </div>
      )}

      {/* Breakpoint Type (for Semantic Chunker) */}
      {splitterType === "SemanticChunker" && (
        <div>
          <label className={LABEL_CLASS}>
            Breakpoint Type
          </label>
          <select
            value={breakpointType}
            onChange={(e) => onBreakpointTypeChange?.(e.target.value as BreakpointType)}
            className={INPUT_BASE_CLASS}
          >
            <option value="percentile">Percentile (백분위수)</option>
            <option value="standard_deviation">Standard Deviation (표준편차)</option>
            <option value="interquartile">Interquartile (사분위수)</option>
            <option value="gradient">Gradient (기울기)</option>
          </select>
          <div className="mt-2 p-3 bg-muted/50 rounded-lg border border-border">
            <p className="text-xs text-muted-foreground">
              {breakpointType === "percentile" && (
                <>
                  <strong className="text-surface-foreground">백분위수 방식:</strong> 유사도가 하위 25%에 해당하는 지점에서 분할합니다.
                  가장 균형잡힌 방식으로 일반적인 텍스트에 적합합니다.
                </>
              )}
              {breakpointType === "standard_deviation" && (
                <>
                  <strong className="text-surface-foreground">표준편차 방식:</strong> 평균 유사도에서 1 표준편차 이하인 지점에서 분할합니다.
                  통계적으로 유의미하게 낮은 유사도를 기준으로 분할합니다.
                </>
              )}
              {breakpointType === "interquartile" && (
                <>
                  <strong className="text-surface-foreground">사분위수 방식:</strong> Q1 - 1.5 * IQR 이하인 지점에서 분할합니다.
                  이상치를 고려한 방식으로 극단적인 차이가 있을 때 분할합니다.
                </>
              )}
              {breakpointType === "gradient" && (
                <>
                  <strong className="text-surface-foreground">기울기 방식:</strong> 연속된 문장 간 유사도의 급격한 변화를 감지하여 분할합니다.
                  주제 전환이 명확한 텍스트에 효과적입니다.
                </>
              )}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

export default memo(SplitterConfig);
