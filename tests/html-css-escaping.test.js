// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import { createMaverickBaseMusicCard } from "../src/core/base-music-card.js";
import { cssUrl } from "../src/core/theme/css-url.js";
const { document } = globalThis;
const proto = createMaverickBaseMusicCard({}).prototype;

describe("_esc", () => {
  it("escapes all five HTML-significant characters", () => {
    expect(proto._esc(`&<>"'`)).toBe("&amp;&lt;&gt;&quot;&#39;");
    expect(proto._esc(`<img src=x onerror='alert(1)'>`)).toBe("&lt;img src=x onerror=&#39;alert(1)&#39;&gt;");
    expect(proto._esc(null)).toBe("");
  });
});

describe("cssUrl", () => {
  it("wraps plain URLs unchanged", () => {
    expect(cssUrl("https://example.com/art.jpg?size=300")).toBe('url("https://example.com/art.jpg?size=300")');
  });
  it("neutralises quotes, parentheses, backslashes and newlines", () => {
    const value = cssUrl(`x.jpg"); background:red; ('\\\n\r\f`);
    expect(value).toBe('url("x.jpg%22%29; background:red; %28%27%5C")');
    expect(value.slice(5, -2)).not.toMatch(/["'()\\\n\r\f]/);
  });
  it("stays a single url() value inside an HTML style attribute", () => {
    const art = `a.jpg'); background-image:url('https://evil.example/x`;
    const host = document.createElement("div");
    host.innerHTML = `<div style="background-image:${proto._esc(cssUrl(art))}"></div>`;
    const el = host.firstElementChild;
    expect(el.getAttributeNames()).toEqual(["style"]);
    expect(el.getAttribute("style")).toBe(`background-image:${cssUrl(art)}`);
    expect(el.getAttribute("style").match(/url\(/g)).toHaveLength(1);
  });
});
