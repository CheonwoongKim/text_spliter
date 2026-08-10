"use client";

import { memo } from "react";

import DocumentEvaluationView from "@/components/evaluation/DocumentEvaluationView";

/**
 * Parser evaluation is its own menu rather than a third tab of answer
 * evaluation: it takes a different input (a frozen Document IR reference),
 * produces different metrics, and is run by a different task.
 */
function DocumentEvaluationPanel() {
  return (
    <div className="flex h-full flex-col bg-surface">
      <header className="border-b border-border-subtle bg-card px-4 py-4 sm:px-6 lg:px-10">
        <h2 className="text-xs font-semibold text-card-foreground">파서 평가</h2>
        <p className="mt-1 text-2xs text-muted-foreground">
          원본과 동결된 기준 Document IR을 대조해 파서 정확도를 측정합니다.
          답변 평가와는 별개의 측정 축이며, 두 점수는 합산되지 않습니다.
        </p>
      </header>

      <div className="min-h-0 flex-1">
        <DocumentEvaluationView />
      </div>
    </div>
  );
}

export default memo(DocumentEvaluationPanel);
