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
- **LlamaIndex (LlamaParse)** - PDF, DOCX, PPTX, 이미지 파싱
- **Azure Document Intelligence** - Microsoft Azure 기반 문서 파싱
- **Google Document AI** - Google Cloud 기반 문서 파싱

### 📁 Files (파일 관리)

- 외부 Storage API와 연동한 파일 업로드/다운로드/삭제 기능
- 파일 검색 및 브라우징
- 폴더 구조 탐색 (브레드크럼 네비게이션)
- 파일 미리보기 (PDF, 이미지 등)
- 파일 크기 및 업로드 시간 표시
- Parser에서 Files 탭의 파일을 직접 선택하여 파싱 가능

### 💾 Storage (결과 저장 및 관리)

- 파싱 결과 및 분할 결과를 MySQL에 저장
- Parse Results와 Split Results를 탭으로 분리하여 표시
- **Parse Result Detail 페이지**: 원본 파일과 파싱 결과를 나란히 표시
  - 좌측: 원본 파일 미리보기 (PDF, 이미지)
  - 우측: 편집 가능한 파싱 결과
  - LlamaParse의 페이지별 편집 지원 (text/markdown 모드 전환)
- **Sync Storage 기능**: Files storage와 Parse Results 동기화
  - 파일명 매칭으로 자동 연결
  - 원본 파일 미리보기 활성화
- **Check DB 기능**: 데이터베이스 마이그레이션 확인 및 실행
- 저장된 결과 조회, 상세보기, 편집, 삭제 기능
- 페이지네이션 지원 (20개/페이지)
- Full-height 테이블 레이아웃

### 🗄️ Vector Database

- Supabase (PostgreSQL with pgvector) 벡터 데이터베이스 연결 및 관리
- **테이블 생성/삭제**: VDB 페이지에서 벡터 테이블 생성 및 삭제
- **Split Results 업로드**: Storage 페이지에서 청킹 결과를 벡터 스토어에 업로드
  - OpenAI 임베딩 자동 생성 (text-embedding-ada-002)
  - 메타데이터 JSONB 형식 저장
  - 배치 처리로 rate limit 관리 (1-100 chunks/batch)
  - 드롭다운으로 테이블 선택
- 스키마 및 테이블 탐색
- 벡터 데이터 시각화

### 🔐 API 키 관리

- MySQL 데이터베이스에 암호화된 API 키 및 자격 증명 저장
- 사용자별 안전한 키 관리
- 로그인 기반 인증 시스템
- Google Document AI: Service Account 인증 (Email + Private Key)

## 기술 스택

### Frontend

- **Framework**: Next.js 15 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **UI**: React 18

### Backend

- **API Routes**: Next.js API Routes
- **Database**: MySQL
- **Encryption**: Node.js Crypto (AES-256-CBC)
- **Authentication**: JWT

### Libraries

- **Text Processing**: LangChain, @langchain/textsplitters
- **Token Encoding**: js-tiktoken
- **Database**: mysql2
- **Document Parsing**: Upstage, LlamaIndex, Azure AI, Google AI
- **UI Components**: @uiw/react-json-view (JSON 뷰어)
- **Storage Integration**: External Storage API (S3-compatible)

## 시작하기

### 필수 요구사항

- Node.js 18 이상
- MySQL 데이터베이스
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
# OpenAI API Key (for embeddings and VDB upload)
OPENAI_API_KEY=your_openai_api_key

# MySQL Database Configuration (API keys, Parse/Split Results)
DB_HOST=your_mysql_host
DB_PORT=3306
DB_NAME=your_mysql_database
DB_USER=your_mysql_user
DB_PASSWORD=your_mysql_password

# Supabase Configuration (Vector Database - optional)
# Note: Supabase URL and Key are stored in the database via Connect page
# No environment variables needed for Supabase
# OpenAI API Key is also stored in the database and used for VDB uploads

# Storage API Configuration (External Storage Service)
STORAGE_API_BASE=http://ywstorage.synology.me:4000
STORAGE_DEFAULT_BUCKET=loan-agent-files

