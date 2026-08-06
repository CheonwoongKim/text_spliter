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

기본 UI는 중립색으로 구성합니다. 색상은 주요 액션과 실제 상태를 구분할 때만 사용합니다.

### 5. Same meaning in every theme

라이트와 다크는 동일한 semantic token을 사용합니다. 컴포넌트에서 `dark:` 색상을 직접 선택하지 않습니다.

### 6. Accessible by default

본문은 12px보다 작게 만들지 않습니다. 키보드 포커스를 숨기지 않으며 색상만으로 상태를 전달하지 않습니다. 모션 감소 설정을 존중합니다.

## Source of truth

```text
styles/design-tokens.css → tailwind.config.ts → app/globals.css / components
```

- [design-tokens.css](../styles/design-tokens.css): 모든 원시 값과 테마 값
- [tailwind.config.ts](../tailwind.config.ts): 허용된 유틸리티만 노출
- [globals.css](../app/globals.css): 기본 typography와 전역 interaction
- [check-design-system.mjs](../scripts/check-design-system.mjs): 허용되지 않은 값 차단

## Typography

UI에는 Geist Sans 하나만 사용합니다. Geist Mono는 JSON, 코드, ID, 원시 응답처럼 고정폭 정렬이 기능적으로 필요한 데이터에만 사용합니다.

최소 font size는 `12px`, 최대 font size는 `24px`입니다.

| Utility | Size / line-height | Role |
| --- | --- | --- |
| `text-xs` | 12 / 16px | label, metadata, table heading |
| `text-base` | 14 / 20px | body, input, button, table cell |
| `text-lg` | 16 / 24px | section heading |
| `text-xl` | 20 / 28px | page heading |
| `text-2xl` | 24 / 32px | product name, standalone title |

허용 font weight는 `400`, `500`, `600`, `700`입니다. 일반 본문은 `400`, 컨트롤은 `500`, 제목은 `600`, 제품명만 `700`을 사용합니다.

Letter spacing은 기본 `normal`, 제품명은 `tight`, 대문자 metadata는 `wide`만 사용합니다.

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
| `h-control-sm` | 32px | compact control |
| `h-control-md` | 36px | icon button, compact select |
| `h-control-lg` | 40px | default control |
| `h-control-xl` | 48px | primary input and button |
| `h-topbar` | 64px | top bar including border |
| `w-sidebar` | 80px | app navigation |

## Radius

| Utility | Value | Role |
| --- | --- | --- |
| `rounded-sm` | 4px | badge, checkbox, compact item |
| `rounded-lg` | 8px | button, input, panel |
| `rounded-xl` | 12px | modal and large interactive region |
| `rounded-full` | full | circle and pill only |

기본값 `rounded`와 `rounded-md`는 사용하지 않습니다.

## Color

UI에서 사용할 수 있는 색상 역할은 아래가 전부입니다.

### Neutral

- `surface`: 전체 작업면
- `card`: 떠 있는 표면과 실제 상호작용 영역
- `muted`: 보조 표면과 비활성 영역
- `surface-foreground`, `card-foreground`: 기본 텍스트
- `muted-foreground`: 보조 텍스트
- `border`, `border-darkest`: 구획

### Accent

- `accent`, `accent-foreground`: 주요 행동, 선택, 포커스
- 진행 중이나 정보 상태는 새로운 파란색을 추가하지 않고 `accent`를 사용합니다.

### Status

- `success`: 완료와 정상
- `warning`: 주의와 검토 필요
- `danger`: 오류와 파괴적 행동

각 상태는 `DEFAULT`, `surface`, `border`만 제공합니다. 상태가 아닌 아이콘이나 장식에는 status color를 사용하지 않습니다.

### Exceptions

- `brand`: 외부 공급자 로고의 흰색 캔버스
- `overlay`: modal backdrop

`red-500`, `blue-50`, `white`, `black` 같은 Tailwind palette 직접 사용과 컴포넌트의 `dark:` 색상 분기는 금지합니다.

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
<button className="h-control-lg rounded-lg bg-accent px-4 text-base font-medium text-accent-foreground">
  Save
</button>

<p className="rounded-lg border border-danger-border bg-danger-surface p-3 text-base text-danger">
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
