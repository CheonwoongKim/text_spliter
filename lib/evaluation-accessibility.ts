interface EvaluationCaseLabelSource {
  case_key: string;
  question: string;
}

export function evaluationCaseSelectionLabel(evaluationCase: EvaluationCaseLabelSource): string {
  const caseKey = evaluationCase.case_key.trim();
  const question = evaluationCase.question.trim();
  return `Select ${caseKey || question || "evaluation case"} for run`;
}
