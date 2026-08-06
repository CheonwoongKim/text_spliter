import assert from "node:assert/strict";
import test from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";

import ModalDialog from "../components/shared/ModalDialog";

test("modal dialog markup exposes a labelled modal and named close control", () => {
  const markup = renderToStaticMarkup(
    createElement(
      ModalDialog,
      { title: "Split Result", description: "3 chunks", onClose: () => undefined },
      createElement("p", null, "Dialog content")
    )
  );

  assert.match(markup, /role="dialog"/);
  assert.match(markup, /aria-modal="true"/);
  assert.match(markup, /aria-labelledby="[^"]+"/);
  assert.match(markup, /aria-label="Close Split Result"/);
  assert.match(markup, /<h2 id="[^"]+"[^>]*>Split Result<\/h2>/);
});
