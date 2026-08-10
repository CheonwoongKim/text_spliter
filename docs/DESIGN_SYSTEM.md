# BGK Design System

BGK는 디자인을 보여주기 위한 서비스가 아니라 문서를 처리하고 결과를 비교하는 작업 도구입니다. 따라서 디자인 시스템의 목표는 표현의 다양성이 아니라 기능을 빠르게 이해하게 만드는 일관성입니다.

## Principles

### 1. Function first

모든 시각 요소는 위치, 상태, 행동 중 하나를 설명해야 합니다. 기능을 설명하지 않는 색상, 그림자, 장식, 모션은 추가하지 않습니다.

### 2. Fewer choices, faster decisions

새 화면을 만들 때 새로운 값을 고르지 않습니다. 아래에 명시된 font, spacing, radius, color만 조합합니다.

### 3. Semantic, not literal

`blue-500`, `14px`, `10px`처럼 값 자체를 컴포넌트에 작성하지 않습니다. `accent`, `text-base`, `gap-3`처럼 역할과 제한된 scale을 사용합니다.

### 4. Neutral by default

기본 UI와 주요 액션은 무채색 대비와 중립색으로 구성합니다. 색상은 성공, 경고, 오류처럼 실제 상태를 구분할 때만 사용합니다.

### 5. One theme for the MVP

MVP는 다크 테마 하나만 제공합니다. 테마 상태, 토글, 별도 테마 토큰과 컴포넌트의 `dark:` 분기를 추가하지 않습니다.

### 6. Accessible by default

본문은 13px보다 작게 만들지 않습니다. 키보드 포커스를 숨기지 않으며 색상만으로 상태를 전달하지 않습니다. 모션 감소 설정을 존중합니다.

## Source of truth

```text
styles/design-tokens.css → tailwind.config.ts → app/globals.css / components
```

- [design-tokens.css](../styles/design-tokens.css): 모든 원시 값과 테마 값
- [tailwind.config.ts](../tailwind.config.ts): 허용된 유틸리티만 노출
- [globals.css](../app/globals.css): 기본 typography와 전역 interaction
- [check-design-system.mjs](../scripts/check-design-system.mjs): 허용되지 않은 값 차단
- [components/shared](../components/shared): 화면이 조립해 쓰는 공용 프리미티브

## 공용 컴포넌트

버튼·필드·표·오버레이는 손으로 만들지 않고 `components/shared`의 프리미티브를 조립합니다.

프리미티브가 있어도 강제 장치가 없으면 쓰이지 않습니다. 실제로 이 저장소는 `Button`을 갖고 있으면서 화면마다 `<button>`을 다시 작성했고, `evaluation`은 별도 스타일 상수 파일까지 만들었습니다. 그래서 `check:design`이 **줄어들기만 하는 예산**으로 이를 감시합니다.

```
COMPONENT_BUDGETS = [ hand-rolled button, text input, select, overlay, parallel style constant ]
```

현재 남은 프리미티브와 그 역할:

| 컴포넌트 | 담당 |
|---|---|
| `PagePanel` · `PanelSection` | 페이지 프레임, 거터, 제목 위계 |
| `SplitWorkspace` | 파이프라인 단계의 설정/결과 2열 구조 |
| `TabBar` | 화면 내 보기 전환 |
| `DataTable` | 비교 표 |
| `Button` · `FormFields` | 컨트롤과 그 크기 스케일 |
| `Modal` · `ModalDialog` | 오버레이, 포커스 트랩, Escape |
| `StatusMessage` | 작업 결과 알림 |
| `PanelPlaceholder` | 빈 상태와 로딩 |

오버레이와 평행 스타일 상수는 예산이 0이므로 사실상 금지입니다.

- 개수가 예산을 넘으면 빌드가 실패합니다.
- 마이그레이션이 끝나면 스크립트가 새 숫자를 알려주고, 그때 예산을 **낮춥니다**.
- 예산을 올리는 변경은 허용하지 않습니다.

## Typography

UI에는 IBM Plex Sans KR 하나만 사용합니다. `next/font/google`이 빌드 시점에 폰트를 받아 프로젝트에서 자체 호스팅하므로 런타임에 폰트 CDN으로 나가는 요청이 없습니다. next/font는 이 CJK 페이스의 메트릭을 보유하지 않아 보정된 fallback face를 만들지 않으므로, swap 시점에 Arial과의 메트릭 차이만큼 레이아웃이 움직입니다. 한글은 별도 subset 이름이 아니라 unicode-range 조각으로 분할되어 제공되므로, 브라우저는 각 화면이 실제로 렌더링하는 글리프 조각과 굵기만 요청합니다. 400/500/600/700 네 굵기를 모두 로드해 semibold를 합성 없이 표시합니다. Geist Mono는 JSON, 코드, ID, 원시 응답처럼 고정폭 정렬이 기능적으로 필요한 데이터에만 사용합니다.

