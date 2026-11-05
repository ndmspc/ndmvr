---
title: NDMVR
summary: Documentation for the NDMVR project
authors:
  - Martin Vala
  - Oleh Leshchenko
  - Daniel Chovanec
some_url: https://ndmspc.gitlab.io/ndmvr/docs
---

# NDMVR

`@ndmspc/ndmvr` is the React Three Fiber layer of the NDMVR project: it puts an interactive 3D view
of an N-dimensional histogram on top of [`@ndmspc/ndmvr-core`](https://ndmspc.gitlab.io/ndmvr-core/docs/),
with a menu, bin information, draw options and optional WebXR support.

|                |                                               |
| -------------- | --------------------------------------------- |
| **Demo**       | <https://ndmspc.gitlab.io/ndmvr/>             |
| **npm**        | <https://www.npmjs.com/package/@ndmspc/ndmvr> |
| **Source**     | <https://gitlab.com/ndmspc/ndmvr>             |
| **User guide** | <https://ndmspc.gitlab.io/docs/>              |

## What it provides

- `NdmvrEnv` / `NdmvrBase` — the scene host; `interactive` turns input on and off without tearing
  the canvas, camera or histograms down.
- Histogram layers, bin selection, bin information, draw options and outline controls.
- A menu and scene-mode store shared with the core library's subjects.
- WebXR: the same scene runs in a headset, with XR locomotion and hit testing.

## Install

```bash
npm install @ndmspc/ndmvr @ndmspc/ndmvr-core three
```

`@ndmspc/ndmvr` expects the host application to provide React, React DOM, Three.js and the peer
versions declared in `package.json`.

## Controlling interaction

```tsx
import { NdmvrEnv } from "@ndmspc/ndmvr";

<NdmvrEnv interactive={isSceneActive} />;
```

`interactive` defaults to `true`. Changing it keeps the Canvas, camera, histograms and rendering
alive; each Canvas has its own input gate, so disabling one does not disable another.

When `false`, NDMVR disables scene pointer and wheel events, camera controls, mobile movement
buttons, keyboard/VR action bindings, XR locomotion and hit testing, and DOM controls. It also clears
pending clicks, hover feedback and active drags; an in-progress histogram resize finishes at its
current bounds and existing selections are preserved.

The surrounding page still receives input and scroll. Core's native histogram keyboard handlers
(numeric layers, reset, parent navigation, outlines) remain active, and an XR head-tracking session
continues — `interactive` controls input, not the session.

Fullscreen uses the NDMVR container, including its Canvas and controls.

## Development

```bash
npm ci
npm run dev        # demo app
npm run build      # library
npm run lint
npm run fmt:check
npm test
```

Commits are checked by husky and lint-staged.

## Architecture decisions

See [ADR 0001](adr/0001-shared-interaction-infrastructure.md) for the shared interaction
infrastructure between `ndmvr` and `ndmvr-core`.
