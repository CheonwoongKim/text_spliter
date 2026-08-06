import assert from "node:assert/strict";
import test from "node:test";
import { getEncoding } from "@langchain/core/utils/tiktoken";

import { splitText } from "../lib/splitters";

test("token splitting preserves Korean and emoji at overlapping token boundaries", async () => {
  const source = [
    "문서 처리 워크벤치는 사용자가 원본 문서를 업로드하고 여러 파서의 결과를 비교합니다. 😀",
    "텍스트 분할 단계에서는 청크 크기와 중첩을 조절하고 검색 근거를 보존합니다.",
    "평가 결과는 재현 가능한 기록으로 남아야 합니다.",
  ].join("\n\n");
  const result = await splitText(source, {
    splitterType: "TokenTextSplitter",
    chunkSize: 20,
    chunkOverlap: 5,
    encodingName: "cl100k_base",
  });
  const tokenizer = await getEncoding("cl100k_base");

  assert.ok(result.totalChunks > 1);
  assert.equal(result.chunks.some((chunk) => chunk.content.includes("�")), false);
  assert.equal(result.chunks[0].metadata.startIndex, 0);
  assert.equal(result.chunks.at(-1)?.metadata.endIndex, source.length);

  for (const [index, chunk] of result.chunks.entries()) {
    assert.equal(
      source.slice(chunk.metadata.startIndex, chunk.metadata.endIndex),
      chunk.content
    );
    assert.ok(chunk.metadata.endIndex <= source.length);
    assert.ok(tokenizer.encode(chunk.content).length <= 20);
    if (index > 0) {
      assert.ok(chunk.metadata.startIndex > result.chunks[index - 1].metadata.startIndex);
      assert.ok(chunk.metadata.startIndex <= result.chunks[index - 1].metadata.endIndex);
    }
  }
});