# Encryption Key (32 bytes)
ENCRYPTION_KEY=your_32_byte_encryption_key
```

### 데이터베이스 설정

MySQL 데이터베이스에 필요한 테이블을 생성합니다.

제공된 SQL 스크립트를 실행합니다:

```bash
# API 키 관리 테이블
mysql -h your_host -P 3306 -u your_user -p your_database < scripts/schema.sql

# Parse Results 저장 테이블
mysql -h your_host -P 3306 -u your_user -p your_database < scripts/parse_results_schema.sql

# Split Results 저장 테이블
mysql -h your_host -P 3306 -u your_user -p your_database < scripts/split_results_schema.sql
```

또는 Node.js 스크립트로 테이블 생성:

```bash
# Split Results 테이블 생성
node scripts/create-split-results-table.js
```

**주요 테이블:**

- `user_api_keys` - 암호화된 API 키 저장
- `parse_results` - 문서 파싱 결과 저장
- `split_results` - 텍스트 분할 결과 저장

### 개발 서버 실행

```bash
npm run dev
```

브라우저에서 [http://localhost:3000](http://localhost:3000)을 엽니다.

### 프로덕션 빌드

```bash
# 빌드
npm run build

# 프로덕션 서버 실행
npm start
```

## 사용 방법

### 1. 로그인

- `/login` 페이지에서 이메일과 비밀번호로 로그인
- JWT 토큰이 localStorage에 저장됨

### 2. API 키 설정 (Connect 탭)

- 각 파서의 API 키를 입력
- **Google Document AI**: Service Account 인증 사용
  - Service Account Email (JSON key file의 `client_email`)
  - Private Key (JSON key file의 `private_key`)
  - Project ID, Location, Processor ID
- **Save** 버튼 클릭으로 데이터베이스에 암호화하여 저장
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
4. **Parse Document 실행**: 파싱 결과를 Preview, HTML, JSON으로 확인
5. **결과 저장**: Save 버튼으로 파싱 결과를 데이터베이스에 저장

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
   - Parse Results의 파일명과 Files storage의 파일 매칭
   - `file_storage_key` 자동 설정
   - 원본 파일 미리보기 활성화
4. **동기화 결과**: 성공한 매칭 수와 세부 정보 표시

### 9. Check DB (데이터베이스 마이그레이션)

1. **Storage 탭 → Parse Results**: Parse Results 탭 선택
2. **Check DB 버튼**: 데이터베이스 마이그레이션 확인
3. **자동 마이그레이션**:
   - `file_storage_key` 컬럼 존재 여부 확인
   - 없으면 자동으로 컬럼 추가
4. **완료 후**: Sync Storage 실행 가능

### 10. Vector Database (VDB)

1. **Supabase 설정**: Connect 탭에서 Supabase URL과 Key 저장
2. **테이블 생성 (VDB 탭)**:
   - Create Table (+) 버튼 클릭
   - 테이블명 입력 (영문자로 시작, 영문/숫자/언더스코어만 사용)
   - Vector Dimension 설정 (기본값: 1536)
   - Create Table 버튼으로 생성
3. **테이블 삭제**:
   - 테이블 hover 시 나타나는 삭제 아이콘 클릭
   - 확인 후 테이블 삭제
4. **Split Results 업로드 (Storage 탭)**:
   - Split Results에서 업로드할 결과의 "Upload to VDB" 아이콘 클릭
   - 드롭다운에서 대상 테이블 선택
   - Batch Size 설정 (1-100, 기본값: 10)
   - Upload to VDB 버튼으로 업로드 실행
   - OpenAI API를 통해 자동으로 임베딩 생성 후 Supabase에 저장
5. **Schema 및 Table 탐색**: 좌측 패널에서 스키마와 테이블 선택
6. **벡터 데이터 조회**: 우측 패널에서 테이블 데이터 및 임베딩 확인

**업로드 프로세스:**

- 각 chunk의 content에 대해 OpenAI embedding 생성
- 메타데이터 자동 생성 (source, splitter_type, chunk_size, chunk_overlap, chunk_index)
- Supabase 테이블에 content, embedding, metadata 저장
- 배치 처리로 rate limit 회피

## 프로젝트 구조

```text
text_spliter/
├── app/                       # Next.js App Router
│   ├── api/
│   │   ├── keys/              # API 키 관리
│   │   │   └── route.ts
│   │   ├── parse/             # 문서 파싱
│   │   │   └── route.ts
│   │   ├── parse-results/     # Parse Results CRUD
│   │   │   ├── route.ts
│   │   │   ├── sync-storage/  # Storage 동기화
│   │   │   │   └── route.ts
│   │   │   └── migrate/       # DB 마이그레이션
│   │   │       └── route.ts
│   │   ├── split/             # 텍스트 분할
│   │   │   └── route.ts
│   │   ├── split-results/     # Split Results CRUD
│   │   │   └── route.ts
│   │   ├── storage/           # Storage API 프록시
│   │   │   ├── files/
│   │   │   │   └── route.ts   # 파일 목록/삭제
│   │   │   ├── upload/
│   │   │   │   └── route.ts   # 파일 업로드
│   │   │   ├── download/
│   │   │   │   └── [filename]/
│   │   │   │       └── route.ts  # 파일 다운로드
│   │   │   ├── preview/
│   │   │   │   └── route.ts   # 파일 미리보기
│   │   │   ├── buckets/
│   │   │   │   └── route.ts   # 버킷 관리
│   │   │   └── auth/
│   │   │       └── login/
│   │   │           └── route.ts  # Storage 로그인
│   │   └── vectorstore/       # Vector Database
│   │       ├── schemas/
│   │       │   └── route.ts   # 스키마/테이블 목록
│   │       ├── table-data/
│   │       │   └── route.ts   # 테이블 데이터 조회
│   │       ├── tables/
│   │       │   └── route.ts   # 테이블 생성/삭제
│   │       └── upload/
│   │           └── route.ts   # Split Results 업로드
│   ├── login/                 # 로그인 페이지
│   │   └── page.tsx
│   ├── layout.tsx
│   ├── page.tsx
│   └── globals.css
├── components/
│   ├── LeftPanel.tsx          # Text Splitter 입력 패널
│   ├── RightPanel.tsx         # Text Splitter 결과 패널
│   ├── ParserLeftPanel.tsx    # Document Parser 입력 패널
│   ├── ParserRightPanel.tsx   # Document Parser 결과 패널
│   ├── StoragePanel.tsx       # Storage 관리 패널
│   ├── FilesPanel.tsx         # Files 관리 패널
│   ├── ParseResultDetailPanel.tsx  # Parse 결과 상세보기
│   ├── VectorStoreLeftPanel.tsx   # VDB 조회 패널
│   ├── VectorStoreRightPanel.tsx  # VDB 데이터 패널
│   ├── LicensesPanel.tsx      # API 키 관리 패널
│   ├── Sidebar.tsx            # 네비게이션
│   ├── Header.tsx             # 페이지 헤더
│   ├── ErrorBoundary.tsx      # 에러 바운더리
│   ├── Modal.tsx              # 모달 컴포넌트
│   ├── Pagination.tsx         # 페이지네이션
│   └── ...
├── lib/
│   ├── types.ts               # TypeScript 타입
│   ├── splitters.ts           # 스플리터 로직
│   ├── db.ts                  # 데이터베이스 연결
│   ├── encryption.ts          # 암호화 유틸리티
│   ├── auth.ts                # 클라이언트 인증 유틸리티
│   ├── auth-server.ts         # 서버 인증 유틸리티
│   ├── storage-config.ts      # Storage API 설정
│   ├── constants.ts           # 애플리케이션 상수
│   ├── validation.ts          # 입력 검증
│   └── hooks/                 # Custom React hooks
├── scripts/
│   ├── schema.sql             # API 키 테이블 스키마
│   ├── parse_results_schema.sql   # Parse Results 스키마
│   ├── split_results_schema.sql   # Split Results 스키마
│   └── create-split-results-table.js  # 테이블 생성 스크립트
├── docs/                      # 문서
│   ├── PRD.md
│   ├── IMPLEMENTATION_PLAN.md
│   └── design-system.json
└── public/
    └── logos/                 # 파서 로고 이미지