본문 크기는 화면의 성격에 따라 둘로 나뉩니다. 업무 화면은 한 화면에 데이터를 많이 담아야 하므로 본문·입력값·표 셀이 `13px`이고, 로그인처럼 한 번에 한 가지만 하는 독립 진입 화면은 본문·상태 메시지·주 CTA가 `15px`입니다. `15px`은 `body`의 기본값이기도 합니다.

어느 쪽이든 사람이 읽는 모든 텍스트의 하한은 `13px`입니다. 하한은 주석이 아니라 스케일로 강제합니다 — `13px` 아래 단계가 아예 없고, `text-2xs`는 `scripts/check-design-system.mjs`가 차단합니다.

이전에는 `11px`이 "compact label 예외"로 열려 있었고, 그 예외가 제품 전체 타이포의 69%(527곳)를 차지했습니다. 표 셀·보조 설명·본문까지 시스템이 제공하는 가장 작은 크기로 조판되어 있었습니다. 한글은 라틴 문자 한 글자가 쓰는 공간에 자소 두세 개를 담기 때문에, 라틴이 버티는 크기에서 먼저 판독이 무너집니다. 한국어로 읽는 제품이므로 단계 자체를 제거했습니다.

`11px`은 `text-nav` 하나로만 남습니다. GNB 메뉴명은 자기 아이콘 아래에 붙어 있고 고정된 집합으로 외워 읽히므로, 흐르는 문장과 같은 기준을 적용하지 않습니다. `20px`과 `24px`은 인증 화면처럼 독립된 진입 화면의 제목에만 허용합니다.

| Utility | Size / line-height | Role |
| --- | --- | --- |
| `text-nav` | 11 / 18px | GNB menu label only |
| `text-xs` | 13 / 22px | floor: workspace body, input, button, table cell, label, eyebrow, metadata, helper |
| `text-base` | 15 / 24px | page heading, section heading, modal heading; body, status message and primary CTA on a standalone entry screen |
| `text-lg` | 17 / 28px | workspace page heading |
| `text-xl` | 20 / 32px | standalone entry heading only |
| `text-2xl` | 24 / 38px | product name, authentication title only |

허용 font weight는 `400`, `500`, `600`, `700`입니다. 일반 본문은 `400`, 컨트롤은 `500`, 제목은 `600`, 제품명만 `700`을 사용합니다.

한글 중심 UI의 가독성을 위해 기본 자간은 `-0.01em`, 행간은 본문 기준 `1.6`으로 사용합니다. 제품명은 `tight`(`-0.02em`), 대문자 metadata는 `wide`(`0.04em`)만 사용하며, 고정폭 데이터는 자간을 `0`으로 유지합니다.

## Form fields

Label은 필드의 의미를 명확하게 설명합니다. Placeholder는 label이나 입력 지시를 반복하지 않고, 사용자가 입력 형식을 바로 이해할 수 있는 실제 예시만 제공합니다.

모든 입력필드 label과 입력값, Placeholder는 `text-xs`(13px)를 사용합니다. Placeholder는 크기를 따로 갖지 않고 필드의 크기를 물려받습니다 — 힌트와 그 자리를 대신할 입력값이 타이핑 도중 크기가 달라지면 안 되기 때문입니다. 따라서 크기를 정하는 것은 필드 쪽이고, 크기 클래스를 쓰지 않은 필드는 `app/globals.css`의 `input, select, textarea` 기본값인 13px로 떨어집니다. 하한을 13px로 올리면서 label을 입력값보다 작게 두던 위계는 사라졌고, 이제 weight와 color가 그 역할을 합니다 — label은 `font-medium`에 `muted-foreground`, 입력값은 `card-foreground`입니다. Placeholder는 `fg-placeholder` 토큰으로 본문과 명확히 구분하고, 입력값보다 시각적으로 강조하지 않습니다.

로그인과 회원가입은 각각 `/login`, `/signup` 경로를 사용합니다. 회원가입 비밀번호는 8자 이상이며 영문 대문자·소문자, 숫자, 특수문자를 모두 포함해야 하고 비밀번호 확인 값과 일치해야 합니다. 이 규칙은 클라이언트 검증과 로컬 `supabase/config.toml`에 동일하게 적용합니다. 운영 Supabase 프로젝트도 Auth 설정의 password strength를 같은 값으로 유지해야 합니다.

입력필드 포커스 테두리는 파란색 accent가 아니라 `surface-foreground`를 사용해 검정 계열로 표시합니다.

- 이메일 label + `예: name@company.com`
- 페이지 범위 label + `예: 1-5 또는 1,3,5-10`
- 잘못된 예: `이메일을 입력하세요`, `값을 입력하세요`

Placeholder는 보조 정보일 뿐이므로 label을 대신할 수 없습니다. 모든 입력 필드는 화면에 표시되는 label과 연결합니다.

비밀번호, API key, private key처럼 민감한 값에는 실제 값처럼 보이는 예시를 제공하지 않습니다. 비밀번호는 `영문 대·소문자, 숫자, 특수문자 포함 8자리 이상 입력`처럼 보안 조건만 안내할 수 있고, 그 외 민감한 필드는 placeholder를 생략합니다.

## Spacing

Spacing은 다음 9개 값만 사용합니다. `0`은 값 없음의 의미로 허용합니다.

