# RAG 파이프라인 실험 워크벤치 완성 계획

> 상태: **전 Phase + 잔여 과제 구현 완료 (2026-08-10)**
> 검증: `npm run verify` exit 0 · 174 tests pass · build ✓

## 배경

이 제품은 RAG 파이프라인의 각 단계를 갈아끼워 최적 조합을 찾는 실험·평가 워크벤치다.
착수 전 진단 결과, **평가 인프라는 우수하나 실험 루프가 Parser 단계에만 존재**했다.

### Phase 0 실측 결과 (계획의 전제)

VDB 청크 메타데이터에 `page_number`/`block_id`가 없어(`upload/route.ts`),
`lib/evaluation-metrics.ts`의 `contextIdentity()`가 찾는 필드와 어긋났다. 결과적으로:

| 기대 근거 | 결과 |
|---|---|
| `pageNumber` / `blockId` | 매칭 절대 불가 |
| `documentHash`만 | 모든 청크가 매칭 → Precision@K ~1.0, 무의미 |

→ 결정적 검색 지표가 "채점 불가" 아니면 "무의미하게 높음"이었다. Phase 4를 4a/4b로 쪼개고 4a를 앞당겼다.

### 계획을 바꾼 두 번째 발견

`lib/openai-server.ts`의 `createEmbeddings`가 이미 `model`/`dimensions`를 지원했고,
`list_vector_collections` RPC가 이미 `embedding_model`을 반환했다.
따라서 임베딩 모델 비교는 **CHECK 제약 한 줄 완화**로 가능했다(컬럼·인덱스·RPC 변경 불필요).

---

## Phase별 구현 내역

### Phase 1 — 파이프라인 핸드오프 (마이그레이션 없음)
- `lib/workbench-handoff.ts`, `lib/hooks/useWorkbenchHandoff.ts` 신규
- Parser 결과표에 **Split text** 액션 → 텍스트+provenance를 Splitter로 이관
- Splitter에 **Send to VDB** → 저장 후 기존 업로드 다이얼로그를 바로 오픈
- Splitter의 plaintext 탭에 출처 배너 추가
- 검증: `tests/workbench-handoff.test.ts` (5)

### Phase 4a — 청크 page/block provenance (마이그레이션 없음) ★버그 수정
- `lib/document-text-map.ts` 신규 — Document IR을 실제 청킹 텍스트에 정렬해 span 맵 생성
- `lib/splitters.ts` — offset이 검증된 청크에만 provenance 부여(추측 금지)
- `upload/route.ts` — 청크별 source가 실행 수준 스냅샷을 덮어쓰도록 수정 + `page_number`/`block_id` 저장
- `lib/evaluation-metrics.ts` — 다중 페이지/블록 청크 매칭 지원
- 검증: `tests/document-text-map.test.ts` (8), `tests/evaluation-evidence-matching.test.ts` (5), **Red-Green 확인**

### Phase 2 — 임베딩 모델 실선택 (마이그레이션 1)
- `20260810131304_multi_embedding_model.sql` — CHECK 완화(3-small/3-large), 1536 유지
- `lib/constants.ts` — `SUPPORTED_EMBEDDING_MODELS` 레지스트리
- **핵심 규칙**: 질의 임베딩 모델은 컬렉션 속성에서 파생, 사용자 선택 금지 (혼용 시 유사도가 조용히 무의미)
- 죽은 select 2곳 제거 → 컬렉션 소속 모델 표시로 교체, 생성 모달에 모델 선택 추가
- 검증: `tests/embedding-models.test.ts` (5)

### Phase 3 — Splitter 다중 실행 비교 (마이그레이션 없음)
- `lib/splitter-comparison.ts`, `components/splitter/SplitterResultsOverview.tsx` 신규
- Parser의 `runs[]`→Overview→Detail 패턴 이식. 동일 설정은 자기 행을 대체
- 지표: 청크 수 · 길이 min/med/max · 표준편차 · 실측 overlap · 문장 중간 절단률 · provenance 커버리지
- Parser와 동일하게 **자동 승자 선언 없음**
- `lib/hooks/useSplitterExperiment.ts`로 상태 추출 → `app/page.tsx` 749→648줄
- 부수 수정: VDB 오류가 Splitter 화면에 뜨던 문제를 메뉴별 에러 라우팅으로 해결
- 검증: `tests/splitter-comparison.test.ts` (7)

### Phase 4b — 구조 인식 분할기 (마이그레이션 없음)
- `lib/structure-splitter.ts` 신규 + `DocumentStructureSplitter` 타입 등록
- 표·수식·그림 원자성 / 헤딩 상속 / 페이지 경계 준수 / 머리말·꼬리말 제거
- 블록에서 직접 나오므로 provenance가 **정확**(추론 아님)
- 파싱된 문서가 없으면 선택지가 비활성 + 사유 표시
- 검증: `tests/structure-splitter.test.ts` (9)

### Phase 5 — 비용 계측 (마이그레이션 없음)
- `lib/cost-estimate.ts` 신규 — 버전이 찍힌 단가표, 실행 시점 가격을 run에 저장
- 미등록 모델/누락 usage는 **0이 아니라 unknown**
- RAG 테스트 화면과 평가 실행 요약에 비용 노출
- 검증: `tests/cost-estimate.test.ts` (7)

