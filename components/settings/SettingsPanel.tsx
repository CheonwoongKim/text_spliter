"use client";

import LicensesPanel from "@/components/connect/LicensesPanel";
import ParserEngineSettingsPanel from "@/components/settings/ParserEngineSettingsPanel";
import type {
  DocumentEngineConfig,
  DocumentEngineConfigMap,
  DocumentEngineType,
} from "@/lib/types";

export type SettingsSection = "connections" | "document-engines";

interface SettingsPanelProps {
  activeSection: SettingsSection;
  onSectionChange: (section: SettingsSection) => void;
  selectedParserEngine: DocumentEngineType;
  onSelectedParserEngineChange: (engineType: DocumentEngineType) => void;
  parserConfigs: DocumentEngineConfigMap;
  savedParserConfigs: DocumentEngineConfigMap;
  persistedParserEngines: ReadonlySet<DocumentEngineType>;
  dirtyParserEngines: ReadonlySet<DocumentEngineType>;
  parserSettingsLoading: boolean;
  parserSettingsSavingEngine: DocumentEngineType | null;
  parserSettingsError: string | null;
  onParserConfigChange: (
    engineType: DocumentEngineType,
    updates: Partial<DocumentEngineConfig>
  ) => void;
  onSaveParserConfig: (engineType: DocumentEngineType) => Promise<boolean>;
  onReloadParserSettings: () => void;
}

export default function SettingsPanel({
  activeSection,
  onSectionChange,
  selectedParserEngine,
  onSelectedParserEngineChange,
  parserConfigs,
  savedParserConfigs,
  persistedParserEngines,
  dirtyParserEngines,
  parserSettingsLoading,
  parserSettingsSavingEngine,
  parserSettingsError,
  onParserConfigChange,
  onSaveParserConfig,
  onReloadParserSettings,
}: SettingsPanelProps) {
  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="shrink-0 border-b border-border bg-surface px-4 py-6 sm:px-6 lg:px-10">
        <div className="mx-auto max-w-5xl">
          <h1 className="text-2xl font-semibold text-card-foreground">Settings</h1>
          <p className="mt-2 text-base text-muted-foreground">
            연결 정보와 문서 파서·Vision 모델 실행 프로필을 한 곳에서 관리합니다.
          </p>
          <div className="mt-6 inline-flex gap-1 rounded-lg bg-muted p-1" role="tablist">
            <button
              type="button"
              role="tab"
              aria-selected={activeSection === "connections"}
              onClick={() => onSectionChange("connections")}
              className={`rounded-sm px-3 py-2 text-xs font-medium transition-smooth ${
                activeSection === "connections"
                  ? "bg-card text-card-foreground shadow-sm"
                  : "text-muted-foreground hover:text-card-foreground"
              }`}
            >
              Connections
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={activeSection === "document-engines"}
              onClick={() => onSectionChange("document-engines")}
              className={`rounded-sm px-3 py-2 text-xs font-medium transition-smooth ${
                activeSection === "document-engines"
                  ? "bg-card text-card-foreground shadow-sm"
                  : "text-muted-foreground hover:text-card-foreground"
              }`}
            >
              Document engines
            </button>
          </div>
        </div>
      </div>

      <div className="min-h-0 flex-1">
        {activeSection === "connections" ? (
          <LicensesPanel embedded />
        ) : (
          <ParserEngineSettingsPanel
            configs={parserConfigs}
            savedConfigs={savedParserConfigs}
            persistedEngines={persistedParserEngines}
            dirtyEngines={dirtyParserEngines}
            loading={parserSettingsLoading}
            savingEngine={parserSettingsSavingEngine}
            error={parserSettingsError}
            selectedEngine={selectedParserEngine}
            onSelectedEngineChange={onSelectedParserEngineChange}
            onConfigChange={onParserConfigChange}
            onSave={onSaveParserConfig}
            onReload={onReloadParserSettings}
            onOpenConnections={() => onSectionChange("connections")}
          />
        )}
      </div>
    </div>
  );
}
