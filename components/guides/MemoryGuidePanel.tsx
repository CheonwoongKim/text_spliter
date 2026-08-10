import {
  ArrowRight,
  BookOpenCheck,
  Boxes,
  BrainCircuit,
  Clock3,
  Database,
  ExternalLink,
  FileText,
  FolderTree,
  History,
  Layers3,
  ListRestart,
  MessageSquareText,
  Network,
  Search,
  ShieldCheck,
  TableProperties,
  UserRound,
  UsersRound,
  type LucideIcon,
} from "lucide-react";

type MemoryLayer = {
  name: string;
  englishName: string;
  description: string;
  example: string;
  lifetime: string;
  icon: LucideIcon;
};

type MemoryMethod = {
  id: string;
  name: string;
  summary: string;
  architecture: string;
  strengths: readonly string[];
  cautions: readonly string[];
  bestFor: string;
  icon: LucideIcon;
};

type MemoryProviderGuide = {
  name: string;
  technique: string;
  definition: string;
  architecture: string;
  features: readonly string[];
  limitation: string;
  deployment: string;
  bestFor: string;
  docsUrl: string;
  icon: LucideIcon;
};

const MEMORY_LAYERS: readonly MemoryLayer[] = [
  {
    name: "작업 기억",
    englishName: "Working memory",
    description: "지금 답변하는 데 필요한 최근 대화와 현재 작업 상태입니다.",
    example: "방금 선택한 문서, 최근 질문, 화면의 현재 설정",
    lifetime: "한 요청 ~ 한 세션",
    icon: MessageSquareText,
  },
  {
    name: "요약 기억",
    englishName: "Summary memory",
    description: "길어진 대화를 핵심 목표와 결정 중심으로 압축한 기록입니다.",
    example: "현재까지의 목표, 미해결 항목, 주요 합의",
    lifetime: "한 세션 ~ 여러 세션",
    icon: FileText,
  },
  {
    name: "일화 기억",
    englishName: "Episodic memory",
    description: "언제 어떤 상황에서 무엇을 결정하거나 수정했는지 저장합니다.",
    example: "어제 Parser A의 표 추출 품질이 더 좋다고 판단함",
    lifetime: "여러 세션",
    icon: History,
  },
  {
    name: "의미 기억",
    englishName: "Semantic memory",
    description: "반복해서 사용할 사용자 선호와 안정적인 사실을 구조화합니다.",
    example: "사용자는 원문 구조 보존을 우선함",
    lifetime: "장기, 수정될 때까지",
    icon: UserRound,
  },
  {
    name: "절차 기억",
    englishName: "Procedural memory",
    description: "일을 수행하는 순서, 규칙, 도구 사용법을 기억합니다.",
    example: "문서를 파싱한 뒤 비교 평가를 실행하는 순서",
    lifetime: "장기, 정책 변경까지",
    icon: ListRestart,
  },
] as const;

