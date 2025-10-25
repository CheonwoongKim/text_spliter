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

### 🔐 API 키 관리
- MySQL 데이터베이스에 암호화된 API 키 저장
- 사용자별 안전한 키 관리
- 로그인 기반 인증 시스템

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
# OpenAI API Key (for embeddings)
OPENAI_API_KEY=your_openai_api_key

# Database Configuration
DB_HOST=your_database_host
DB_PORT=3306
DB_NAME=your_database_name
DB_USER=your_database_user
DB_PASSWORD=your_database_password

# Encryption Key (32 bytes)
ENCRYPTION_KEY=your_32_byte_encryption_key
```

### 데이터베이스 설정

MySQL 데이터베이스에 다음 테이블을 생성합니다:

```sql
CREATE TABLE IF NOT EXISTS user_api_keys (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_email VARCHAR(255) NOT NULL,
  key_name VARCHAR(50) NOT NULL,
  encrypted_key TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY unique_user_key (user_email, key_name),
  INDEX idx_user_email (user_email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

또는 제공된 SQL 스크립트를 실행합니다:

```bash
mysql -h your_host -P 3306 -u your_user -p your_database < scripts/schema.sql
```

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

### 2. API 키 설정 (APIs 탭)
- 각 파서의 API 키를 입력
- **Save** 버튼 클릭으로 데이터베이스에 암호화하여 저장
- 페이지 새로고침 시 자동으로 불러옴

### 3. Text Splitter 사용
1. **텍스트 입력**: Upload 또는 Plain Text 탭에서 텍스트 입력
2. **스플리터 선택**: 원하는 분할 방식 선택
3. **파라미터 설정**: Chunk Size, Overlap 등 조정
4. **Split Text 실행**: 결과를 카드 뷰 또는 JSON 뷰로 확인

### 4. Document Parser 사용
1. **파서 선택**: 사용할 AI 파서 선택
2. **API 키 입력**: 해당 파서의 API 키 입력 (저장된 키 자동 로드)
3. **파일 업로드**: PDF, 이미지 등 문서 파일 선택
4. **Parse Document 실행**: 파싱 결과를 Preview, HTML, JSON으로 확인

## 프로젝트 구조

```
text_spliter/
├── app/
│   ├── api/
│   │   ├── keys/              # API 키 관리
│   │   │   └── route.ts
│   │   ├── parse/             # 문서 파싱
│   │   │   └── route.ts
│   │   └── split/             # 텍스트 분할
│   │       └── route.ts
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
│   ├── LicensesPanel.tsx      # API 키 관리 패널
│   ├── TextInput.tsx
│   ├── SplitterSelector.tsx
│   ├── SplitterConfig.tsx
│   └── ...
├── lib/
│   ├── types.ts               # TypeScript 타입
│   ├── splitters.ts           # 스플리터 로직
│   ├── db.ts                  # 데이터베이스 연결
│   ├── encryption.ts          # 암호화 유틸리티
│   └── auth.ts                # 인증 유틸리티
├── scripts/
│   ├── schema.sql             # 데이터베이스 스키마
│   └── create-table.ts        # 테이블 생성 스크립트
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
  ...
}
```

## 보안

- **암호화**: 모든 API 키는 AES-256-CBC로 암호화되어 저장
- **인증**: JWT 토큰 기반 사용자 인증
- **데이터베이스**: 사용자별 격리된 키 저장
- **HTTPS**: 프로덕션 환경에서는 반드시 HTTPS 사용 권장

## 제한사항

- 최대 입력 텍스트 길이: 100,000 문자
- 최대 파일 크기: 파서별로 상이 (일반적으로 10-100MB)
- Chunk Overlap은 Chunk Size보다 작아야 함

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
