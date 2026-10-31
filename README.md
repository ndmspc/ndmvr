# React + Vite

## Controlling the NDMVR scene

```tsx
import { NdmvrEnv } from "@ndmspc/ndmvr";

<NdmvrEnv interactive={isSceneActive} />;
```

`interactive` defaults to `true`. It is also available on `NdmvrBase` for custom
scene compositions. Changing it keeps the Canvas, camera, histograms, and rendering
alive. Each Canvas has its own input gate; disabling one does not disable another.

When false, NDMVR disables scene pointer and wheel events, desktop/touch camera
controls, mobile movement buttons, its keyboard/VR action bindings, XR locomotion,
XR hit testing, and its DOM controls. Its UIKit text inputs are disabled too.
Pending single clicks, hover feedback, held actions, and active drags are cleared.
An in-progress histogram resize finishes at its current bounds. Existing histogram
selections are preserved. The surrounding page can still receive input and scroll.

Core's native histogram keyboard handlers remain active: numeric layer shortcuts,
reset, parent-layer navigation, and outline visibility. Core has no supported
per-painter enable/disable API for those handlers. NDMVR does not intercept global
keyboard events to suppress them. XR head tracking also continues; disabling
interaction does not stop an XR session. Custom child components with their own
DOM/window listeners must manage those listeners themselves. Existing shared Core
subjects, menu/scene-mode stores, and the exported XR store remain shared; this prop
controls input, not independent scene data or simultaneous XR sessions.

Fullscreen uses the NDMVR container, including its Canvas and controls. The button
and the browser's Escape behavior exit fullscreen normally.

This template provides a minimal setup to get React working in Vite with HMR and linting via [oxlint](https://oxc.rs/docs/guide/usage/linter).

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Babel](https://babeljs.io/) for Fast Refresh
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/) for Fast Refresh

## Linting and formatting

- `npm run lint` — lint with oxlint
- `npm run fmt` — format with oxfmt
- `npm run fmt:check` — verify formatting

Commits are checked by husky and lint-staged.
