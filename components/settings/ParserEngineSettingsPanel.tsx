"use client";

import { useState } from "react";
import { getDocumentEngine, listDocumentEngines } from "@/lib/document-engines";
import {
  normalizeDocumentEngineConfig,
  summarizeDocumentEngineConfig,
} from "@/lib/document-engine-settings";
import type {
  DocumentEngineConfig,
  DocumentEngineConfigMap,
  DocumentEngineType,
} from "@/lib/types";

const engines = listDocumentEngines();
const fieldClassName = `w-full h-control-xl px-3 border border-border rounded-lg
  focus-ring bg-card text-card-foreground placeholder-light transition-smooth
  disabled:opacity-disabled disabled:cursor-not-allowed`;

interface ParserEngineSettingsPanelProps {
  configs: DocumentEngineConfigMap;
  savedConfigs: DocumentEngineConfigMap;
  persistedEngines: ReadonlySet<DocumentEngineType>;
  dirtyEngines: ReadonlySet<DocumentEngineType>;
  loading: boolean;
  savingEngine: DocumentEngineType | null;
  error: string | null;
  selectedEngine: DocumentEngineType;
  onSelectedEngineChange: (engineType: DocumentEngineType) => void;
  onConfigChange: (
    engineType: DocumentEngineType,
    updates: Partial<DocumentEngineConfig>
  ) => void;
  onSave: (engineType: DocumentEngineType) => Promise<boolean>;
  onReload: () => void;
  onOpenConnections: () => void;
}

interface SettingFieldProps {
  label: string;
  description?: string;
  children: React.ReactNode;
}

function SettingField({ label, description, children }: SettingFieldProps) {
  return (
    <label className="block">
      <span className="block text-2xs font-medium text-card-foreground mb-2">
        {label}
      </span>
      {children}
      {description && (
        <span className="block text-2xs text-muted-foreground mt-2">
          {description}
        </span>
      )}
    </label>
  );
}

