# Text Splitter & Document Parser

LangChain 기반 텍스트 분할 및 문서 파싱을 시각적으로 테스트할 수 있는 Next.js 웹 애플리케이션입니다.

## 주요 기능

### 📄 Text Splitter

다양한 LangChain 텍스트 스플리터를 실시간으로 테스트하고 결과를 시각화합니다.

**지원 스플리터:**

- **Recursive Character Text Splitter** - 계층적 구분자를 사용한 자연스러운 분할 (권장)
- **Character Text Splitter** - 단일 구분자 기반 분할
- **Token Text Splitter** - OpenAI 토큰 기반 정확한 분할
- **Sentence Transformers Token Text Splitter** - Sentence Transformers 모델용 분할
- **Code Splitter** - 프로그래밍 언어별 최적화된 코드 분할
- **Semantic Chunker** - 의미론적 유사도 기반 지능형 분할

### 🔍 Document Parser

다양한 AI 파서를 사용하여 PDF, 이미지, 문서 파일을 텍스트로 변환합니다.

**지원 파서:**

- **Upstage Document AI** - PDF, 이미지 파싱
- **LlamaIndex (LlamaParse v2)** - Fast, Cost Effective, Agentic, Agentic Plus 티어 기반 파싱
- **Azure Document Intelligence** - Microsoft Azure 기반 문서 파싱
- **Google Document AI** - Google Cloud 기반 문서 파싱
- **Docling** - 자체 호스팅 가능한 문서 구조·표·레이아웃 파싱

OCR과 문서 파싱은 별도 단계로 취급합니다. 이미지 기반 문서는 필요할 때 OCR로 문자를 인식한 뒤, 선택한 파서가 문서 구조와 표·레이아웃을 해석합니다. Upstage, LlamaParse, Docling의 OCR 관련 항목은 독립 파서가 아니라 해당 파서의 전처리 옵션입니다.

모든 새 파싱 실행은 공급사 응답과 함께 공통 `Document IR`로 정규화됩니다. Document IR은 페이지, 블록 유형, 읽기 순서, 좌표, 표 셀과 신뢰도를 보존하며 향후 원본 오버레이와 다중 엔진 비교의 기준으로 사용됩니다.

같은 문서에 여러 엔진을 체크해 순차 배치 실행할 수 있습니다. 한 엔진이 실패해도 성공한 실행은 비교 후보로 유지되며, 실패 원인은 엔진별로 요약됩니다.

### 📁 Files (파일 관리)

- 외부 Storage API와 연동한 파일 업로드/다운로드/삭제 기능
- 파일 검색 및 브라우징
- 폴더 구조 탐색 (브레드크럼 네비게이션)
- 파일 미리보기 (PDF, 이미지 등)
- 파일 크기 및 업로드 시간 표시
- Parser에서 Files 탭의 파일을 직접 선택하여 파싱 가능

### 💾 Storage (결과 저장 및 관리)

- 파싱 결과, 분할 결과, 암호화된 공급사 자격 증명을 전용 Supabase PostgreSQL에 저장
- Parse Results와 Split Results를 탭으로 분리하여 표시
- **Parse Result Detail 페이지**: 원본 파일과 파싱 결과를 나란히 표시
  - 좌측: 원본 파일 미리보기 (PDF, 이미지)
  - 우측: 편집 가능한 파싱 결과
  - LlamaParse의 페이지별 편집 지원 (text/markdown 모드 전환)
- **Sync Storage 기능**: Files storage와 Parse Results 동기화
  - 파일명 매칭으로 자동 연결
  - 원본 파일 미리보기 활성화
- **Check DB 기능**: Supabase 애플리케이션 스키마 상태 확인
- 저장된 결과 조회, 상세보기, 편집, 삭제 기능
- 페이지네이션 지원 (20개/페이지)
- Full-height 테이블 레이아웃

### 🗄️ Vector Database

- Supabase (PostgreSQL with pgvector) 벡터 데이터베이스 연결 및 관리
- **컬렉션 생성/삭제**: VDB 페이지에서 사용자별 벡터 컬렉션 생성 및 삭제
- **Split Results 업로드**: Storage 페이지에서 청킹 결과를 벡터 스토어에 업로드
  - OpenAI 임베딩 자동 생성 (`text-embedding-3-small`, 1536차원)
  - 메타데이터 JSONB 형식 저장
  - 배치 처리로 rate limit 관리 (1-100 chunks/batch)
  - 드롭다운으로 컬렉션 선택
