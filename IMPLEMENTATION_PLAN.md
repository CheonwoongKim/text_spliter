# Implementation Plan

## Phase 1: Project Setup
- [ ] Next.js 프로젝트 초기화
- [ ] 필수 패키지 설치
- [ ] 프로젝트 구조 생성
- [ ] TypeScript 설정
- [ ] Tailwind CSS 설정

## Phase 2: Type Definitions
- [ ] Splitter 타입 정의
- [ ] Chunk 타입 정의
- [ ] API 응답 타입 정의
- [ ] Configuration 타입 정의

## Phase 3: Backend API
- [ ] API route 생성 (`/api/split`)
- [ ] 각 스플리터 구현
  - [ ] CharacterTextSplitter
  - [ ] RecursiveCharacterTextSplitter
  - [ ] TokenTextSplitter
  - [ ] SentenceTransformersTextSplitter
- [ ] 에러 핸들링
- [ ] 입력 검증

## Phase 4: UI Components
### 4.1 Left Panel Components
- [ ] TextInput 컴포넌트
- [ ] SplitterSelector 컴포넌트
- [ ] SplitterConfig 컴포넌트
- [ ] SplitterDescription 컴포넌트
- [ ] LeftPanel 통합 컴포넌트

### 4.2 Right Panel Components
- [ ] ViewToggle 컴포넌트 (JSON/Card 전환)
- [ ] JsonView 컴포넌트
- [ ] ChunkCard 컴포넌트
- [ ] CardView 컴포넌트
- [ ] Statistics 컴포넌트
- [ ] RightPanel 통합 컴포넌트

## Phase 5: Main Page Integration
- [ ] 메인 페이지 레이아웃
- [ ] 상태 관리 (useState, useCallback)
- [ ] API 호출 로직
- [ ] 로딩 상태 처리
- [ ] 에러 처리

## Phase 6: Styling & Polish
- [ ] 반응형 디자인
- [ ] 애니메이션 추가
- [ ] 다크 모드 지원 (선택)
- [ ] 접근성 개선

## Phase 7: Testing & Documentation
- [ ] 기능 테스트
- [ ] 브라우저 호환성 테스트
- [ ] README.md 작성
- [ ] 사용 가이드 작성

## Detailed Tasks

### Task 1: Project Setup
```bash
npx create-next-app@latest text-splitter --typescript --tailwind --app
cd text-splitter
npm install langchain @langchain/textsplitters js-tiktoken
```

### Task 2: Create Type Definitions
File: `lib/types.ts`
- SplitterType enum
- SplitterConfig interface
- ChunkResult interface
- SplitResponse interface

### Task 3: Implement Splitters
File: `lib/splitters.ts`
- splitText function
- Helper functions for each splitter

### Task 4: Create API Route
File: `app/api/split/route.ts`
- POST endpoint
- Request validation
- Call splitter logic
- Return formatted response

### Task 5-6: Build UI Components
- Component-by-component development
- Props interface for each component
- Proper TypeScript typing

### Task 7: Integration
File: `app/page.tsx`
- Layout structure
- State management
- API integration
- Event handlers

## Technical Decisions

### 1. Why Next.js App Router?
- Server components for better performance
- Built-in API routes
- Modern React features

### 2. Why LangChain.js?
- Industry-standard text splitting
- Multiple splitter implementations
- Well-documented

### 3. Why Tailwind CSS?
- Rapid development
- Consistent styling
- Easy responsive design

### 4. Component Architecture
```
Page (State Management)
├── LeftPanel
│   ├── TextInput
│   ├── SplitterSelector
│   ├── SplitterConfig
│   └── SplitterDescription
└── RightPanel
    ├── ViewToggle
    ├── Statistics
    ├── JsonView
    └── CardView
        └── ChunkCard[]
```

## Implementation Order

1. **Setup** (30분)
   - 프로젝트 초기화
   - 패키지 설치
   - 기본 구조 생성

2. **Types & Backend** (1시간)
   - 타입 정의
   - API route 구현
   - 스플리터 로직 구현

3. **Left Panel** (1.5시간)
   - TextInput
   - SplitterSelector
   - SplitterConfig
   - 통합

4. **Right Panel** (1.5시간)
   - ViewToggle
   - JsonView
   - CardView
   - ChunkCard

5. **Integration** (1시간)
   - 메인 페이지 통합
   - 상태 관리
   - API 연결

6. **Polish** (30분)
   - 스타일링
   - 반응형
   - 버그 수정

**Total Estimated Time**: 6시간

## Key Considerations

1. **Performance**
   - 대용량 텍스트 처리 시 백엔드에서 처리
   - 청크 수가 많을 경우 가상화 고려

2. **Error Handling**
   - API 에러 처리
   - 입력 검증
   - 사용자 친화적 에러 메시지

3. **UX**
   - 로딩 상태 명확히 표시
   - 즉각적인 피드백
   - 직관적인 인터페이스

4. **Code Quality**
   - TypeScript strict mode
   - 컴포넌트 재사용성
   - 명확한 네이밍