export default function ParserEngineSettingsPanel({
  configs,
  savedConfigs,
  persistedEngines,
  dirtyEngines,
  loading,
  savingEngine,
  error,
  selectedEngine,
  onSelectedEngineChange,
  onConfigChange,
  onSave,
  onReload,
  onOpenConnections,
}: ParserEngineSettingsPanelProps) {
  const [savedEngine, setSavedEngine] = useState<DocumentEngineType | null>(null);
  const engine = getDocumentEngine(selectedEngine);
  const config = configs[selectedEngine];
  const normalizedConfig = normalizeDocumentEngineConfig(selectedEngine, config);
  const isDirty = dirtyEngines.has(selectedEngine);
  const isPersisted = persistedEngines.has(selectedEngine);
  const isSaving = savingEngine === selectedEngine;

  const update = (updates: Partial<DocumentEngineConfig>) => {
    setSavedEngine(null);
    onConfigChange(selectedEngine, updates);
  };

  const handleSave = async () => {
    const succeeded = await onSave(selectedEngine);
    setSavedEngine(succeeded ? selectedEngine : null);
  };

  return (
    <div className="h-full overflow-y-auto px-4 py-6 sm:px-6 lg:px-10">
      <div className="mx-auto max-w-5xl">
        {error && (
          <div
            role="alert"
            className="mb-6 flex items-center justify-between gap-4 rounded-lg border border-danger-border bg-danger-surface px-4 py-3"
          >
            <p className="text-2xs text-danger">{error}</p>
            <button
              type="button"
              onClick={onReload}
              className="shrink-0 text-2xs font-medium text-danger hover:text-danger/80 transition-smooth"
            >
              Retry
            </button>
          </div>
        )}

        <div className="grid grid-cols-1 gap-8 lg:grid-cols-10 lg:gap-0">
          <aside className="lg:col-span-3 lg:border-r lg:border-border-subtle lg:pr-8">
            <div className="mb-4">
              <h2 className="text-base font-semibold text-card-foreground">
                Document engines
              </h2>
              <p className="text-2xs text-muted-foreground mt-2">
                실행 전에 엔진별 기본 프로필을 등록합니다.
              </p>
            </div>

            <div className="space-y-2" aria-label="Document engines">
              {engines.map((candidate) => {
                const active = candidate.engineType === selectedEngine;
                const dirty = dirtyEngines.has(candidate.engineType);
                return (
                  <button
                    key={candidate.id}
                    type="button"
                    onClick={() => {
                      setSavedEngine(null);
                      onSelectedEngineChange(candidate.engineType);
                    }}
                    className={`w-full rounded-lg border px-3 py-3 text-left transition-smooth ${
                      active
                        ? "border-surface-foreground bg-upload-zone"
                        : "border-border bg-card hover:border-border-darkest"
                    }`}
                    aria-current={active ? "true" : undefined}
                  >
                    <span className="flex items-center justify-between gap-3">
                      <span className="min-w-0 text-xs font-medium text-card-foreground truncate">
                        {candidate.displayName}
                      </span>
                      {dirty && (
                        <span className="shrink-0 text-2xs font-medium text-warning">
                          Unsaved
                        </span>
                      )}
                    </span>
                    <span className="mt-1 block truncate text-2xs text-muted-foreground">
                      {summarizeDocumentEngineConfig(
                        candidate.engineType,
                        savedConfigs[candidate.engineType]
                      )}
                    </span>
                  </button>
                );
              })}
            </div>

            <button
              type="button"
              onClick={onOpenConnections}
              className="mt-4 text-2xs font-medium text-card-foreground hover:text-muted-foreground transition-smooth"
            >
              Manage API credentials
            </button>
          </aside>

          <section className="min-w-0 lg:col-span-7 lg:pl-8">
            <div>
              <div className="flex flex-wrap items-start justify-between gap-4 border-b border-border-subtle pb-6">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-lg font-semibold text-card-foreground">
                      {engine.displayName}
                    </h2>
                    <span className="rounded-full bg-muted px-2 py-1 text-2xs text-muted-foreground">
                      {engine.deployment === "self-hosted" ? "Self-hosted" : "Managed"}
                    </span>
                  </div>
                  <p className="mt-2 text-2xs text-muted-foreground">
                    {summarizeDocumentEngineConfig(selectedEngine, normalizedConfig)} · {isPersisted ? "Saved profile" : "Built-in default"}
                  </p>
                  {isDirty && (
                    <p className="mt-2 text-2xs text-warning">
                      저장하기 전까지 파서 실행에는 이전 프로필이 사용됩니다.
                    </p>
                  )}
                </div>

                <button
                  type="button"
                  onClick={handleSave}
                  disabled={
                    loading
                    || Boolean(savingEngine)
                    || (!isDirty && isPersisted)
                  }
                  className="h-control-md rounded-lg bg-surface-foreground px-4 text-2xs font-medium text-surface transition-smooth disabled:cursor-not-allowed disabled:opacity-disabled"
                >
                  {isSaving
                    ? "Saving..."
                    : savedEngine === selectedEngine
                      ? "Saved"
                      : isPersisted
                        ? "Save changes"
                        : "Register profile"}
                </button>
              </div>

              <fieldset
                disabled={loading || Boolean(savingEngine)}
                className="space-y-6 py-6"
              >
                {loading && (
                  <p className="text-2xs text-muted-foreground">
                    Loading document engine settings...
                  </p>
                )}

                {selectedEngine === "Upstage" && (
                  <SettingField
                    label="OCR language"
                    description="Upstage 내부 OCR에 전달할 언어 코드입니다. 비워두면 자동 감지를 사용합니다."
                  >
                    <input
                      type="text"
                      value={config.language || ""}
                      onChange={(event) => update({ language: event.target.value })}
                      placeholder="ko, en, ja"
                      className={fieldClassName}
                    />
                  </SettingField>
                )}

                {selectedEngine === "LlamaIndex" && (
                  <>
                    <SettingField
                      label="Parsing tier"
                      description="복잡한 표와 스캔 문서는 Agentic 이상을 권장합니다."
                    >
                      <select
                        value={config.llamaTier || "agentic"}
                        onChange={(event) => update({
                          llamaTier: event.target.value as DocumentEngineConfig["llamaTier"],
                        })}
                        className={fieldClassName}
                      >
                        <option value="fast">Fast (text only)</option>
                        <option value="cost_effective">Cost Effective</option>
                        <option value="agentic">Agentic</option>
                        <option value="agentic_plus">Agentic Plus</option>
                      </select>
                    </SettingField>
                    <SettingField label="Parser version">
                      <input
                        type="text"
                        value={config.llamaVersion || "latest"}
                        onChange={(event) => update({ llamaVersion: event.target.value })}
                        placeholder="latest or YYYY-MM-DD"
                        className={fieldClassName}
                      />
                    </SettingField>
                    <SettingField label="Page range" description="선택 사항입니다. 예: 1-5 또는 1,3,5-10">
                      <input
                        type="text"
                        value={config.pageRange || ""}
                        onChange={(event) => update({ pageRange: event.target.value })}
                        placeholder="1-5 or 1,3,5-10"
                        className={fieldClassName}
                      />
                    </SettingField>
                    <SettingField label="OCR language" description="비워두면 자동 감지를 사용합니다.">
                      <input
                        type="text"
                        value={config.language || ""}
                        onChange={(event) => update({ language: event.target.value })}
                        placeholder="ko, en, ja"
                        className={fieldClassName}
                      />
                    </SettingField>
                  </>
                )}

                {selectedEngine === "Azure" && (
                  <>
                    <SettingField
                      label="Model"
                      description="사용할 Azure Document Intelligence 모델을 선택합니다."
                    >
                      <select
                        value={config.azureModelId || "prebuilt-layout"}
                        onChange={(event) => update({ azureModelId: event.target.value })}
                        className={fieldClassName}
                      >
                        <option value="prebuilt-layout">Prebuilt Layout</option>
                        <option value="prebuilt-read">Prebuilt Read</option>
                        <option value="prebuilt-document">Prebuilt Document</option>
                      </select>
                    </SettingField>
                    <SettingField label="Output format">
                      <select
                        value={config.azureOutputFormat || "markdown"}
                        onChange={(event) => update({
                          azureOutputFormat: event.target.value as "text" | "markdown",
                        })}
                        className={fieldClassName}
                      >
                        <option value="text">Text</option>
                        <option value="markdown">Markdown</option>
                      </select>
                    </SettingField>
                  </>
                )}

                {selectedEngine === "Google" && (
                  <>
                    <div className="rounded-lg border border-border bg-muted px-4 py-3">
                      <p className="text-2xs text-muted-foreground">
                        Google Document AI의 인증 정보는 Connections에서 관리하며, 결과는 JSON으로 수집됩니다.
                      </p>
                    </div>
                    <SettingField label="Processor location" description="예: us 또는 eu">
                      <input
                        type="text"
                        value={config.googleLocation || ""}
                        onChange={(event) => update({ googleLocation: event.target.value })}
                        placeholder="us"
                        className={fieldClassName}
                      />
                    </SettingField>
                    <SettingField label="Processor ID">
                      <input
                        type="text"
                        value={config.googleProcessorId || ""}
                        onChange={(event) => update({ googleProcessorId: event.target.value })}
                        placeholder="your-processor-id"
                        className={fieldClassName}
                      />
                    </SettingField>
                  </>
                )}

                {selectedEngine === "Docling" && (
                  <>
                    <SettingField label="Output format" description="Markdown이 기본 권장 형식입니다.">
                      <select
                        value={config.doclingOutputFormat || "markdown"}
                        onChange={(event) => update({
                          doclingOutputFormat: event.target.value as DocumentEngineConfig["doclingOutputFormat"],
                        })}
                        className={fieldClassName}
                      >
                        <option value="markdown">Markdown</option>
                        <option value="html">HTML</option>
                        <option value="json">JSON</option>
                      </select>
                    </SettingField>
                    <SettingField
                      label="Parser pipeline"
                      description="VLM은 복잡한 레이아웃에 유리하지만 더 많은 연산이 필요합니다."
                    >
                      <select
                        value={config.doclingPipeline || "standard"}
                        onChange={(event) => update({
                          doclingPipeline: event.target.value as DocumentEngineConfig["doclingPipeline"],
                        })}
                        className={fieldClassName}
                      >
                        <option value="standard">Standard</option>
                        <option value="vlm">VLM</option>
                      </select>
                    </SettingField>
                    <SettingField label="Table structure mode">
                      <select
                        value={config.doclingTableMode || "accurate"}
                        onChange={(event) => update({
                          doclingTableMode: event.target.value as DocumentEngineConfig["doclingTableMode"],
                        })}
                        className={fieldClassName}
                      >
                        <option value="fast">Fast</option>
                        <option value="accurate">Accurate</option>
                      </select>
                    </SettingField>
                    <label className="flex h-control-xl items-center gap-3 rounded-lg border border-border px-3">
                      <input
                        type="checkbox"
                        checked={config.extractImages || false}
                        onChange={(event) => update({ extractImages: event.target.checked })}
                        className="h-4 w-4 rounded-sm border-border accent-surface-foreground focus:outline-none focus-visible:ring-1 focus-visible:ring-surface-foreground"
                      />
                      <span className="text-xs text-card-foreground">Embed images</span>
                    </label>
                    <SettingField label="OCR mode">
                      <select
                        value={config.doclingOcrMode || "auto"}
                        onChange={(event) => update({
                          doclingOcrMode: event.target.value as DocumentEngineConfig["doclingOcrMode"],
                        })}
                        className={fieldClassName}
                      >
                        <option value="disabled">Disabled (native text only)</option>
                        <option value="auto">Auto</option>
                        <option value="force">Force OCR</option>
                      </select>
                    </SettingField>
                    {config.doclingOcrMode !== "disabled" && (
                      <SettingField label="OCR language" description="비워두면 자동 감지를 사용합니다.">
                        <input
                          type="text"
                          value={config.language || ""}
                          onChange={(event) => update({ language: event.target.value })}
                          placeholder="ko, en, ja"
                          className={fieldClassName}
                        />
                      </SettingField>
                    )}
                  </>
                )}

                {engine.kind === "vision" && (
                  <>
                    <div className="rounded-lg border border-border bg-muted px-4 py-3">
                      <p className="text-2xs text-muted-foreground">
                        PDF는 가능한 경우 원본으로 전달합니다. DOC/DOCX/HWP/HWPX는 Connections에 등록한 네이티브 렌더러에서 페이지 이미지로 캡처합니다.
                      </p>
                    </div>
                    <SettingField label="Model ID" description="재현 가능한 비교를 위해 실제 실행할 모델 ID를 저장합니다.">
                      <input
                        type="text"
                        value={config.modelId || ""}
                        onChange={(event) => update({ modelId: event.target.value })}
                        placeholder={engine.defaultModel}
                        className={fieldClassName}
                      />
                    </SettingField>
                    <SettingField
                      label="Input handling"
                      description={selectedEngine === "Qwen Vision"
                        ? "Qwen은 PDF도 페이지 이미지 폴백을 사용합니다."
                        : "Automatic은 PDF 원본, Office/HWP 네이티브 페이지 캡처를 사용합니다."}
                    >
                      <select
                        value={config.inputPreference || "auto"}
                        onChange={(event) => update({
                          inputPreference: event.target.value as DocumentEngineConfig["inputPreference"],
                        })}
                        className={fieldClassName}
                      >
                        <option value="auto">Automatic (recommended)</option>
                        <option value="native-document" disabled={selectedEngine === "Qwen Vision"}>
                          Native PDF
                        </option>
                        <option value="page-images">Page images</option>
                      </select>
                    </SettingField>
                    <SettingField label="PDF / image detail">
                      <select
                        value={config.pdfDetail || "high"}
                        onChange={(event) => update({
                          pdfDetail: event.target.value as DocumentEngineConfig["pdfDetail"],
                        })}
                        className={fieldClassName}
                      >
                        <option value="auto">Auto</option>
                        <option value="low">Low</option>
                        <option value="high">High</option>
                      </select>
                    </SettingField>
                    <SettingField label="Maximum output tokens">
                      <input
                        type="number"
                        min={512}
                        max={64000}
                        step={512}
                        value={config.maxOutputTokens || 16000}
                        onChange={(event) => update({ maxOutputTokens: Number(event.target.value) })}
                        className={fieldClassName}
                      />
                    </SettingField>
                    <SettingField
                      label="Document transcription prompt"
                      description="요약이 아니라 문서 구조와 보이는 내용을 보존하도록 모든 Vision 비교에 동일한 기본 프롬프트를 사용합니다."
                    >
                      <textarea
                        value={config.prompt || ""}
                        onChange={(event) => update({ prompt: event.target.value })}
                        rows={6}
                        className={`${fieldClassName} h-auto py-3`}
                      />
                    </SettingField>
                  </>
                )}
              </fieldset>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