```

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
- `parserType`: 사용할 파서 (Upstage, LlamaIndex, Azure, Google)
- `apiKey`: 파서 API 키
- 추가 파서별 파라미터

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

**Note:** 파일명 매칭을 통해 `file_storage_key`를 자동으로 설정하여 원본 파일 미리보기를 활성화합니다.

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

### Storage API (파일 관리)

#### GET /api/storage/files

파일 목록을 조회합니다.

**Headers:** `Authorization: Bearer <token>`

**Response:**

```json
{
  "files": [
    {
      "id": 1,
      "filename": "document.pdf",
      "file_size": 1024000,
      "uploaded_at": "2024-01-01T00:00:00Z"
    }
  ],
  "total": 100,
  "bucket": "loan-agent-files"
}
```

#### DELETE /api/storage/files

파일을 삭제합니다.

**Headers:** `Authorization: Bearer <token>`
**Query:** `?filename=document.pdf`

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

사용자별 버킷을 생성합니다.

**Headers:** `Authorization: Bearer <token>`

**Response:**

```json
{
  "bucket": "user-email-com",
  "message": "Bucket ready"
}
```

#### GET /api/storage/buckets

사용자의 버킷 이름을 조회합니다.

**Headers:** `Authorization: Bearer <token>`

### Vector Database

#### GET /api/vectorstore/schemas

Supabase 스키마 및 테이블 목록을 조회합니다.

**Headers:** `Authorization: Bearer <token>`

**Response:**

```json
[
  {
    "name": "public",
    "tables": [
      {
        "name": "my_vectors",
        "schema": "public",
        "rowCount": 150,
        "columns": [...]
      }
    ]
  }
]
```

**Note:** Supabase URL과 Key는 Connect 페이지에서 설정한 값을 사용합니다.

#### GET /api/vectorstore/table-data

테이블 데이터를 조회합니다.

**Headers:** `Authorization: Bearer <token>`
**Query:** `?table=<table_name>&schema=<schema_name>`

#### POST /api/vectorstore/tables

벡터 테이블을 생성합니다.

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
  "message": "Table 'my_documents' created successfully",
  "tableName": "my_documents",
  "vectorDimension": 1536
}
```

