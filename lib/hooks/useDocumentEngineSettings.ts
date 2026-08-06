"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { getAuthToken } from "@/lib/auth";
import { DOCUMENT_ENGINE_TYPES } from "@/lib/constants";
import {
  createDefaultDocumentEngineConfigMap,
  normalizeDocumentEngineConfig,
} from "@/lib/document-engine-settings";
import type {
  DocumentEngineConfig,
  DocumentEngineConfigMap,
  DocumentEngineType,
} from "@/lib/types";

interface DocumentEngineSettingResponse {
  engineType: DocumentEngineType;
  config: DocumentEngineConfig;
  persisted: boolean;
}

export function useDocumentEngineSettings() {
  const [configs, setConfigs] = useState<DocumentEngineConfigMap>(
    createDefaultDocumentEngineConfigMap
  );
  const [savedConfigs, setSavedConfigs] = useState<DocumentEngineConfigMap>(
    createDefaultDocumentEngineConfigMap
  );
  const [persistedEngines, setPersistedEngines] = useState<Set<DocumentEngineType>>(
    new Set()
  );
  const [loading, setLoading] = useState(true);
  const [ready, setReady] = useState(false);
  const [savingEngine, setSavingEngine] = useState<DocumentEngineType | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const token = getAuthToken();
    if (!token) {
      setError("Login is required to load document engine settings.");
      setLoading(false);
      setReady(false);
      return;
    }

    setLoading(true);
    setReady(false);
    setError(null);

    try {
      const response = await fetch("/api/document-engine-settings", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data.error || "Failed to load document engine settings");
      }

      const loadedConfigs = createDefaultDocumentEngineConfigMap();
      const loadedPersistedEngines = new Set<DocumentEngineType>();

      for (const setting of (data.settings || []) as DocumentEngineSettingResponse[]) {
        loadedConfigs[setting.engineType] = normalizeDocumentEngineConfig(
          setting.engineType,
          setting.config
        );
        if (setting.persisted) loadedPersistedEngines.add(setting.engineType);
      }

      setConfigs(loadedConfigs);
      setSavedConfigs(loadedConfigs);
      setPersistedEngines(loadedPersistedEngines);
      setReady(true);
    } catch (loadError) {
      setError(loadError instanceof Error
        ? loadError.message
        : "Failed to load document engine settings");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const updateConfig = useCallback((
    engineType: DocumentEngineType,
    updates: Partial<DocumentEngineConfig>
  ) => {
    setConfigs((current) => ({
      ...current,
      [engineType]: { ...current[engineType], ...updates },
    }));
  }, []);

  const dirtyEngines = useMemo(() => {
    const dirty = new Set<DocumentEngineType>();
    for (const engineType of DOCUMENT_ENGINE_TYPES) {
      const normalizedDraft = normalizeDocumentEngineConfig(engineType, configs[engineType]);
      if (JSON.stringify(normalizedDraft) !== JSON.stringify(savedConfigs[engineType])) {
        dirty.add(engineType);
      }
    }
    return dirty;
  }, [configs, savedConfigs]);

  const saveConfig = useCallback(async (engineType: DocumentEngineType) => {
    const token = getAuthToken();
    if (!token) {
      setError("Login is required to save document engine settings.");
      return false;
    }

    const normalizedConfig = normalizeDocumentEngineConfig(engineType, configs[engineType]);
    setSavingEngine(engineType);
    setError(null);

    try {
      const response = await fetch("/api/document-engine-settings", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ engineType, config: normalizedConfig }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data.error || "Failed to save document engine settings");
      }

      const savedConfig = normalizeDocumentEngineConfig(engineType, data.setting?.config);
      setConfigs((current) => ({ ...current, [engineType]: savedConfig }));
      setSavedConfigs((current) => ({ ...current, [engineType]: savedConfig }));
      setPersistedEngines((current) => new Set(current).add(engineType));
      setReady(true);
      return true;
    } catch (saveError) {
      setError(saveError instanceof Error
        ? saveError.message
        : "Failed to save document engine settings");
      return false;
    } finally {
      setSavingEngine(null);
    }
  }, [configs]);

  return {
    configs,
    savedConfigs,
    persistedEngines,
    dirtyEngines,
    loading,
    ready,
    savingEngine,
    error,
    updateConfig,
    saveConfig,
    reload: load,
  };
}
