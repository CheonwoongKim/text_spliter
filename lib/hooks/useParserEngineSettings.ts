"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { getAuthToken } from "@/lib/auth";
import { PARSER_TYPES } from "@/lib/constants";
import {
  createDefaultParserEngineConfigMap,
  normalizeParserEngineConfig,
} from "@/lib/parser-engine-settings";
import type {
  ParserEngineConfig,
  ParserEngineConfigMap,
  ParserType,
} from "@/lib/types";

interface ParserSettingResponse {
  parserType: ParserType;
  config: ParserEngineConfig;
  persisted: boolean;
}

export function useParserEngineSettings() {
  const [configs, setConfigs] = useState<ParserEngineConfigMap>(
    createDefaultParserEngineConfigMap
  );
  const [savedConfigs, setSavedConfigs] = useState<ParserEngineConfigMap>(
    createDefaultParserEngineConfigMap
  );
  const [persistedEngines, setPersistedEngines] = useState<Set<ParserType>>(
    new Set()
  );
  const [loading, setLoading] = useState(true);
  const [ready, setReady] = useState(false);
  const [savingEngine, setSavingEngine] = useState<ParserType | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const token = getAuthToken();
    if (!token) {
      setError("Login is required to load parser settings.");
      setLoading(false);
      setReady(false);
      return;
    }

    setLoading(true);
    setReady(false);
    setError(null);

    try {
      const response = await fetch("/api/parser-settings", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data.error || "Failed to load parser settings");
      }

      const loadedConfigs = createDefaultParserEngineConfigMap();
      const loadedPersistedEngines = new Set<ParserType>();

      for (const setting of (data.settings || []) as ParserSettingResponse[]) {
        loadedConfigs[setting.parserType] = normalizeParserEngineConfig(
          setting.parserType,
          setting.config
        );
        if (setting.persisted) loadedPersistedEngines.add(setting.parserType);
      }

      setConfigs(loadedConfigs);
      setSavedConfigs(loadedConfigs);
      setPersistedEngines(loadedPersistedEngines);
      setReady(true);
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Failed to load parser settings"
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const updateConfig = useCallback((
    parserType: ParserType,
    updates: Partial<ParserEngineConfig>
  ) => {
    setConfigs((current) => ({
      ...current,
      [parserType]: {
        ...current[parserType],
        ...updates,
      },
    }));
  }, []);

  const dirtyEngines = useMemo(() => {
    const dirty = new Set<ParserType>();
    for (const parserType of PARSER_TYPES) {
      const normalizedDraft = normalizeParserEngineConfig(
        parserType,
        configs[parserType]
      );
      if (JSON.stringify(normalizedDraft) !== JSON.stringify(savedConfigs[parserType])) {
        dirty.add(parserType);
      }
    }
    return dirty;
  }, [configs, savedConfigs]);

  const saveConfig = useCallback(async (parserType: ParserType) => {
    const token = getAuthToken();
    if (!token) {
      setError("Login is required to save parser settings.");
      return false;
    }

    const normalizedConfig = normalizeParserEngineConfig(
      parserType,
      configs[parserType]
    );
    setSavingEngine(parserType);
    setError(null);

    try {
      const response = await fetch("/api/parser-settings", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ parserType, config: normalizedConfig }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data.error || "Failed to save parser settings");
      }

      const savedConfig = normalizeParserEngineConfig(
        parserType,
        data.setting?.config
      );
      setConfigs((current) => ({ ...current, [parserType]: savedConfig }));
      setSavedConfigs((current) => ({ ...current, [parserType]: savedConfig }));
      setPersistedEngines((current) => new Set(current).add(parserType));
      setReady(true);
      return true;
    } catch (saveError) {
      setError(
        saveError instanceof Error
          ? saveError.message
          : "Failed to save parser settings"
      );
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
