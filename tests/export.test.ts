import { describe, expect, it } from "vitest";
import { inlineClientHtml } from "../src/cli/export.js";

describe("standalone export", () => {
  it("inlines assets without interpreting minified replacement tokens", () => {
    const source = '<html><head><link rel="stylesheet" href="/assets/app.css"></head><body><script type="module" crossorigin src="/assets/app.js"></script></body></html>';
    const javascript = 'const replacement="$&"; console.log(replacement);';
    const output = inlineClientHtml(source, ".app{color:red}", javascript, '{"snapshot":{}}');
    expect(output).not.toContain('src="/assets/app.js"');
    expect(output).not.toContain('href="/assets/app.css"');
    expect(output).toContain(javascript);
    expect(output).toContain("window.__LINEARSKY_DATA__");
  });
});
