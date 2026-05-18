/** Minimal paint styles inlined before full Tailwind bundle — improves FCP on cold loads. */
export const ROOT_CRITICAL_CSS = `
:root {
  color-scheme: dark;
}
html {
  overflow-x: clip;
}
body {
  margin: 0;
  min-height: 100dvh;
  overflow-x: clip;
  background-color: #030712;
  color: #f8fafc;
  font-family: system-ui, -apple-system, "Segoe UI", sans-serif;
}
`.trim();
