import assert from "node:assert/strict";
import test from "node:test";
import { renderToStaticMarkup } from "react-dom/server";

import MemoryGuidePanel from "../components/guides/MemoryGuidePanel";

test("memory guide explains the lifecycle, memory types, and implementation methods", () => {
  const markup = renderToStaticMarkup(<MemoryGuidePanel />);

  assert.match(markup, /AI가 기억한다는 것은 무엇인가요/);
  assert.match(markup, /메모리는 다섯 단계로 작동합니다/);
  assert.match(markup, /작업 기억/);
  assert.match(markup, /일화 기억/);
  assert.match(markup, /벡터 메모리/);
  assert.match(markup, /그래프·시간 메모리/);
  assert.match(markup, /계층형 메모리/);
});

test("memory guide compares local tools without presenting an enabled feature", () => {
  const markup = renderToStaticMarkup(<MemoryGuidePanel />);

  assert.match(markup, /Honcho/);
  assert.match(markup, /Mem0/);
  assert.match(markup, /Hindsight/);
  assert.match(markup, /OpenViking/);
  assert.match(markup, /Holographic/);
  assert.match(markup, /RetainDB/);
  assert.match(markup, /ByteRover/);
  assert.match(markup, /Supermemory/);
  assert.match(markup, /핵심 아키텍처/);
  assert.equal((markup.match(/target="_blank"/g) || []).length, 8);
  assert.match(markup, /현재 상태 · Guide only/);
});