### Phase 6 — 대화 세션 (마이그레이션 1)
- `20260810133720_rag_conversation_sessions.sql` — `session_id`/`turn_index` (nullable, 기존 행 무영향)
- `lib/rag-conversation.ts` — 이전 턴으로 후속 질문의 지시대명사 해소
- 검색 질의에 이전 턴 반영, 현재 질문이 항상 마지막(우세)
- **AGENTS.md 경계 준수**: 이전 턴은 대화 상태이지 근거가 아니며 인용 불가. 메모리 프로바이더 연동은 제외
- 검증: `tests/rag-conversation.test.ts` (12)

---

---

## 잔여 과제 (후속 요청으로 전부 완료)

### 잔여 1 — `app/api/evaluation/route.ts` 분할 (1138 → 93줄)
- `lib/evaluation/`로 도메인 분리: `request` / `store` / `context` / `judge-actions` / `dataset-actions` / `run-actions`
- route는 디스패처만 담당. 각 핸들러는 자기 액션이 아니면 `null` 반환
- **동일성 기계 검증**: 원본 액션 본문과 추출본을 diff → 차이는 Phase 2 변경분과 디스패처 tail 이동뿐
- `tests/evaluation-actions.test.ts` (3) — 15개 액션이 정확히 한 곳에서만 처리되는지 + 800줄 상한 가드

### 잔여 2 — 비-1536 임베딩 차원 지원 (마이그레이션 1)
- `20260810135301_multi_dimension_embeddings.sql` — `embedding_3072` 컬럼, `match_vector_documents_v2` 차원 분기 RPC
- **pgvector HNSW는 2000차원 상한** → 3072는 인덱스 불가. 근사 recall 손실이 측정을 오염시키므로 **정확(순차) 검색**을 선택하고 UI에 비용을 명시
- 레지스트리를 (모델, 차원) 쌍으로 재구성 → `text-embedding-3-large @ 3072` 선택 가능
- `tests/embedding-models.test.ts` (8) 재작성

### 잔여 3 — 파서 품질 → 검색 성능 delta (마이그레이션 없음)
- `lib/parser-retrieval-delta.ts` + `components/evaluation/ParserImpactView.tsx`
- 청크를 만든 파서별로 검색 지표를 귀속시켜 baseline 대비 delta 산출
- 표본 5건 미만은 **"too few cases"로 명시** — 얇은 표본이 발견처럼 읽히지 않게 함
- provenance 없는 청크는 다른 파서 점수에 합치지 않고 별도 보고
- `tests/parser-retrieval-delta.test.ts` (9)

### 잔여 4 — robustness 시나리오 커버리지 (마이그레이션 없음)
- `lib/robustness-coverage.ts` + `components/evaluation/RobustnessCoveragePanel.tsx`
- 8개 시나리오: 스캔 · 회전 · 노이즈 · 다국어 · 프롬프트 인젝션 · 답변불가 · 표 중심 · 장문
- 케이스 태그와 `answerable` 필드에서 파생, 공백은 **공백으로 보고**
- `tests/robustness-coverage.test.ts` (8)

### 잔여 5 — 시각-의미 채점 VLM judge (마이그레이션 1)
- 기존 `runVisionProvider`(4개 공급사) + `prepareVisionInput` 인프라 재사용
- `lib/document-vlm-judge.ts` — chart/figure/diagram/formula 블록만 채점(텍스트 지표가 못 보는 영역)
- 판정: faithful / partial / wrong / missing / **unavailable**(0이 아님)
- 응답 파싱 실패·미지 판정은 전부 `unavailable` — 모델이 깨진 출력을 내도 점수를 지어내지 않음
- 프롬프트에서 추출 텍스트를 데이터로 격리(인젝션 방어), 대상 24개로 상한
- `20260810140615_document_vlm_judge.sql` + `app/api/document-vlm-judge/route.ts`
- `tests/document-vlm-judge.test.ts` (12)

---

## 최종 검증 (2026-08-10)

```
npm run verify → exit 0
  check:design  Design system check passed (86 files)
  lint          0 errors, 0 warnings
  typecheck     0 errors
  test:unit     174 tests, 174 pass, 0 fail   (착수 시 81)
  build         ✓ Compiled successfully
git diff --check → clean
```

## 적용 필요 (사용자 조치)

```bash
supabase db push --linked   # 신규 마이그레이션 4건
```

## 남은 항목

- **메모리 프로바이더 연동** — AGENTS.md가 "별도 승인된 기능 + 아키텍처 변경"으로 게이트한 유일한 항목.
  Phase 6에서 측정 그릇(세션·턴)까지만 만들었고, 영속화·추출·외부 메모리 서비스는 손대지 않음.
  진행하려면 명시적 결정 필요.
- `components/connect/LicensesPanel.tsx` 859줄 — 800줄 상한 초과. 이번 작업 범위 밖이라 미변경.
- 비-1024 등 서드파티 임베딩(BGE-M3, multilingual-e5) — 새 공급사 어댑터가 선행되어야 함.
  차원 인프라는 준비 완료라 컬럼·인덱스 추가만으로 확장 가능.
- 런타임 통합 검증 — Supabase 연결과 공급사 키가 필요해 미수행. 위 결과는 정적 검증 기준.