const MEMORY_METHODS: readonly MemoryMethod[] = [
  {
    id: "window",
    name: "최근 대화 창",
    summary: "가장 최근의 메시지 N개 또는 토큰 범위만 모델에 다시 전달합니다.",
    architecture: "대화 원문 → 최근 N개 선택 → Prompt",
    strengths: ["구현이 단순함", "원문 손실이 없음", "현재 대화 연결에 강함"],
    cautions: ["오래된 정보는 사라짐", "대화가 길수록 토큰 비용 증가"],
    bestFor: "짧은 대화와 MVP의 단기 기억",
    icon: MessageSquareText,
  },
  {
    id: "summary",
    name: "누적 요약",
    summary: "대화가 길어질 때 이전 내용을 목표·결정·미해결 항목으로 압축합니다.",
    architecture: "이전 요약 + 새 대화 → 새 요약 → Prompt",
    strengths: ["긴 대화의 비용 절감", "전체 흐름을 지속적으로 유지"],
    cautions: ["요약 과정에서 세부 정보 손실", "잘못된 요약이 계속 누적될 수 있음"],
    bestFor: "긴 세션과 프로젝트 단위 대화",
    icon: Layers3,
  },
  {
    id: "vector",
    name: "벡터 메모리",
    summary: "기억을 임베딩으로 변환하고 현재 질문과 의미가 가까운 항목을 찾습니다.",
    architecture: "기억 → Embedding → Vector DB → 유사도 검색",
    strengths: ["표현이 달라도 의미가 비슷한 기억 검색", "많은 기억을 빠르게 탐색"],
    cautions: ["시간 순서와 정확한 관계에 약함", "오래된 기억과 새 기억이 함께 검색될 수 있음"],
    bestFor: "선호, 과거 질문, 유사 사례 검색",
    icon: Search,
  },
  {
    id: "structured",
    name: "구조화 메모리",
    summary: "기억을 사용자, 프로젝트, 유형, 유효 기간 같은 필드로 나누어 저장합니다.",
    architecture: "대화 → 사실 추출 → Table/JSON → 조건 검색",
    strengths: ["권한과 범위 제어가 명확함", "수정·삭제·감사가 쉬움"],
    cautions: ["사전에 스키마를 설계해야 함", "예상하지 못한 표현을 담기 어려움"],
    bestFor: "사용자 선호, 정책, 상태, 확정된 결정",
    icon: TableProperties,
  },
  {
    id: "graph",
    name: "그래프·시간 메모리",
    summary: "사람, 문서, 결정, 사건을 관계와 시간으로 연결해 변화 과정을 저장합니다.",
    architecture: "Entity + Relation + Time → Graph → 관계 탐색",
    strengths: ["복잡한 관계와 변경 이력 탐색", "왜 연결되었는지 추적 가능"],
    cautions: ["추출·정합성 관리가 복잡함", "단순 서비스에는 운영 비용이 큼"],
    bestFor: "장기 프로젝트, 조직 지식, 시간에 따른 사실 변화",
    icon: Network,
  },
  {
    id: "hierarchy",
    name: "계층형 메모리",
    summary: "개요에서 세부 내용으로 내려가며 필요한 깊이만큼 문맥을 불러옵니다.",
    architecture: "L0 요약 → L1 개요 → L2 원문",
    strengths: ["대규모 문맥을 단계적으로 탐색", "사람이 구조를 이해하기 쉬움"],
    cautions: ["분류 구조를 지속적으로 관리해야 함", "짧은 대화에는 과도할 수 있음"],
    bestFor: "대규모 문서, 프로젝트 지식, 장기 에이전트",
    icon: FolderTree,
  },
] as const;

