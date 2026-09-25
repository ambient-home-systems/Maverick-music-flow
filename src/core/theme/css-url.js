// Wraps a URL in CSS url("..."). Quotes, parentheses and backslashes are
// percent-encoded and line breaks dropped, so the value cannot end the string
// or the url() token. Pass the result through _esc when it goes into an HTML
// style attribute.
export function cssUrl(url) {
  const safe = String(url ?? "")
    .replace(/[\n\r\f]/g, "")
    .replace(/["'()\\]/g, (char) => `%${char.charCodeAt(0).toString(16).toUpperCase()}`);
  return `url("${safe}")`;
}
