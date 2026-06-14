import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const css = readFileSync(new URL("../styles.css", import.meta.url), "utf8");

function mediaBlock(maxWidth) {
  const marker = `@media (max-width: ${maxWidth}px)`;
  const start = css.indexOf(marker);
  assert.notEqual(start, -1, `${marker} should exist`);
  const next = css.indexOf("@media", start + marker.length);
  return css.slice(start, next === -1 ? undefined : next);
}

test("tablet and mobile navigation uses horizontal scrolling instead of squeezed columns", () => {
  const block = mediaBlock(920);

  assert.match(block, /\.nav-list\s*{[^}]*display:\s*flex/s);
  assert.match(block, /\.nav-list\s*{[^}]*overflow-x:\s*auto/s);
  assert.match(block, /\.nav-item\s*{[^}]*flex:\s*0 0 auto/s);
  assert.match(block, /\.nav-item\s*{[^}]*min-width:\s*76px/s);
  assert.match(block, /\.nav-item\s*{[^}]*white-space:\s*nowrap/s);
  assert.doesNotMatch(block, /grid-template-columns:\s*repeat\(5,\s*minmax\(0,\s*1fr\)\)/);
});

test("mobile content spacing matches compact fixed navigation height", () => {
  const tabletBlock = mediaBlock(920);
  const mobileBlock = mediaBlock(620);

  assert.match(tabletBlock, /\.main-content\s*{[^}]*padding-top:\s*82px/s);
  assert.match(mobileBlock, /\.main-content\s*{[^}]*padding:\s*82px 18px 18px/s);
});

test("mobile layout constrains wide panels and market controls to viewport", () => {
  const tabletBlock = mediaBlock(920);
  const mobileBlock = mediaBlock(620);

  assert.match(css, /html\s*{[^}]*overflow-x:\s*hidden/s);
  assert.match(css, /\.app-shell\s*{[^}]*min-width:\s*0/s);
  assert.match(css, /\.main-content\s*{[^}]*max-width:\s*100%/s);
  assert.match(css, /\.panel\s*{[^}]*max-width:\s*100%/s);
  assert.match(css, /\.provider-summary span,\s*\n\.provider-capabilities span\s*{[^}]*max-width:\s*100%/s);
  assert.match(tabletBlock, /\.sidebar\s*{[^}]*max-width:\s*100vw/s);
  assert.match(tabletBlock, /\.nav-list\s*{[^}]*max-width:\s*100%/s);
  assert.match(mobileBlock, /\.market-tabs\s*{[^}]*max-width:\s*100%/s);
});

test("hidden route sections cannot be displayed by layout rules", () => {
  assert.match(css, /\[hidden\]\s*{[^}]*display:\s*none\s*!important/s);
});
