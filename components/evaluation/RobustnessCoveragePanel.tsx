"use client";

import { AlertTriangle, Check } from "lucide-react";
import { memo, useMemo } from "react";

import { buildRobustnessCoverage } from "@/lib/robustness-coverage";
import type { EvaluationCase } from "@/lib/types";

interface RobustnessCoveragePanelProps {
  cases: EvaluationCase[];
}

function RobustnessCoveragePanel({ cases }: RobustnessCoveragePanelProps) {
  const report = useMemo(() => buildRobustnessCoverage(cases), [cases]);

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <p className="text-xs text-muted-foreground">
          A score averaged over clean, answerable questions cannot show how the pipeline behaves on
          the inputs that actually fail. Tag cases to close a gap.
        </p>
        <span className="text-xs font-medium text-card-foreground">
          {report.coveredCount}/{report.scenarios.length} scenarios covered
        </span>
      </div>

      <div className="overflow-hidden rounded-lg border border-border">
        {report.scenarios.map((entry) => (
          <div
            key={entry.scenario.id}
            className="flex items-start gap-3 border-b border-border-subtle bg-card px-3 py-3 last:border-b-0"
          >
            {entry.covered ? (
              <Check className="h-4 w-4 shrink-0 text-success" strokeWidth={1.5} aria-hidden="true" />
            ) : (
              <AlertTriangle className="h-4 w-4 shrink-0 text-warning" strokeWidth={1.5} aria-hidden="true" />
            )}
            <div className="min-w-0 flex-1">
              <p className="text-xs font-medium text-card-foreground">{entry.scenario.label}</p>
              <p className="mt-1 text-xs text-muted-foreground">{entry.scenario.rationale}</p>
              {!entry.covered && (
                <p className="mt-1 text-xs text-muted-foreground">
                  Tag a case with
                  {" "}
                  <span className="rounded-sm bg-muted px-1 font-mono">
                    {entry.scenario.tags[0]}
                  </span>
                  {entry.scenario.id === "unanswerable"
                    ? " or mark it unanswerable."
                    : "."}
                </p>
              )}
            </div>
            <span className="shrink-0 text-xs text-muted-foreground">
              {entry.caseCount}/{entry.scenario.minimumCases}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default memo(RobustnessCoveragePanel);
