/**
 * The product speaks Korean.
 *
 * Not everything on screen is product copy, though. Three kinds of English stay
 * in English because translating them would cost the reader the thing they need
 * most — the ability to match what they see here against a provider's console,
 * a paper, or an API response:
 *
 *  - provider option names: `Agentic Plus`, `Prebuilt Layout`, `Fast`
 *  - measurement names: `Recall@K`, `MRR`, `nDCG@K`, `Faithfulness`
 *  - identifiers and formats: model ids, `JSON`, `HTML`, `Markdown`, `chunk_key`
 *
 * Everything a person is asked to do or told about — actions, states, labels,
 * and explanations — is Korean.
 */

/** Terms that must survive translation, checked by tests/ui-copy.test.ts. */
export const PRESERVED_TERMS: readonly string[] = [
  // Provider option names
  "Fast", "Cost Effective", "Agentic", "Agentic Plus",
  "Prebuilt Layout", "Prebuilt Read", "Prebuilt Document",
  // Output formats
  "JSON", "HTML", "Markdown", "Document IR",
  // Deterministic retrieval metrics
  "Recall@K", "Precision@K", "MRR", "nDCG@K", "Hit Rate",
  // Model-judge metrics
  "Faithfulness", "Answer relevancy", "Context precision", "Context recall",
  // Infrastructure names
  "Supabase", "pgvector", "OpenAI", "Ragas", "LangChain",
];

/**
 * Shared wording for actions and states, so the same button does not read three
 * different ways on three screens.
 */
export const UI_COPY = {
  action: {
    save: "저장",
    saving: "저장 중...",
    saved: "저장됨",
    cancel: "취소",
    close: "닫기",
    delete: "삭제",
    deleting: "삭제 중...",
    edit: "수정",
    create: "만들기",
    creating: "만드는 중...",
    run: "실행",
    running: "실행 중...",
    retry: "다시 시도",
    refresh: "새로고침",
    reset: "초기화",
    clear: "지우기",
    upload: "업로드",
    download: "다운로드",
    copy: "복사",
    copied: "복사됨",
    detail: "상세",
    preview: "미리보기",
    select: "선택",
  },
  state: {
    loading: "불러오는 중...",
    processing: "처리 중...",
    empty: "아직 아무것도 없습니다",
    unsaved: "저장되지 않음",
    failed: "실패",
    succeeded: "성공",
  },
  field: {
    name: "이름",
    description: "설명",
    type: "유형",
    size: "크기",
    time: "시간",
    engine: "엔진",
    model: "모델",
    pages: "페이지",
    result: "결과",
    output: "출력",
    metric: "지표",
    language: "언어",
    email: "이메일",
    password: "비밀번호",
  },
  level: {
    auto: "자동",
    low: "낮음",
    medium: "보통",
    high: "높음",
    none: "없음",
  },
} as const;