const MEMORY_PROVIDER_GUIDES: readonly MemoryProviderGuide[] = [
  {
    name: "Honcho",
    technique: "Peer 중심 사용자 모델링",
    definition: "사용자와 에이전트를 각각 Peer로 보고, 대화가 쌓일수록 상대에 대한 표현과 결론을 계속 갱신하는 방식입니다.",
    architecture: "Message + Session → Peer representation → Dialectic reasoning → Context",
    features: [
      "대화 세션이 바뀌어도 사용자와 에이전트의 정체성을 이어갑니다.",
      "세션 요약·Peer card·사용자 표현을 기본 문맥으로 사용합니다.",
      "추가 추론을 통해 기록에 직접 쓰이지 않은 성향과 관계를 종합합니다.",
    ],
    limitation: "백그라운드 추론과 표현 갱신에 LLM 호출이 필요해 단순 검색형 메모리보다 운영 구조와 비용이 커질 수 있습니다.",
    deployment: "Cloud / Self-hosted",
    bestFor: "개인화 에이전트, 멀티 에이전트, 사용자와 에이전트 관계가 중요한 서비스",
    docsUrl: "https://honcho.dev/docs/v2/documentation/core-concepts/architecture",
    icon: UsersRound,
  },
  {
    name: "OpenViking",
    technique: "계층형 Context Database",
    definition: "문서와 메모리를 가상 파일시스템처럼 정리하고, 요약에서 원문까지 필요한 깊이만 단계적으로 읽는 방식입니다.",
    architecture: "Resource + Session → viking:// hierarchy → L0 요약 → L1 개요 → L2 원문",
    features: [
      "검색 결과를 파일과 폴더처럼 탐색할 수 있습니다.",
      "L0·L1·L2 계층으로 필요한 정보만 불러와 토큰 사용을 줄입니다.",
      "사용자 프로필·선호·사건·사례·패턴 등을 세션 종료 시 추출합니다.",
    ],
    limitation: "별도 서버와 계층 구조를 운영해야 하며, 짧은 대화 중심 서비스에는 구조가 과도할 수 있습니다.",
    deployment: "Self-hosted",
    bestFor: "대규모 문서 지식, 구조화된 탐색, 문서와 메모리를 함께 관리하는 에이전트",
    docsUrl: "https://docs.openviking.ai/en/faq/faq",
    icon: FolderTree,
  },
  {
    name: "Mem0",
    technique: "LLM 기반 사실 추출·갱신",
    definition: "대화 원문을 모두 다시 사용하는 대신, LLM이 장기 가치가 있는 사실과 선호를 추출하고 기존 기억과 비교해 정리합니다.",
    architecture: "Conversation → Fact extraction → Add / Update / Delete → Vector search + Rerank",
    features: [
      "기억 추출과 중복 제거를 자동화해 개발자가 직접 규칙을 많이 만들지 않아도 됩니다.",
      "사용자·에이전트·실행 단위로 기억 범위를 분리할 수 있습니다.",
      "Cloud, 셀프호스팅 서버, 인프로세스 OSS 구성을 선택할 수 있습니다.",
    ],
    limitation: "추출 모델이 잘못 요약하면 중요한 조건이 사라질 수 있고, 복잡한 시간 관계는 별도로 설계해야 합니다.",
    deployment: "Cloud / Self-hosted / OSS",
    bestFor: "사용자 선호, 반복되는 사실, 빠르게 장기 기억을 실험하려는 서비스",
    docsUrl: "https://docs.mem0.ai/open-source/overview",
    icon: BrainCircuit,
  },
  {
    name: "Hindsight",
    technique: "시간·그래프 기반 종합 기억",
    definition: "기억에서 사실, 엔티티, 관계와 시간을 추출하고 여러 검색 전략을 병렬로 사용한 뒤 필요한 경우 결과를 다시 종합합니다.",
    architecture: "Retain → Fact / Entity / Time → Semantic + BM25 + Graph + Temporal → Recall / Reflect",
    features: [
      "의미·키워드·그래프·시간 검색을 함께 사용합니다.",
      "Reflect가 여러 기억을 모아 질문에 맞는 새로운 관찰과 답을 만듭니다.",
      "사실이 언제 발생하고 어떻게 바뀌었는지 다루는 데 유리합니다.",
    ],
    limitation: "추출, 그래프 구성, 다중 검색과 종합 과정 때문에 가장 무거운 축에 속하며 평가 범위도 넓어집니다.",
    deployment: "Cloud / Local",
    bestFor: "장기 프로젝트, 관계 중심 질의, 변경 이력과 시간 추론이 필요한 에이전트",
    docsUrl: "https://docs.hindsight.vectorize.io/",
    icon: Network,
  },
  {
    name: "Holographic",
    technique: "로컬 사실 저장소 + HRR",
    definition: "SQLite에 사실과 신뢰도를 저장하고, FTS5 검색과 HRR 벡터 연산을 조합해 엔티티와 관계를 탐색하는 Hermes 전용 방식입니다.",
    architecture: "Fact → SQLite + FTS5 + Trust score → HRR probe / reason / contradict",
    features: [
      "외부 서버 없이 로컬 SQLite만으로 사용할 수 있습니다.",
      "사용자 피드백에 따라 기억의 신뢰 점수를 조정합니다.",
      "엔티티 탐색, 복합 조건 추론, 상충되는 사실 탐지를 제공합니다.",
    ],
    limitation: "일반 임베딩 기반의 폭넓은 의미 검색과는 성격이 다르며, HRR 기능에는 NumPy가 필요합니다.",
    deployment: "Local",
    bestFor: "외부 의존성이 적은 로컬 실험, 사실 신뢰도와 충돌을 직접 관리하려는 경우",
    docsUrl: "https://github.com/NousResearch/hermes-agent/blob/main/website/docs/user-guide/features/memory-providers.md#holographic",
    icon: Boxes,
  },
  {
    name: "RetainDB",
    technique: "타입 기반 기억 + Hybrid Retrieval",
    definition: "선호, 사실, 결정 같은 기억 유형과 중요도를 저장하고 벡터·키워드·재정렬 검색으로 다음 작업에 필요한 문맥을 구성합니다.",
    architecture: "Typed memory + Sources → Vector + BM25 + Rerank → Task context",
    features: [
      "사용자·세션·에이전트 기억과 회사 문서 지식을 한 서비스에서 다룹니다.",
      "정확한 단어 검색과 의미 검색을 결합합니다.",
      "출처 인용과 에이전트 간 작업·결정 전달을 지원합니다.",
    ],
    limitation: "Hermes 연동은 클라우드 API를 전제로 하므로 완전 로컬 실행과 데이터 경로 직접 제어에는 맞지 않습니다.",
    deployment: "Cloud",
    bestFor: "회사 지식과 사용자 기억을 함께 제공하는 팀·에이전트 워크플로",
    docsUrl: "https://www.retaindb.com/docs/intro",
    icon: Database,
  },
  {
    name: "ByteRover",
    technique: "사람이 읽는 계층형 지식 트리",
    definition: "대화와 작업에서 얻은 결정·패턴을 Markdown 중심의 계층 구조로 큐레이션하고 CLI로 검색하는 로컬 우선 방식입니다.",
    architecture: "Work context → Curate → Markdown context tree → Fuzzy / LLM search",
    features: [
      "기억 파일을 사람이 직접 읽고 수정하며 버전 관리할 수 있습니다.",
      "컨텍스트 압축 전에 중요한 내용을 추출해 손실을 줄입니다.",
      "로컬을 기본으로 사용하고 필요할 때만 클라우드 동기화를 추가합니다.",
    ],
    limitation: "자동 대화 개인화보다 개발 지식과 명시적인 운영 규칙에 더 적합하고 CLI 의존성이 있습니다.",
    deployment: "Local / Optional cloud sync",
    bestFor: "개발 에이전트, 프로젝트 규칙, 사람이 검토해야 하는 장기 지식",
    docsUrl: "https://docs.byterover.dev/quickstart",
    icon: FileText,
  },
  {
    name: "Supermemory",
    technique: "Semantic profile + Memory graph",
    definition: "대화와 문서를 함께 수집해 사용자 프로필과 기억 그래프를 만들고, 의미 검색으로 현재 요청에 필요한 문맥을 제공합니다.",
    architecture: "Conversation + Documents → Profile + Memory graph → Hybrid search → Fenced context",
    features: [
      "프로필 사실과 최근 문맥을 함께 회상합니다.",
      "회상된 기억을 다시 저장하지 않도록 context fencing으로 오염을 줄입니다.",
      "컨테이너 단위로 프로젝트와 프로필의 기억을 분리할 수 있습니다.",
    ],
    limitation: "문서 처리와 그래프·프로필까지 다루는 넓은 플랫폼이므로 단순 메모리 기준선보다 구성 요소가 많습니다.",
    deployment: "Cloud / Self-hosted",
    bestFor: "문서와 사용자 프로필을 결합한 검색, 여러 프로젝트 컨테이너를 사용하는 서비스",
    docsUrl: "https://github.com/supermemoryai/supermemory",
    icon: Layers3,
  },
] as const;

