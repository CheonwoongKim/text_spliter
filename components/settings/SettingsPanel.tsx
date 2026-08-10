"use client";

import LicensesPanel from "@/components/connect/LicensesPanel";
import ParserEngineSettingsPanel from "@/components/settings/ParserEngineSettingsPanel";
import PagePanel from "@/components/shared/PagePanel";
import TabBar from "@/components/shared/TabBar";
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
    <PagePanel
      title="설정"
      description="연결 정보와 문서 파서·Vision 모델 실행 프로필을 한 곳에서 관리합니다."
      toolbar={
        <TabBar
          label="설정 구역"
          value={activeSection}
          onChange={onSectionChange}
          options={[
            { value: "connections", label: "연결" },
            { value: "document-engines", label: "문서 엔진" },
          ]}
        />
      }
      bodyScroll="hidden"
      bleed
    >
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
    </PagePanel>
  );
}