- 관리형 스키마 및 컬렉션 탐색
- 벡터 데이터 시각화
- 공용 owner-scoped cosine 검색 RPC와 RAG 테스트
- 검색 근거, 인용, 요청/응답 모델, 프롬프트 버전, 토큰, 지연시간을 실행 기록으로 저장

### ✅ Evaluation

- 골든셋 데이터셋과 불변 버전 관리
- 질문, 기준 답변/사실, 답변 가능 여부, 문서·페이지·블록·청크 기대 근거, 태그, 난이도, 루브릭 작성
- 선택한 케이스를 하나의 VDB·임베딩·생성 모델·Reasoning·Top K 설정으로 실행
- 실행 시작 시 데이터셋 버전을 자동 동결하고 케이스와 RAG 결과를 스냅샷으로 저장
- 기준 답변과 실제 답변, 기대 근거와 검색 근거를 나란히 검토
- Correctness, Faithfulness, Citation quality 1–5점과 Pass/Fail, 리뷰 노트 기록
- 저장된 Document IR을 교정 가능한 문서 기준 정답으로 만들고 버전별 Draft/Freeze 관리
- 같은 원본의 파서 결과를 텍스트, 블록, 읽기 순서, 영역 IoU, 표 셀, 그림·캡션 재현율, provenance로 비교
- 페이지별 오류와 기준/후보 블록을 함께 확인하며 평가 실행 스냅샷과 이슈를 기록

### 🔐 API 키 관리

- 전용 Supabase 데이터베이스에 암호화된 API 키 및 자격 증명 저장
- 사용자별 안전한 키 관리
- Supabase Auth 이메일·비밀번호 로그인 및 세션 자동 갱신
- 모든 보호 API에서 Supabase Auth 서버로 access token 검증
- Google Document AI: Service Account 인증 (Email + Private Key)

## 기술 스택

### Frontend

- **Framework**: Next.js 16 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **UI**: React 19

### Backend

- **API Routes**: Next.js API Routes
- **Application Database**: Supabase PostgreSQL
- **Encryption**: Node.js Crypto (AES-256-GCM, legacy CBC read compatibility)
- **Authentication**: JWT

### Libraries

- **Text Processing**: LangChain, @langchain/textsplitters
- **Token Encoding**: js-tiktoken
- **Database Client**: @supabase/supabase-js
- **Document Parsing**: Upstage, LlamaParse v2, Azure AI, Google Document AI, Docling
- **UI Components**: @uiw/react-json-view (JSON 뷰어)
- **Storage Integration**: Supabase Storage private bucket with per-user paths

## 시작하기

### 필수 요구사항

- Node.js 20.9 이상
- Supabase CLI와 전용 Supabase 프로젝트
- npm 또는 yarn

### 설치

```bash
# 저장소 클론
git clone <repository-url>
cd text_spliter

# 의존성 설치
npm install
```

### 환경 변수 설정

`.env.local` 파일을 생성하고 다음 내용을 입력합니다:

```env
# OpenAI API Key (for embeddings, VDB upload, and RAG answer generation)
OPENAI_API_KEY=your_openai_api_key

# Application Database (server only)
APP_SUPABASE_URL=https://your-project-ref.supabase.co
APP_SUPABASE_SECRET_KEY=sb_secret_your_server_secret

# Supabase Auth (browser-safe)
NEXT_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_your_public_key

# OpenAI 키는 환경 변수 또는 Connect > AI Models에서 설정합니다.

# Encryption Key (32 bytes)
ENCRYPTION_KEY=your_32_byte_encryption_key
```

### 데이터베이스 설정

애플리케이션 DB와 Vector Store는 같은 Supabase 프로젝트를 사용합니다. Vector Store는 사용자별 `vector_collections`와 `vector_documents`로 격리되며, 브라우저에 Secret Key를 노출하거나 Connect에 Supabase 키를 중복 저장하지 않습니다.

```bash
# 최초 1회 인증 및 프로젝트 연결
supabase login
supabase link --project-ref <application-project-ref>

# 버전 관리되는 스키마 적용
supabase db push --linked
```

