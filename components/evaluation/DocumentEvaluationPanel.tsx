"use client";

import { memo } from "react";

import DocumentEvaluationView from "@/components/evaluation/DocumentEvaluationView";
import PagePanel from "@/components/shared/PagePanel";

/**
 * Parser evaluation is its own menu rather than a third tab of answer
 * evaluation: it takes a different input (a frozen Document IR reference),
 * produces different metrics, and is run by a different task.
 */
function DocumentEvaluationPanel() {
  return (
    <PagePanel
      title="파서 평가"
      description="원본과 동결된 기준 Document IR을 대조해 파서 정확도를 측정합니다. 답변 평가와는 별개의 측정 축이며, 두 점수는 합산되지 않습니다."
      bodyScroll="hidden"
      bleed
    >
      <DocumentEvaluationView />
    </PagePanel>
  );
}

export default memo(DocumentEvaluationPanel);
