export interface JudgeMetricRow {
  status: string;
  scores?: Record<string, unknown> | null;
  metricDetails?: Record<string, unknown> | null;
  usage?: Record<string, unknown> | null;
}

function finiteNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

export function aggregateJudgeMetrics(rows: JudgeMetricRow[], metricNames: string[]) {
  const metrics: Record<string, { average: number | null; sampleCount: number; unavailableCount: number }> = {};
  for (const metric of metricNames) {
    const values = rows
      .map((row) => finiteNumber(row.scores?.[metric]))
      .filter((value): value is number => value !== null);
    const unavailableCount = rows.filter((row) => {
      const detail = row.metricDetails?.[metric];
      return detail && typeof detail === "object"
        && (detail as Record<string, unknown>).status === "unavailable";
    }).length;
    metrics[metric] = {
      average: values.length
        ? Number((values.reduce((sum, value) => sum + value, 0) / values.length).toFixed(6))
        : null,
      sampleCount: values.length,
      unavailableCount,
    };
  }

  const usageKeys = ["requests", "inputTokens", "outputTokens", "totalTokens"] as const;
  const usage = Object.fromEntries(usageKeys.map((key) => [
    key,
    rows.reduce((sum, row) => sum + (finiteNumber(row.usage?.[key]) || 0), 0),
  ]));
  const completedCount = rows.filter((row) => ["succeeded", "failed"].includes(row.status)).length;
  const succeededCount = rows.filter((row) => row.status === "succeeded").length;
  const failedCount = rows.filter((row) => row.status === "failed").length;

  return {
    completedCount,
    succeededCount,
    failedCount,
    metrics,
    usage,
  };
}