스키마 원본은 `supabase/migrations/`에 있습니다. `public` 스키마의 앱 테이블에는 RLS가 활성화되어 있으며 서버 전용 Secret Key를 사용하는 API Route만 접근합니다. 문서 원본은 Supabase Storage의 비공개 `documents` 버킷에 저장되고, 객체 경로의 첫 디렉터리는 Supabase Auth 사용자 UUID로 제한됩니다.

**주요 테이블:**

- `user_api_keys` - 암호화된 API 키 저장
- `parse_results` - 문서 파싱 결과 저장
- `split_results` - 텍스트 분할 결과 저장
- `rag_runs` - 검색 설정·검색 문맥·답변·인용·토큰·지연시간을 포함한 RAG 실행 기록
- `evaluation_datasets` / `evaluation_dataset_versions` - 골든셋과 불변 버전
- `evaluation_cases` - 질문, 기준 정답·사실·기대 근거·루브릭
- `evaluation_runs` / `evaluation_case_runs` - 평가 실행, RAG 결과 연결, 사람 점수와 판정
- `evaluation_judge_batches` / `evaluation_judge_case_runs` - Ragas 모델 평가 설정·점수·판정 근거·프롬프트·사용량 이력
- `document_evaluation_benchmarks` / `document_evaluation_ground_truths` - 문서 기준셋과 교정·동결된 Document IR 버전
- `document_evaluation_runs` - 파서 후보의 기준/결과 스냅샷, 결정적 지표, 페이지·블록 이슈
- `storage.objects` / `documents` bucket - 사용자별 문서 원본 저장

### 개발 서버 실행

```bash
# 최초 1회 Ragas Python 워커 설치
npm run ragas:setup

# 연결된 Supabase 프로젝트의 서버·브라우저 키를 메모리로만 주입
npm run dev:supabase
```

`dev:supabase`는 워커 환경이 설치되어 있으면 `127.0.0.1:8001`에서 Ragas를 함께 실행하고 임의의 내부 토큰을 Next.js 서버와만 공유합니다. 별도 배포 워커는 `RAGAS_WORKER_URL`과 `RAGAS_WORKER_TOKEN`으로 연결합니다.

