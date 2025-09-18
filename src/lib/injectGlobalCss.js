// my-lib/injectGlobalCss.ts
const CSS = `
html, body, #root { height: 100%; margin: unset; }
`;

export function injectGlobalCss() {
  if (typeof document === 'undefined') return;
  const id = 'my-lib-global-css';
  if (document.getElementById(id)) return;     
  const style = document.createElement('style');
  style.id = id;
  style.appendChild(document.createTextNode(CSS));
  document.head.appendChild(style);
}
