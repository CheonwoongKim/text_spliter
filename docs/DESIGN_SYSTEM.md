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

기본 UI와 주요 액션은 검정과 중립색으로 구성합니다. 색상은 성공, 경고, 오류처럼 실제 상태를 구분할 때만 사용합니다.

### 5. One theme for the MVP

MVP는 라이트 테마 하나만 제공합니다. 테마 상태, 토글, 다크 전용 토큰과 컴포넌트의 `dark:` 분기를 추가하지 않습니다.

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

## Typography

UI에는 Spoqa Han Sans Neo 하나만 사용합니다. WOFF2 파일은 프로젝트에서 자체 호스팅하고 `next/font/local`의 fallback metric 보정을 적용해 font swap 레이아웃 이동을 줄입니다. 모든 굵기를 선로딩하지 않고 각 화면에서 실제 사용하는 굵기만 브라우저가 요청합니다. Geist Mono는 JSON, 코드, ID, 원시 응답처럼 고정폭 정렬이 기능적으로 필요한 데이터에만 사용합니다.

업무 화면의 기본 본문과 입력값은 `13px`, section heading은 `15px`, page heading은 `17px`을 사용합니다. `11px`은 eyebrow, label, metadata, table heading, compact tab·helper text, Top bar breadcrumb에 사용하고, `10px`은 GNB 메뉴명에만 사용하는 예외 토큰입니다. `20px`과 `24px`은 인증 화면처럼 독립된 진입 화면의 제목에만 허용합니다.

| Utility | Size / line-height | Role |
| --- | --- | --- |
| `text-nav` | 10 / 16px | GNB menu label only |
| `text-2xs` | 11 / 16px | eyebrow, label, metadata, compact tab/helper, table heading, breadcrumb |
| `text-xs` | 13 / 20px | workspace body, input, button, table cell |
| `text-base` | 15 / 24px | workspace section heading, modal heading |
| `text-lg` | 17 / 26px | workspace page heading |
| `text-xl` | 20 / 30px | standalone entry heading only |
| `text-2xl` | 24 / 36px | product name, authentication title only |

허용 font weight는 `400`, `500`, `600`, `700`입니다. 일반 본문은 `400`, 컨트롤은 `500`, 제목은 `600`, 제품명만 `700`을 사용합니다.

한글 중심 UI의 가독성을 위해 기본 자간은 `-0.01em`, 행간은 본문 기준 `1.6`으로 사용합니다. 제품명은 `tight`(`-0.02em`), 대문자 metadata는 `wide`(`0.04em`)만 사용하며, 고정폭 데이터는 자간을 `0`으로 유지합니다.

## Form fields

Label은 필드의 의미를 명확하게 설명합니다. Placeholder는 label이나 입력 지시를 반복하지 않고, 사용자가 입력 형식을 바로 이해할 수 있는 실제 예시만 제공합니다.

모든 입력필드 label은 `text-2xs`(11px), 입력값과 Placeholder는 `text-xs`(13px)를 사용합니다. Label weight는 기본 `400`, compact control에서만 `500`을 허용합니다. Placeholder는 `fg-placeholder` 토큰으로 본문과 명확히 구분하고, 입력값보다 시각적으로 강조하지 않습니다.

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
| `h-icon-md`, `w-icon-md` | 20px | primary navigation icon |
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
- `upload-zone`: 파일 드래그앤드롭 영역 전용 `#f8f9fa` 표면
- `surface-foreground`, `card-foreground`: 기본 텍스트
- `muted-foreground`: 보조 텍스트
- `border`, `border-darkest`: 구획

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

`red-500`, `blue-50`, `white`, `black` 같은 Tailwind palette 직접 사용은 금지합니다. MVP에는 다크 테마와 `dark:` 분기를 추가하지 않습니다.

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

새 값을 추가하기 전에 기존 조합으로 해결할 수 없는 기능적 이유가 있어야 합니다. 두 곳 이상에서 반복되고 제품 의미가 명확할 때만 토큰을 확장하며, 라이트/다크 값과 이 문서, 계약 테스트를 함께 수정합니다.

모든 UI 변경은 아래 검사를 통과해야 합니다.

```bash
npm run check:design
npm run verify
```