const COMPARISON_ROWS = [
  ["최근 대화 창", "높음", "낮음", "매우 높음", "낮음", "짧은 대화"],
  ["누적 요약", "높음", "중간", "중간", "낮음", "긴 세션"],
  ["벡터 메모리", "높음", "낮음", "중간", "중간", "유사 기억 검색"],
  ["구조화 메모리", "중간", "중간", "매우 높음", "중간", "선호·정책·상태"],
  ["그래프·시간", "높음", "매우 높음", "높음", "높음", "관계·변경 이력"],
  ["계층형 메모리", "높음", "중간", "높음", "높음", "대규모 문맥"],
] as const;

function SectionHeading({
  eyebrow,
  title,
  description,
}: {
  eyebrow: string;
  title: string;
  description: string;
}) {
  return (
    <header className="max-w-3xl">
      <p className="text-2xs font-medium uppercase tracking-wide text-muted-foreground">
        {eyebrow}
      </p>
      <h2 className="mt-1 text-lg font-semibold text-card-foreground">{title}</h2>
      <p className="mt-2 text-xs leading-6 text-muted-foreground text-pretty">{description}</p>
    </header>
  );
}

function BulletList({ items }: { items: readonly string[] }) {
  return (
    <ul className="space-y-2">
      {items.map((item) => (
        <li key={item} className="flex gap-2 text-xs leading-5 text-muted-foreground">
          <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-muted-foreground" aria-hidden="true" />
          <span>{item}</span>
        </li>
      ))}
    </ul>
  );
}