브라우저에서 [http://localhost:3000](http://localhost:3000)을 엽니다.

### 프로덕션 빌드

```bash
# 빌드
npm run build

# 프로덕션 서버 실행
npm start
```

## 사용 방법

### 1. 로그인 및 회원가입

- `/login`에서 Supabase Auth 이메일·비밀번호 로그인 또는 회원가입
- access token은 보호 API 요청에 전달되며 서버가 Supabase Auth를 통해 사용자를 검증
- 브라우저에는 publishable key만 제공되고 Supabase Secret Key는 서버에만 유지
- 로그아웃 시 로컬 Supabase 세션과 호환 토큰을 함께 제거

### 2. API 키 설정 (Connect 탭)

- 각 파서의 API 키를 입력
- **Google Document AI**: Service Account 인증 사용
  - Service Account Email (JSON key file의 `client_email`)
  - Private Key (JSON key file의 `private_key`)
  - Project ID, Location, Processor ID
- **Save** 버튼 클릭으로 데이터베이스에 암호화하여 저장
- 입력값을 비우고 Save하면 해당 자격 증명을 삭제하며, Reset은 사용자의 Connect 설정 전체를 삭제
- Test는 저장 전 현재 입력값으로 연결을 검증하므로 테스트만으로 키가 저장되지는 않음
- 페이지 새로고침 시 자동으로 불러옴

### 3. Text Splitter 사용

1. **텍스트 입력**: Upload 또는 Plain Text 탭에서 텍스트 입력
2. **스플리터 선택**: 원하는 분할 방식 선택
3. **파라미터 설정**: Chunk Size, Overlap 등 조정
4. **Split Text 실행**: 결과를 카드 뷰 또는 JSON 뷰로 확인
5. **결과 저장**: Save 버튼으로 분할 결과를 데이터베이스에 저장

### 4. Document Parser 사용

1. **파서 선택**: 사용할 AI 파서 선택
2. **API 키 입력**: 해당 파서의 API 키 입력 (저장된 키 자동 로드)
   - Google Document AI는 Service Account 정보가 자동으로 로드됨
3. **파일 업로드**: PDF, 이미지 등 문서 파일 선택
4. **Parse Document 실행**: 파싱 결과와 공통 Document IR, 원본 응답 확인
5. **Experiment batch**: 비교할 엔진을 여러 개 선택해 같은 파일에 순차 실행하거나, 옵션을 바꿔 실행 결과 누적
6. **Compare**: 원본과 결과 A/B를 나란히 비교하고 우수 결과 선택
7. **결과 저장**: 선택한 결과를 Save 버튼으로 데이터베이스에 저장

### 5. Files (파일 관리)

1. **Files 탭**: 업로드된 파일 목록 확인
2. **파일 업로드**: Upload 버튼으로 새 파일 추가
3. **파일 검색**: 검색창에서 파일명으로 검색
4. **폴더 탐색**: 브레드크럼 네비게이션으로 폴더 구조 탐색
5. **파일 미리보기**: 파일 클릭으로 새 탭에서 미리보기
6. **파일 다운로드**: 점 3개 메뉴에서 Download 선택
7. **파일 삭제**: 점 3개 메뉴에서 Delete 선택
8. **Parser 연동**: Parser 탭에서 Files의 파일을 직접 선택하여 파싱 가능

### 6. Storage (저장된 결과 관리)

1. **Storage 탭**: 저장된 결과 목록 확인
2. **Parse Results / Split Results**: 탭 전환으로 결과 유형 선택
3. **View**: 저장된 결과의 상세 내용 확인
4. **Delete**: 불필요한 결과 삭제
5. **Pagination**: 페이지 단위로 결과 탐색

### 7. Parse Result Detail (상세보기)

1. **Storage 탭 → Parse Results**: 저장된 파싱 결과 목록
2. **View 버튼 클릭**: 상세 페이지로 이동
3. **좌측 패널**: 원본 파일 미리보기
   - PDF: iframe으로 표시
   - 이미지: 확대/축소 가능한 이미지 뷰어
   - 파일이 없는 경우: 파일 정보 표시
4. **우측 패널**: 파싱 결과 편집
   - LlamaParse: 페이지별 편집 (text/markdown 전환)
   - 기타 파서: 전체 내용 편집
5. **Save Changes**: 편집 내용 저장
6. **뒤로가기**: Storage 탭으로 복귀

### 8. Sync Storage (파일 동기화)

1. **Storage 탭 → Parse Results**: Parse Results 탭 선택
2. **Sync Storage 버튼**: 파일 동기화 실행
3. **동기화 프로세스**:
   - Parse Results의 파일명과 Supabase Storage 문서 매칭
   - `file_storage_key` 자동 설정
   - 원본 파일 미리보기 활성화
4. **동기화 결과**: 성공한 매칭 수와 세부 정보 표시

### 9. Check DB (데이터베이스 마이그레이션)

1. **Storage 탭 → Parse Results**: Parse Results 탭 선택
2. **Check DB 버튼**: 데이터베이스 마이그레이션 확인
3. **자동 마이그레이션**:
   - 파일 저장 키와 Parse Run 컬럼·인덱스 존재 여부 확인
   - 실행 ID, 문서 해시, 엔진·모델·버전, 설정 스냅샷 추가
   - 공통 Document IR과 원본 공급사 응답 저장 컬럼 추가
4. **완료 후**: Sync Storage 실행 가능

### 10. Vector Database (VDB)

1. **컬렉션 생성 (VDB 탭)**:
   - Create Collection (+) 버튼 클릭
   - 컬렉션명 입력 (영문자로 시작, 소문자/숫자/언더스코어만 사용)
   - 임베딩은 `text-embedding-3-small`, 1536차원으로 고정
2. **컬렉션 삭제**:
   - 컬렉션 hover 시 나타나는 삭제 아이콘 클릭
   - 확인 후 컬렉션과 소속 벡터 문서를 함께 삭제
3. **Split Results 업로드 (Storage 탭)**:
   - Split Results에서 업로드할 결과의 "Upload to VDB" 아이콘 클릭
   - 드롭다운에서 대상 컬렉션 선택
   - Batch Size 설정 (1-100, 기본값: 10)
   - Upload to VDB 버튼으로 업로드 실행
   - OpenAI API를 통해 자동으로 임베딩 생성 후 Supabase에 저장
4. **컬렉션 탐색**: 좌측 패널의 `vector_store` 스키마에서 컬렉션 선택
5. **벡터 데이터 조회**: 우측 패널에서 콘텐츠와 메타데이터 확인
6. **RAG 테스트**:
   - 질문, Embedding, Answer model, Reasoning, Top K를 설정하고 `Run RAG` 실행
   - 답변과 인용된 검색 근거, cosine 유사도, 토큰, 지연시간 확인
   - 실행 조건과 결과는 애플리케이션 Supabase의 `rag_runs`에 저장

**업로드 프로세스:**

- 각 chunk의 content에 대해 `text-embedding-3-small` embedding 생성
- 메타데이터 자동 생성 (문서/파싱/청킹 provenance, content hash, embedding model/dimensions)
- `vector_documents`에 owner, collection, content, embedding, metadata 저장
- 배치 처리로 rate limit 회피

### 11. Evaluation

1. 사이드바의 `Eval` 메뉴에서 `New dataset`으로 골든셋을 만듭니다.
2. Draft 버전에 질문, 기준 답변/사실, 기대 근거와 리뷰 루브릭을 작성합니다.
3. 실행할 케이스를 선택하고 `Run selected`에서 벡터 컬렉션과 모델 설정을 지정합니다.
4. 실행을 시작하면 버전이 자동으로 Frozen 상태가 되며 각 케이스가 순차 실행됩니다.
5. `Runs` 탭에서 기준/실제 답변과 기대/검색 근거를 비교합니다.
6. Correctness, Faithfulness, Citation quality와 Pass/Fail을 저장합니다.
7. 골든셋을 수정하려면 `Create next version`으로 새 Draft를 생성합니다.

문서 파서 자체를 평가하려면 다음 순서로 진행합니다.

1. `Documents` 탭에서 저장된 파싱 결과를 골라 문서 벤치마크를 만듭니다.
2. 원본 미리보기와 Reference Document IR을 나란히 보며 블록, 순서, 영역과 표 셀을 교정합니다.
3. 초안을 저장한 뒤 `Freeze reference`로 해당 기준 버전을 고정합니다.
4. 같은 문서 해시의 다른 파서 실행을 선택하고 평가합니다.
5. 텍스트·구조·순서·영역·표·그림·provenance 지표와 페이지별 이슈를 확인합니다.
6. 기준을 수정하려면 `Create next version`으로 새 Draft를 만듭니다. 과거 실행의 기준/후보 스냅샷은 바뀌지 않습니다.

평가 케이스마다 OpenAI embedding과 Responses API 호출 비용이 발생합니다. 벡터 검색 RPC는 Supabase 마이그레이션으로 함께 설치됩니다.
문서 파서 평가는 저장된 Document IR에 대해 로컬 결정적 계산만 수행하므로 외부 모델 호출 비용이 없습니다.

## 프로젝트 구조

```text
text_spliter/
├── app/                    # Next.js pages and authenticated API routes
│   ├── api/                # keys, parsing, storage, splitting, and VDB APIs
│   └── login/              # Supabase Auth page
├── components/
│   ├── connect/            # AI/parser provider credentials
│   ├── layout/             # shell, navigation, and auth boundary
│   ├── parser/             # parser controls, results, and comparison
│   ├── shared/             # cross-feature UI primitives
│   ├── splitter/           # chunking controls and results
│   ├── storage/            # source files and saved experiments
│   └── vectorstore/        # VDB browser and uploader
├── lib/                    # domain logic, shared contracts, and Supabase clients
├── public/logos/           # provider logos
├── scripts/                # local development helpers
├── supabase/migrations/    # versioned database and Storage changes
└── docs/
    ├── ARCHITECTURE.md
    └── ROADMAP.md
```

구체적인 책임 경계와 데이터 흐름은 [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md), 다음 구현 순서는 [`docs/ROADMAP.md`](docs/ROADMAP.md)를 참고하세요.

## API 엔드포인트

### Text Splitter

#### POST /api/split

텍스트를 분할합니다.

**Request:**

```json
{
  "text": "분할할 텍스트",
  "config": {
    "splitterType": "RecursiveCharacterTextSplitter",
    "chunkSize": 1000,
    "chunkOverlap": 200
  }
}
```

### Document Parser

#### POST /api/parse

문서를 파싱합니다.

**Request:** `multipart/form-data`

- `file`: 파싱할 문서 파일
- `parserType`: 사용할 파서 (Upstage, LlamaIndex, Azure, Google, Docling)
- 파서 자격 증명과 엔드포인트는 Connect 화면에 저장된 사용자 설정을 사용
- LlamaParse v2: `llamaTier`, `llamaVersion`, `pageRange`, `language`(OCR 옵션)
- Docling: `doclingOutputFormat`, `doclingPipeline`, `doclingTableMode`, `doclingOcrMode`, `language`(OCR 옵션)

응답에는 가능한 출력 형식(`text`, `html`, `markdown`, `json`)과 공통 `metadata`가 포함됩니다. LlamaParse처럼 페이지 정보를 제공하는 파서는 정규화된 `pages` 배열도 반환합니다.

### Parse Results (Storage)

#### GET /api/parse-results

저장된 파싱 결과를 조회합니다.

**Headers:** `Authorization: Bearer <token>`
**Query:** `?limit=20&offset=0` 또는 `?id=123`

#### POST /api/parse-results

파싱 결과를 저장합니다.

**Headers:** `Authorization: Bearer <token>`

#### PUT /api/parse-results

파싱 결과를 수정합니다.

**Headers:** `Authorization: Bearer <token>`

**Request:**

```json
{
  "id": 123,
  "text_content": "Updated content...",
  "json_content": "{...}"
}
```

#### DELETE /api/parse-results

파싱 결과를 삭제합니다.

**Headers:** `Authorization: Bearer <token>`
**Query:** `?id=123`

#### POST /api/parse-results/sync-storage

Parse Results를 Storage의 파일과 동기화합니다.

**Headers:** `Authorization: Bearer <token>`

**Response:**

```json
{
  "message": "Successfully synced 15 parse results",
  "updated": 15,
  "total": 20,
  "matches": [
    {
      "id": 1,
      "key": "path/to/file.pdf",
      "fileName": "file.pdf"
    }
  ]
}
```

**Note:** 사용자 UUID 경로 안의 파일명을 매칭해 `file_storage_key`를 설정하고 원본 미리보기를 활성화합니다.

#### GET /api/parse-results/migrate

데이터베이스 마이그레이션을 확인하고 실행합니다.

**Headers:** `Authorization: Bearer <token>`

### Split Results (Storage)

#### GET /api/split-results

저장된 분할 결과를 조회합니다.

**Headers:** `Authorization: Bearer <token>`
**Query:** `?limit=20&offset=0` 또는 `?id=123`

#### POST /api/split-results

분할 결과를 저장합니다.

**Headers:** `Authorization: Bearer <token>`

#### DELETE /api/split-results

분할 결과를 삭제합니다.

**Headers:** `Authorization: Bearer <token>`
**Query:** `?id=123`

### Supabase Storage API (파일 관리)

모든 파일 API는 비공개 `documents` 버킷을 사용하며, 인증 사용자는 자신의 UUID 경로에 있는 문서만 조회하거나 변경할 수 있습니다.

#### GET /api/storage/files

파일 목록을 조회합니다.

**Headers:** `Authorization: Bearer <token>`

**Response:**

```json
{
  "files": [
    {
      "id": "storage-object-uuid",
      "filename": "document.pdf",
      "storage_key": "auth-user-uuid/sha256-document.pdf",
      "file_size": 1024000,
      "uploaded_at": "2024-01-01T00:00:00Z"
    }
  ],
  "total": 100,
  "bucket": "documents"
}
```

#### DELETE /api/storage/files

파일을 삭제합니다.

**Headers:** `Authorization: Bearer <token>`
**Query:** `?filename=<storage_key>`

#### POST /api/storage/upload

파일을 업로드합니다.

**Headers:** `Authorization: Bearer <token>`
**Request:** `multipart/form-data`

- `file`: 업로드할 파일

#### GET /api/storage/download/[filename]

파일을 다운로드합니다.

**Headers:** `Authorization: Bearer <token>`

**Response:** File blob with appropriate content-type

#### GET /api/storage/preview

파일 미리보기를 가져옵니다.

**Headers:** `Authorization: Bearer <token>`
**Query:** `?key=<file_storage_key>`

**Response:** File blob (PDF, 이미지 등)

**Note:**

- PDF: iframe으로 표시
- 이미지: img 태그로 표시
- 최대 파일 크기 제한 적용

#### POST /api/storage/buckets

공용 비공개 `documents` 버킷이 준비되었는지 확인합니다. 문서는 버킷을 사용자마다 나누지 않고 UUID 경로와 RLS로 격리합니다.

**Headers:** `Authorization: Bearer <token>`

**Response:**

```json
{
  "bucket": "documents",
  "private": true,
  "ready": true
}
```

#### GET /api/storage/buckets

문서 버킷과 현재 사용자의 전용 객체 경로를 조회합니다.

**Headers:** `Authorization: Bearer <token>`

### Vector Database

#### GET /api/vectorstore/schemas

Supabase 스키마 및 테이블 목록을 조회합니다.

**Headers:** `Authorization: Bearer <token>`

**Response:**

```json
[
  {
    "name": "vector_store",
    "tables": [
      {
        "name": "my_vectors",
        "schema": "vector_store",
        "rowCount": 150,
        "columns": [...]
      }
    ]
  }
]
```

**Note:** 로그인 사용자의 앱 Supabase 컬렉션만 반환합니다. 별도 Supabase 자격 증명은 필요하지 않습니다.

#### GET /api/vectorstore/table-data

선택한 컬렉션의 벡터 문서 데이터를 조회합니다. 임베딩 원문은 응답에서 제외합니다.

**Headers:** `Authorization: Bearer <token>`
**Query:** `?table=<table_name>&schema=<schema_name>`

#### POST /api/vectorstore/tables

사용자 소유 벡터 컬렉션을 생성합니다.

**Headers:** `Authorization: Bearer <token>`

**Request:**

```json
{
  "tableName": "my_documents",
  "vectorDimension": 1536
}
```

**Response:**

```json
{
  "success": true,
  "message": "Collection 'my_documents' created successfully",
  "schema": "vector_store",
  "tableName": "my_documents",
  "vectorDimension": 1536
}
```

**Note:**

- 모든 컬렉션은 공용 `vector_documents` 테이블에 `owner_id`와 `collection_id`로 격리
- pgvector extension과 HNSW cosine 인덱스는 마이그레이션에서 설치
- 검색은 owner/collection ID를 필수로 받는 공용 RPC 사용

#### DELETE /api/vectorstore/tables

벡터 컬렉션과 그 컬렉션에 속한 문서를 삭제합니다.

**Headers:** `Authorization: Bearer <token>`
**Query:** `?tableName=<table_name>`

**Response:**

```json
{
  "success": true,
  "message": "Collection 'my_documents' deleted successfully"
}
```

#### POST /api/vectorstore/upload

Split Results를 벡터 데이터베이스에 업로드합니다.

**Headers:** `Authorization: Bearer <token>`

**Request:**

```json
{
  "splitResultId": 123,
  "tableName": "my_documents",
  "batchSize": 10
}
```

**Response:**

```json
{
  "success": true,
  "message": "Successfully uploaded 50 chunks to collection 'my_documents'",
  "chunksUploaded": 50,
  "tableName": "my_documents"
}
```

**Process:**

1. Split Result를 애플리케이션 Supabase DB에서 조회
2. 각 chunk에 대해 OpenAI embedding 생성 (`text-embedding-3-small`, 1536차원)
3. 메타데이터 생성:

   ```json
   {
     "source": "split_result_123",
     "splitter_type": "RecursiveCharacterTextSplitter",
     "chunk_size": 1000,
     "chunk_overlap": 200,
     "chunk_index": 0
   }
   ```

4. 관리형 `vector_documents`에 upsert (content, embedding, metadata)
5. 배치 처리로 rate limit 관리

#### POST /api/vectorstore/search

선택한 관리형 컬렉션과 검색 RPC 준비 상태를 확인합니다. 별도 SQL 실행은 필요하지 않습니다.

#### GET /api/rag/runs

현재 사용자의 저장된 RAG 실행 이력을 조회합니다.

#### POST /api/rag/runs

질문 임베딩, pgvector 검색, 근거 기반 답변 생성을 실행하고 전체 trace를 `rag_runs`에 저장합니다. API 키 원문은 실행 기록에 포함하지 않습니다.

**Required API Keys:**

- OpenAI API Key (임베딩 및 RAG 답변 생성용)

### Evaluation

#### GET /api/evaluation

현재 사용자의 데이터셋, 버전, 케이스, 평가 실행, Ragas 판정 배치와 케이스 실행을 하나의 평가 워크스페이스로 조회합니다.

#### POST /api/evaluation

데이터셋·케이스 CRUD, 버전 복제, 평가 실행 생성, RAG 실행 연결, 수동 리뷰와 Ragas 배치 실행을 `action` 단위로 처리합니다. RAG 결과를 연결하면 Recall@K, Precision@K, Hit Rate, MRR, nDCG@K와 인용 정밀도·재현율을 계산하고, 선택한 기준 실행 대비 회귀도 판정합니다. 완료된 결과에는 Faithfulness, Answer relevancy, Context precision/recall을 별도 모델 판정 이력으로 기록할 수 있습니다. 모든 행은 Supabase Auth 사용자 UUID로 범위를 제한합니다.

#### GET /api/document-evaluation

현재 사용자의 문서 벤치마크, 기준 버전 요약, 평가 실행 요약과 평가 가능한 파서 후보를 조회합니다. `groundTruthId` 또는 `runId`를 전달하면 큰 Document IR 및 이슈 스냅샷은 선택한 항목에 대해서만 반환합니다.

#### POST /api/document-evaluation

문서 벤치마크 생성·삭제, 기준 IR 수정·동결·버전 복제와 파서 후보 평가를 `action` 단위로 처리합니다. 기준과 후보는 같은 원본 문서 해시여야 하며, 평가는 `document-ir-eval-v1` 계약의 독립 지표와 이슈를 저장합니다.

### API 키 관리

#### GET /api/keys

사용자의 저장된 API 키를 조회합니다.

**Headers:** `Authorization: Bearer <token>`

#### POST /api/keys

API 키를 저장하거나 업데이트합니다.

**Headers:** `Authorization: Bearer <token>`

**Request:**

```json
{
  "openaiEmbedding": "sk-...",
  "upstageParser": "up_...",
  "llamaParser": "llx-...",
  "azureParserKey": "...",
  "azureParserEndpoint": "https://...",
  "googleParserServiceAccountEmail": "...@...iam.gserviceaccount.com",
  "googleParserPrivateKey": "-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----",
  "googleParserProjectId": "...",
  "googleParserLocation": "us",
  "googleParserProcessorId": "..."
}
```

**Note:** Google Document AI는 Service Account 인증을 사용하며,
Private Key는 PEM 형식의 전체 키를 포함해야 합니다.

## 보안

- **암호화**: 모든 API 키 및 자격 증명은 인증 태그가 포함된 AES-256-GCM으로 암호화되어 저장
- **민감 정보 마스킹**: UI에서 모든 API 키와 Private Key는 마스킹 처리
- **Service Account 보안**: Google Document AI Private Key는 PEM 형식으로 암호화 저장
- **인증**: JWT 토큰 기반 사용자 인증
- **데이터베이스**: 사용자별 격리된 키 저장
- **Storage API 프록시**: Next.js API Routes를 통한 안전한 외부 API 호출
- **파일 접근 제어**: 사용자별 토큰 기반 파일 접근 권한
- **HTTPS**: 프로덕션 환경에서는 반드시 HTTPS 사용 권장

## 제한사항

- 최대 입력 텍스트 길이: 100,000 문자
- 최대 파일 크기: 파서별로 상이 (일반적으로 10-100MB)
- Chunk Overlap은 Chunk Size보다 작아야 함
- Storage 파일 업로드: 외부 Storage API의 제한 준수
- 파일 미리보기: 대용량 파일의 경우 로딩 시간이 길어질 수 있음
- Sync Storage: 파일명 기반 매칭으로 정확한 파일명 필요
- VDB 업로드:
  - OpenAI API rate limits 적용 (배치 처리로 완화)
  - 대용량 청킹 결과 업로드 시 시간 소요
  - 임베딩 비용 발생 (OpenAI API 사용)
  - 최신 Supabase 마이그레이션 적용 필요

## 개발

### 린트

```bash
npm run lint
```

### 타입 체크

```bash
npm run type-check
```

## 로고 이미지

프로젝트는 다음 서비스의 로고를 사용합니다:

- OpenAI
- Upstage
- LlamaIndex
- Azure
- Google Cloud

모든 로고는 WebP 형식으로 최적화되어 있습니다.

## 라이선스

MIT

## 기여

이슈 및 풀 리퀘스트를 환영합니다!

## 문의

문제가 발생하거나 기능 제안이 있으시면 GitHub Issues를 통해 알려주세요.