**Table Schema:**

```sql
CREATE TABLE my_documents (
  id BIGSERIAL PRIMARY KEY,
  content TEXT NOT NULL,
  embedding vector(1536),
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Note:**

- pgvector extension 자동 활성화
- ivfflat 인덱스 자동 생성 (vector_cosine_ops)
- 직접 생성 실패 시 SQL 명령어 제공

#### DELETE /api/vectorstore/tables

벡터 테이블을 삭제합니다.

**Headers:** `Authorization: Bearer <token>`
**Query:** `?tableName=<table_name>`

**Response:**

```json
{
  "success": true,
  "message": "Table 'my_documents' deleted successfully"
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
  "message": "Successfully uploaded 50 chunks to table 'my_documents'",
  "chunksUploaded": 50,
  "tableName": "my_documents"
}
```

**Process:**

1. Split Result를 MySQL에서 조회
2. 각 chunk에 대해 OpenAI embedding 생성 (text-embedding-ada-002)
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

4. Supabase 테이블에 삽입 (content, embedding, metadata)
5. 배치 처리로 rate limit 관리

**Required API Keys:**

- OpenAI API Key (임베딩 생성용)
- Supabase URL & Key (저장용)

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
  "googleParserProcessorId": "...",
  "supabaseUrl": "https://....supabase.co",
  "supabaseKey": "eyJ..."
}
```

**Note:** Google Document AI는 Service Account 인증을 사용하며,
Private Key는 PEM 형식의 전체 키를 포함해야 합니다.

## 보안

- **암호화**: 모든 API 키 및 자격 증명은 AES-256-CBC로 암호화되어 저장
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
  - Supabase 직접 DDL 실행 제한 (RPC 필요)

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