export default function MemoryGuidePanel() {
  return (
    <div className="h-full overflow-y-auto bg-card">
      <div className="mx-auto max-w-6xl px-4 pb-16 sm:px-6 lg:px-10">
        <header className="border-b border-border-subtle py-10">
          <div className="flex max-w-4xl items-start gap-4">
            <div className="flex h-control-xl w-control-xl shrink-0 items-center justify-center rounded-2xl bg-subtle text-card-foreground">
              <BrainCircuit className="h-6 w-6" strokeWidth={1} aria-hidden="true" />
            </div>
            <div>
              <p className="text-2xs font-medium uppercase tracking-wide text-muted-foreground">
                Memory guide
              </p>
              <h1 className="mt-1 text-2xl font-semibold tracking-tight text-card-foreground">
                AI가 기억한다는 것은 무엇인가요?
              </h1>
              <p className="mt-3 max-w-3xl text-base leading-7 text-muted-foreground text-pretty">
                메모리는 대화를 그대로 저장하는 기능이 아닙니다. 필요한 정보를 선별하고,
                적절한 구조로 보관한 뒤, 현재 질문에 맞게 다시 찾고 수정하거나 잊는 전체
                과정입니다.
              </p>
            </div>
          </div>

          <div className="mt-8 rounded-xl border border-border bg-upload-zone p-4">
            <p className="text-2xs font-medium text-card-foreground">한 문장으로 이해하기</p>
            <p className="mt-1 text-xs leading-6 text-muted-foreground">
              Memory = 기록하기 · 선별하기 · 구조화하기 · 다시 찾기 · 갱신하고 잊기
            </p>
          </div>
        </header>

        <nav className="border-b border-border-subtle py-4" aria-label="Memory guide sections">
          <ul className="flex flex-wrap gap-2 text-2xs">
            {[
              ["#memory-architecture", "작동 구조"],
              ["#memory-types", "기억의 종류"],
              ["#memory-methods", "구현 방식"],
              ["#memory-comparison", "방식 비교"],
              ["#memory-providers", "8개 기법"],
              ["#memory-selection", "선택 기준"],
            ].map(([href, label]) => (
              <li key={href}>
                <a
                  href={href}
                  className="inline-flex rounded-lg border border-border px-3 py-2 text-muted-foreground transition-smooth hover:border-border-darkest hover:text-card-foreground focus-ring"
                >
                  {label}
                </a>
              </li>
            ))}
          </ul>
        </nav>

        <section id="memory-architecture" className="scroll-mt-16 border-b border-border-subtle py-10">
          <SectionHeading
            eyebrow="Architecture"
            title="메모리는 다섯 단계로 작동합니다"
            description="제품마다 사용하는 저장소는 달라도, 신뢰할 수 있는 메모리는 기록부터 삭제까지 하나의 수명주기를 가집니다."
          />

          <ol className="mt-6 grid grid-cols-1 gap-3 md:grid-cols-5">
            {[
              ["01", "기록", "대화와 사건을 원본으로 남깁니다.", MessageSquareText],
              ["02", "선별", "계속 기억할 가치가 있는지 판단합니다.", BookOpenCheck],
              ["03", "저장", "벡터·테이블·그래프 등에 정리합니다.", Database],
              ["04", "검색", "질문에 필요한 기억만 다시 찾습니다.", Search],
              ["05", "갱신", "충돌을 해결하고 오래된 기억을 잊습니다.", Clock3],
            ].map(([step, title, description, Icon]) => {
              const StepIcon = Icon as LucideIcon;
              return (
                <li key={step as string} className="rounded-xl border border-border p-4">
                  <div className="flex items-center justify-between">
                    <span className="text-2xs font-medium text-muted-foreground">{step as string}</span>
                    <StepIcon className="h-4 w-4 text-muted-foreground" strokeWidth={1} aria-hidden="true" />
                  </div>
                  <h3 className="mt-4 text-xs font-medium text-card-foreground">{title as string}</h3>
                  <p className="mt-2 text-2xs leading-5 text-muted-foreground">{description as string}</p>
                </li>
              );
            })}
          </ol>

          <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
            <div className="rounded-xl border border-border p-6">
              <p className="text-2xs font-medium uppercase tracking-wide text-muted-foreground">
                Read path
              </p>
              <div className="mt-4 flex flex-wrap items-center gap-2 text-xs text-card-foreground">
                <span className="rounded-lg bg-subtle px-3 py-2">현재 질문</span>
                <ArrowRight className="h-4 w-4 text-subdued" strokeWidth={1} aria-hidden="true" />
                <span className="rounded-lg bg-subtle px-3 py-2">기억 검색</span>
                <ArrowRight className="h-4 w-4 text-subdued" strokeWidth={1} aria-hidden="true" />
                <span className="rounded-lg bg-subtle px-3 py-2">문서 검색</span>
                <ArrowRight className="h-4 w-4 text-subdued" strokeWidth={1} aria-hidden="true" />
                <span className="rounded-lg bg-subtle px-3 py-2">답변</span>
              </div>
            </div>
            <div className="rounded-xl border border-border p-6">
              <p className="text-2xs font-medium uppercase tracking-wide text-muted-foreground">
                Write path
              </p>
              <div className="mt-4 flex flex-wrap items-center gap-2 text-xs text-card-foreground">
                <span className="rounded-lg bg-subtle px-3 py-2">새 대화</span>
                <ArrowRight className="h-4 w-4 text-subdued" strokeWidth={1} aria-hidden="true" />
                <span className="rounded-lg bg-subtle px-3 py-2">중요도 판단</span>
                <ArrowRight className="h-4 w-4 text-subdued" strokeWidth={1} aria-hidden="true" />
                <span className="rounded-lg bg-subtle px-3 py-2">충돌 검사</span>
                <ArrowRight className="h-4 w-4 text-subdued" strokeWidth={1} aria-hidden="true" />
                <span className="rounded-lg bg-subtle px-3 py-2">저장·갱신</span>
              </div>
            </div>
          </div>
        </section>

        <section id="memory-types" className="scroll-mt-16 border-b border-border-subtle py-10">
          <SectionHeading
            eyebrow="Memory types"
            title="기억은 목적에 따라 나누어야 합니다"
            description="한 저장소에 모든 내용을 섞기보다 수명과 역할이 다른 기억을 구분해야 검색 결과가 정확해집니다."
          />

          <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {MEMORY_LAYERS.map((layer) => {
              const Icon = layer.icon;
              return (
                <article key={layer.englishName} className="rounded-xl border border-border p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="text-xs font-medium text-card-foreground">{layer.name}</h3>
                      <p className="mt-1 text-2xs text-muted-foreground">{layer.englishName}</p>
                    </div>
                    <Icon className="h-5 w-5 shrink-0 text-muted-foreground" strokeWidth={1} aria-hidden="true" />
                  </div>
                  <p className="mt-4 text-xs leading-6 text-muted-foreground">{layer.description}</p>
                  <dl className="mt-4 space-y-3 border-t border-border-subtle pt-4 text-2xs">
                    <div>
                      <dt className="text-muted-foreground">예시</dt>
                      <dd className="mt-1 leading-5 text-card-foreground">{layer.example}</dd>
                    </div>
                    <div>
                      <dt className="text-muted-foreground">일반적인 수명</dt>
                      <dd className="mt-1 text-card-foreground">{layer.lifetime}</dd>
                    </div>
                  </dl>
                </article>
              );
            })}
          </div>
        </section>

        <section id="memory-methods" className="scroll-mt-16 border-b border-border-subtle py-10">
          <SectionHeading
            eyebrow="Implementation methods"
            title="같은 기억도 여러 방식으로 구현할 수 있습니다"
            description="각 방식은 대체 관계가 아닙니다. 실제 서비스에서는 최근 대화, 요약, 구조화 데이터와 벡터 검색을 목적에 맞게 조합합니다."
          />

          <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
            {MEMORY_METHODS.map((method) => {
              const Icon = method.icon;
              return (
                <article key={method.id} className="rounded-xl border border-border p-6">
                  <div className="flex items-start gap-3">
                    <div className="flex h-control-md w-control-md shrink-0 items-center justify-center rounded-lg bg-subtle">
                      <Icon className="h-5 w-5 text-card-foreground" strokeWidth={1} aria-hidden="true" />
                    </div>
                    <div>
                      <h3 className="text-base font-semibold text-card-foreground">{method.name}</h3>
                      <p className="mt-1 text-xs leading-6 text-muted-foreground">{method.summary}</p>
                    </div>
                  </div>

                  <div className="mt-4 rounded-lg bg-upload-zone p-3">
                    <p className="text-2xs text-muted-foreground">작동 구조</p>
                    <p className="mt-1 font-mono text-2xs leading-5 text-card-foreground">
                      {method.architecture}
                    </p>
                  </div>

                  <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div>
                      <p className="mb-2 text-2xs font-medium text-card-foreground">강점</p>
                      <BulletList items={method.strengths} />
                    </div>
                    <div>
                      <p className="mb-2 text-2xs font-medium text-card-foreground">주의할 점</p>
                      <BulletList items={method.cautions} />
                    </div>
                  </div>

                  <div className="mt-4 border-t border-border-subtle pt-4">
                    <p className="text-2xs text-muted-foreground">
                      적합한 경우 <span className="ml-2 font-medium text-card-foreground">{method.bestFor}</span>
                    </p>
                  </div>
                </article>
              );
            })}
          </div>
        </section>

        <section id="memory-comparison" className="scroll-mt-16 border-b border-border-subtle py-10">
          <SectionHeading
            eyebrow="Comparison"
            title="필요한 능력을 기준으로 비교하세요"
            description="기능 수가 많다고 더 좋은 방식은 아닙니다. 서비스가 실제로 요구하는 기억의 범위와 운영 복잡도를 함께 봐야 합니다."
          />

          <div className="mt-6 overflow-x-auto rounded-xl border border-border">
            <table className="min-w-full border-collapse text-left text-2xs">
              <caption className="sr-only">메모리 구현 방식별 특성 비교</caption>
              <thead className="bg-upload-zone text-muted-foreground">
                <tr>
                  {[
                    "방식",
                    "의미 검색",
                    "관계·시간",
                    "설명 가능성",
                    "운영 복잡도",
                    "가장 적합한 용도",
                  ].map((heading) => (
                    <th key={heading} scope="col" className="whitespace-nowrap border-b border-border px-4 py-3 font-medium">
                      {heading}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border-subtle">
                {COMPARISON_ROWS.map((row) => (
                  <tr key={row[0]}>
                    {row.map((cell, index) => (
                      <td
                        key={`${row[0]}-${cell}`}
                        className={`whitespace-nowrap px-4 py-3 ${index === 0 ? "font-medium text-card-foreground" : "text-muted-foreground"}`}
                      >
                        {cell}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section id="memory-providers" className="scroll-mt-16 border-b border-border-subtle py-10">
          <SectionHeading
            eyebrow="Eight approaches"
            title="공유한 글의 8개 메모리 기법을 살펴봅니다"
            description="각 항목은 하나의 공통 알고리즘을 다르게 구현한 것이 아니라, 무엇을 기억하고 어떻게 다시 찾을지에 대한 서로 다른 제품 철학입니다."
          />

          <div className="mt-6 rounded-xl border border-border bg-upload-zone p-4">
            <p className="text-2xs font-medium text-card-foreground">읽기 전에 알아두기</p>
            <p className="mt-1 text-xs leading-6 text-muted-foreground">
              아래의 아키텍처는 핵심 흐름을 이해하기 위한 개념도입니다. 실제 저장 방식과 지원
              범위는 버전과 배포 구성에 따라 달라질 수 있습니다.
            </p>
          </div>

          <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
            {MEMORY_PROVIDER_GUIDES.map((provider) => {
              const Icon = provider.icon;
              return (
                <article key={provider.name} className="flex flex-col rounded-xl border border-border p-6">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex min-w-0 items-start gap-3">
                      <div className="flex h-control-md w-control-md shrink-0 items-center justify-center rounded-lg bg-subtle">
                        <Icon className="h-5 w-5 text-card-foreground" strokeWidth={1} aria-hidden="true" />
                      </div>
                      <div className="min-w-0">
                        <h3 className="text-base font-semibold text-card-foreground">{provider.name}</h3>
                        <p className="mt-1 text-2xs font-medium text-muted-foreground">{provider.technique}</p>
                      </div>
                    </div>
                    <span className="shrink-0 rounded-full border border-border px-3 py-1 text-2xs text-muted-foreground">
                      {provider.deployment}
                    </span>
                  </div>

                  <p className="mt-4 text-xs leading-6 text-muted-foreground">{provider.definition}</p>

                  <div className="mt-4 rounded-lg bg-upload-zone p-3">
                    <p className="text-2xs text-muted-foreground">핵심 아키텍처</p>
                    <p className="mt-1 font-mono text-2xs leading-5 text-card-foreground">
                      {provider.architecture}
                    </p>
                  </div>

                  <div className="mt-4">
                    <p className="mb-2 text-2xs font-medium text-card-foreground">주요 특징</p>
                    <BulletList items={provider.features} />
                  </div>

                  <dl className="mt-4 space-y-3 border-t border-border-subtle pt-4 text-2xs">
                    <div>
                      <dt className="text-muted-foreground">주의할 점</dt>
                      <dd className="mt-1 leading-5 text-card-foreground">{provider.limitation}</dd>
                    </div>
                    <div>
                      <dt className="text-muted-foreground">적합한 경우</dt>
                      <dd className="mt-1 leading-5 text-card-foreground">{provider.bestFor}</dd>
                    </div>
                  </dl>

                  <div className="mt-auto pt-4">
                    <a
                      href={provider.docsUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-2 text-2xs font-medium text-card-foreground transition-smooth hover:text-muted-foreground focus-ring"
                      aria-label={`${provider.name} 공식 문서 새 창에서 열기`}
                    >
                      공식 문서
                      <ExternalLink className="h-3 w-3" strokeWidth={1} aria-hidden="true" />
                    </a>
                  </div>
                </article>
              );
            })}
          </div>

          <div className="mt-6 overflow-x-auto rounded-xl border border-border">
            <table className="min-w-full border-collapse text-left text-2xs">
              <caption className="sr-only">공유 글에 소개된 8개 메모리 제공자 비교</caption>
              <thead className="bg-upload-zone text-muted-foreground">
                <tr>
                  {["도구", "핵심 기법", "배포 방식", "적합한 용도"].map((heading) => (
                    <th key={heading} scope="col" className="whitespace-nowrap border-b border-border px-4 py-3 font-medium">
                      {heading}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border-subtle">
                {MEMORY_PROVIDER_GUIDES.map((provider) => (
                  <tr key={provider.name}>
                    <th scope="row" className="whitespace-nowrap px-4 py-4 text-xs font-medium text-card-foreground">
                      {provider.name}
                    </th>
                    <td className="whitespace-nowrap px-4 py-4 text-muted-foreground">{provider.technique}</td>
                    <td className="whitespace-nowrap px-4 py-4 text-muted-foreground">{provider.deployment}</td>
                    <td className="min-w-64 px-4 py-4 leading-5 text-muted-foreground">{provider.bestFor}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-3 text-2xs leading-5 text-muted-foreground">
            완전한 로컬 실행을 원한다면 메모리 저장소뿐 아니라 LLM과 임베딩 모델의 실행 위치도 함께 확인해야 합니다.
          </p>
        </section>

        <section id="memory-selection" className="scroll-mt-16 py-10">
          <SectionHeading
            eyebrow="Selection guide"
            title="복잡한 방식보다 필요한 기억부터 선택하세요"
            description="메모리 방식은 하나를 고르는 문제가 아니라, 현재 제품에 필요한 최소 계층을 조합하는 문제입니다."
          />

          <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-3">
            {[
              {
                step: "Step 1",
                title: "기억할 대상을 정합니다",
                description: "최근 대화인지, 사용자 선호인지, 과거 결정과 변경 이력인지 먼저 구분합니다.",
              },
              {
                step: "Step 2",
                title: "검색 질문을 정의합니다",
                description: "의미가 비슷한 내용을 찾을지, 특정 시점이나 관계를 물을지 실제 질문으로 확인합니다.",
              },
              {
                step: "Step 3",
                title: "가장 단순한 조합으로 검증합니다",
                description: "최근 대화와 구조화 메모리부터 시작하고, 부족할 때 벡터·그래프·계층형 방식을 추가합니다.",
              },
            ].map((item) => (
              <article key={item.step} className="rounded-xl border border-border p-6">
                <p className="text-2xs font-medium text-muted-foreground">{item.step}</p>
                <h3 className="mt-2 text-xs font-medium text-card-foreground">{item.title}</h3>
                <p className="mt-2 text-xs leading-6 text-muted-foreground">{item.description}</p>
              </article>
            ))}
          </div>

          <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
            <article className="rounded-xl border border-border p-6">
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-5 w-5 text-card-foreground" strokeWidth={1} aria-hidden="true" />
                <h3 className="text-xs font-medium text-card-foreground">반드시 확인할 품질 기준</h3>
              </div>
              <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2">
                <BulletList
                  items={[
                    "정확한 기억을 다시 찾는가",
                    "오래된 기억을 구분하는가",
                    "사용자 간 정보가 분리되는가",
                  ]}
                />
                <BulletList
                  items={[
                    "기억의 근거를 확인할 수 있는가",
                    "수정과 삭제가 실제로 반영되는가",
                    "문서 사실을 임의로 덮어쓰지 않는가",
                  ]}
                />
              </div>
            </article>

            <article className="rounded-xl border border-border bg-upload-zone p-6">
              <div className="flex items-center gap-2">
                <BrainCircuit className="h-5 w-5 text-card-foreground" strokeWidth={1} aria-hidden="true" />
                <h3 className="text-xs font-medium text-card-foreground">이 서비스에서의 권장 출발점</h3>
              </div>
              <p className="mt-4 text-xs leading-6 text-muted-foreground">
                문서 지식과 대화 메모리를 분리한 뒤, 최근 대화 + 누적 요약 + 구조화 메모리를
                기준선으로 삼는 것이 적합합니다. 벡터나 그래프 메모리는 실제 비교 테스트에서
                기준선의 한계가 확인될 때 추가합니다.
              </p>
              <div className="mt-4 inline-flex rounded-full border border-border bg-card px-3 py-1 text-2xs text-card-foreground">
                현재 상태 · Guide only
              </div>
            </article>
          </div>
        </section>
      </div>
    </div>
  );
}