| Tailwind | Value |
| --- | --- |
| `1` | 4px |
| `2` | 8px |
| `3` | 12px |
| `4` | 16px |
| `6` | 24px |
| `8` | 32px |
| `10` | 40px |
| `12` | 48px |
| `16` | 64px |

따라서 `gap-5`, `px-2.5`, `mt-[18px]` 같은 값은 사용하지 않습니다. 콘텐츠 폭과 미리보기 높이처럼 spacing이 아닌 레이아웃 제약은 임의 dimension을 사용할 수 있습니다.

반복되는 컴포넌트 크기는 다음 semantic dimension을 사용합니다.

| Utility | Value | Role |
| --- | --- | --- |
| `h-icon-md`, `w-icon-md` | 20px | primary navigation icon (stroke 1.5, 선택 시 2) |

Lucide 아이콘의 stroke는 24 단위 viewBox 기준이므로 실제 두께는 `strokeWidth × 크기 ÷ 24`입니다. 1px 미만이면 배경과 섞여 아이콘이 지정한 색보다 연하게 보이므로, 16px·20px 아이콘은 `strokeWidth={1.5}`를 사용합니다. 24px 이상에서만 `1`이 1px을 채웁니다.
| `h-control-sm` | 32px | compact control |
| `h-control-md` | 36px | icon button, compact select |
| `h-control-lg` | 40px | default control |
| `h-control-xl` | 48px | primary input and button |
| `h-parser-engine-option` | 56px | Parser additional engine option |
| `h-parser-file-zone` | 200px | Parser file upload and selection region |
| `h-splitter-source` | 320px | Splitter source text workspace |
| `h-topbar` | 56px | top bar including border |
| `w-sidebar` | 72px | app navigation |
| `max-w-auth` | 360px | authentication form |

## Radius

| Utility | Value | Role |
| --- | --- | --- |
| `rounded-sm` | 4px | badge, checkbox, compact item |
| `rounded-lg` | 8px | button, input, panel |
| `rounded-xl` | 12px | modal and large interactive region |
| `rounded-2xl` | 16px | prominent authentication control |
| `rounded-full` | full | circle and pill only |

기본값 `rounded`와 `rounded-md`는 사용하지 않습니다. `rounded-2xl`은 인증 입력필드와 주요 인증 버튼에만 사용합니다.

## Color

UI에서 사용할 수 있는 색상 역할은 아래가 전부입니다.

### Neutral

- `surface`: 전체 작업면
- `card`: 떠 있는 표면과 실제 상호작용 영역
- `muted`: 보조 표면과 비활성 영역
- `upload-zone`: 파일 드래그앤드롭 영역과 강조된 보조 영역
- `surface-foreground`, `card-foreground`: 기본 텍스트
- `muted-foreground`: 보조 텍스트
- `border`, `border-darkest`: 구획
- `border-control`: 입력·선택 컨트롤의 식별 가능한 기본 경계

### Accent

- `accent`, `accent-foreground`: 데이터 시각화처럼 중립색만으로 구분할 수 없는 제한적 상황에만 사용
- 주요 행동, 선택, 포커스는 `surface-foreground`와 중립 표면을 사용합니다.

### Status

- `success`: 완료와 정상
- `warning`: 주의와 검토 필요
- `danger`: 오류와 파괴적 행동

각 상태는 `DEFAULT`, `surface`, `border`만 제공합니다. 상태가 아닌 아이콘이나 장식에는 status color를 사용하지 않습니다.

### Exceptions

- `brand`: 외부 공급자 로고의 흰색 캔버스
- `overlay`: modal backdrop

`red-500`, `blue-50`, `white`, `black` 같은 Tailwind palette 직접 사용은 금지합니다. MVP에는 테마 분기와 `dark:` 유틸리티를 추가하지 않습니다.

## Motion and elevation

| Token | Value | Role |
| --- | --- | --- |
| `duration-fast` | 120ms | press and small hover feedback |
| `duration-normal` | 180ms | default state change |
| `duration-slow` | 300ms | modal and region entrance |

그림자는 `shadow-sm`, `shadow`, `shadow-md`, `shadow-lg`만 사용하며 실제 겹침을 설명할 때만 적용합니다.

## Examples

```tsx
// Correct
<button className="h-control-md rounded-lg bg-surface-foreground px-3 text-xs font-medium text-surface">
  Save
</button>

<p className="rounded-lg border border-danger-border bg-danger-surface p-3 text-xs text-danger">
  Upload failed
</p>

// Incorrect
<button className="h-[42px] rounded-md bg-blue-500 px-5 text-sm text-white">
  Save
</button>
```

## Change rule

새 값을 추가하기 전에 기존 조합으로 해결할 수 없는 기능적 이유가 있어야 합니다. 두 곳 이상에서 반복되고 제품 의미가 명확할 때만 토큰을 확장하며, 전역 다크 팔레트와 이 문서, 계약 테스트를 함께 수정합니다.

모든 UI 변경은 아래 검사를 통과해야 합니다.

```bash
npm run check:design
npm run verify
```
