# Text Splitter Web Application - PRD

## 1. Product Overview
랭체인(LangChain)의 다양한 텍스트 스플리터를 시각적으로 테스트하고 결과를 확인할 수 있는 웹 애플리케이션

## 2. Target Users
- LLM 개발자
- 데이터 엔지니어
- RAG(Retrieval-Augmented Generation) 시스템 구축자
- 텍스트 처리 연구자

## 3. Core Features

### 3.1 Layout
- **2분할 레이아웃**: 좌측 입력 패널 / 우측 결과 패널
- **반응형 디자인**: 모바일/태블릿/데스크톱 지원

### 3.2 Left Panel (입력 영역)
#### 3.2.1 텍스트 입력
- 대용량 텍스트 입력 가능한 Textarea
- 붙여넣기 지원
- 직접 작성 지원
- 글자 수 카운터

#### 3.2.2 스플리터 선택
다음 스플리터들을 선택 가능:
- **CharacterTextSplitter**: 특정 문자 기준으로 분할
- **RecursiveCharacterTextSplitter**: 계층적 문자 기준 분할 (권장)
- **TokenTextSplitter**: 토큰 단위 분할
- **SentenceTransformersTextSplitter**: 문장 임베딩 기반 분할

#### 3.2.3 스플리터 설정
각 스플리터별 파라미터:
- `chunk_size`: 청크 크기
- `chunk_overlap`: 청크 간 오버랩
- `separator`: 구분자 (CharacterTextSplitter, RecursiveCharacterTextSplitter)
- `encoding_name`: 인코딩 방식 (TokenTextSplitter)

#### 3.2.4 스플리터 설명
- 각 스플리터 선택 시 동작 원리 및 사용 사례 표시
- 파라미터별 설명 툴팁

#### 3.2.5 실행 버튼
- "Split Text" 버튼
- 로딩 상태 표시

### 3.3 Right Panel (결과 영역)
#### 3.3.1 뷰 모드 전환
- **JSON 뷰**: 전체 결과를 JSON 형식으로 표시
- **Card 뷰**: 청킹 결과를 카드 형태로 표시

#### 3.3.2 JSON 뷰
```json
{
  "chunks": [
    {
      "index": 0,
      "content": "청크 내용",
      "metadata": {
        "start_index": 0,
        "end_index": 100,
        "length": 100,
        "chunk_size": 1000,
        "chunk_overlap": 200
      }
    }
  ],
  "total_chunks": 5,
  "splitter_type": "RecursiveCharacterTextSplitter",
  "parameters": {...}
}
```

#### 3.3.3 Card 뷰
각 청크를 카드로 표시:
- 청크 번호
- 청크 내용 (하이라이트)
- 메타데이터:
  - 문자 길이
  - 시작/끝 인덱스
  - 토큰 수 (가능한 경우)
- 복사 버튼

#### 3.3.4 통계 정보
- 전체 청크 수
- 평균 청크 크기
- 최소/최대 청크 크기
- 처리 시간

## 4. Technical Stack

### 4.1 Frontend
- **Framework**: Next.js 14+ (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **UI Components**: shadcn/ui
- **State Management**: React Hooks (useState, useCallback)

### 4.2 Backend
- **API Routes**: Next.js API Routes
- **Text Splitting**: LangChain.js
- **Runtime**: Node.js

### 4.3 Libraries
- `langchain`: 텍스트 스플리터
- `@langchain/textsplitters`: 스플리터 유틸리티
- `js-tiktoken`: 토큰 카운팅

## 5. Page Structure

```
/
├── app/
│   ├── page.tsx              # 메인 페이지
│   ├── layout.tsx            # 루트 레이아웃
│   ├── globals.css           # 글로벌 스타일
│   └── api/
│       └── split/
│           └── route.ts      # 텍스트 분할 API
├── components/
│   ├── LeftPanel.tsx         # 입력 패널
│   ├── RightPanel.tsx        # 결과 패널
│   ├── TextInput.tsx         # 텍스트 입력 영역
│   ├── SplitterSelector.tsx  # 스플리터 선택기
│   ├── SplitterConfig.tsx    # 스플리터 설정
│   ├── JsonView.tsx          # JSON 뷰
│   ├── CardView.tsx          # 카드 뷰
│   └── ChunkCard.tsx         # 개별 청크 카드
├── lib/
│   ├── splitters.ts          # 스플리터 로직
│   └── types.ts              # TypeScript 타입 정의
└── public/
    └── ...                   # 정적 파일
```

## 6. User Flow

1. 사용자가 페이지 접속
2. 왼쪽 패널에서 텍스트 입력 (붙여넣기 또는 직접 작성)
3. 스플리터 유형 선택
4. 스플리터 파라미터 설정
5. "Split Text" 버튼 클릭
6. 로딩 표시
7. 우측 패널에 결과 표시 (기본: Card 뷰)
8. JSON 뷰/Card 뷰 전환 가능
9. 개별 청크 복사 가능

## 7. Non-Functional Requirements

### 7.1 Performance
- 최대 100,000자까지 처리 가능
- 응답 시간 < 3초 (일반적인 텍스트)

### 7.2 Usability
- 직관적인 UI/UX
- 명확한 에러 메시지
- 로딩 상태 표시

### 7.3 Accessibility
- 키보드 네비게이션 지원
- ARIA 레이블

## 8. Future Enhancements (v2)
- 파일 업로드 (.txt, .md, .pdf)
- 결과 다운로드 (JSON, CSV)
- 비교 모드 (여러 스플리터 결과 비교)
- 커스텀 스플리터 생성
- 히스토리 저장
- 다크 모드

## 9. Success Metrics
- 페이지 로드 시간 < 2초
- 텍스트 분할 성공률 > 99%
- 사용자 세션 시간 > 5분
