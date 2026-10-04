# Refactoring regression baseline

Run `npm test` with Node 24 and the existing project dependencies installed.
The suite uses Node's built-in test runner; no additional framework is needed.

- Core configuration checks exercise the installed `1.2.0-rc.4` package, not a
  replacement implementation. Recheck these contracts deliberately on upgrade.
- Workspace checks load the existing TypeScript store and adapter together with
  esbuild, leaving dependencies external so they share the real Core singleton.
- Configuration tests cover immediate replay, accepted publication, object
  merging, pad-array replacement, vector/grid normalization, and the same-root
  emission from `appendPads()`. Partial vector replacement is a Core constraint,
  not behavior that Settings should expose to users.
- Workspace checks cover pad selection/cache reconciliation, Core histogram and
  state replay/live delivery, shared subscriptions, idempotent release, deferred
  teardown, and reacquisition. Drawing-state checks exercise fresh shallow
  envelopes and selector notifications for repeated Core object emissions while
  retaining nested references and the existing workspace lifecycle.
  `NdmvrContent` remains the sole production workspace lifetime owner.
- Settings checks load the existing schema helpers with esbuild and exercise
  accepted patches against real Core: complete coordinates, invalid drafts,
  independent replacement-grid recipes/prefixes, same-reference synchronization,
  atomic JSON imports with omission preservation, runtime-array rejection, and
  reset of Settings defaults without changing unrelated configuration.
- Snap-step checks cover the schema-defined nested coordinates, legacy per-axis
  fallback, initial canonical values, and snapshots from replay/external and
  same-reference Core emissions. Existing frame activation and step rules stay
  unchanged.
- Histogram-wrapper lifecycle checks mount the actual component with real React
  effects, React DOM, the installed jsdom, and real Three.js objects. Test-only
  esbuild substitutions provide the surrounding scene/UI and controlled Core
  painters. They cover renderer replacement, settled update reuse, stale async
  resolution/rejection, mesh interception, live resource cleanup/fallbacks,
  id/camera/scene changes, unmount, StrictMode replay, and delayed-click retirement.
- Spatial-origin checks mount the production Menu, ModeToolsPanel,
  FloatingContainer, spatial hook/helpers, and DesktopMenuOverlay with real
  React/Three.js. The installed SDK XROrigin is a sibling of the composed UI;
  its camera attachment and real XR store frame/session binding drive origin
  discovery. Test-only Canvas/UIKit rendering and input delivery adapters cover
  ref-free XR placement, first-frame readiness, live origin replacement, explicit
  ref overrides, follow/drag/reset, session entry/exit, desktop camera-relative
  placement and overlay/fullscreen presentation, and StrictMode replay.
- Component-composition checks mount the production Base, standard environment,
  histogram content, Menu, ModeToolsPanel, input bindings/controllers, mobile
  controls, DOM fullscreen/menu controls, and both Ndmspc wrappers plus the
  JSROOT environment with real React and the installed Core/workspace and XR
  store. Canvas/UIKit/styled
  rendering primitives, painter bodies, and heavyweight default panel bodies are
  substituted. They cover empty Base ownership, the single keyboard collector,
  canonical camera/speeds including same-reference Core emissions,
  scene-coordinate siblings beneath XR, histogram
  workspace teardown, standard Menu composition, deprecated Content overrides,
  desktop/XR transitions, mobile event routing, integration control ownership,
  preserved mounted VR/renderer switching, browser histogram routing through a
  controlled HierarchyPainter, and ordinary JSROOT histogram redraw routing.

The store/configuration checks are non-rendering. The mounted wrapper checks
exercise React ownership and cleanup against controlled painters; they do not
validate actual Core/JSROOT painting, WebGL, browser controls, or XR. Esbuild
loading also does not type-check; retain the existing type-check and
library/application build checks.
Settings tests exercise the helpers and Core publication contracts; mounted
UIKit input and FileReader interactions still need browser verification.
Spatial checks use a minimal session/WebXR-manager substitute and do not validate
hardware tracking, headset input or UIKit layout/raycast delivery. They preserve
the existing local-position mechanics: customized transformed parent groups are
outside this step's supported composition and are not newly generalized.
Composition checks exercise runtime ownership and React/event wiring; they do not
validate WebGL rendering, CSS placement, real fullscreen permission, default
panel transport operations, physical touch, or headset input. The JSROOT redraw
implementation and HierarchyPainter are controlled while environment
subscriptions and histogram renderer routing remain real.

CI runs this suite in the existing `test-prod` job before its builds. That job's
existing exclusions for `main` and tags are unchanged.

## Final refactoring verification

Run all regressions, type checking, the library build, and the application build:

```text
npm test
npm run type-check
npm run build
npm run build-app
git diff --check
```

Inspect `dist/ndmvr.d.ts` after the library build, before the application build
replaces the output directory. Check the exported Base/Env/Content and panel APIs,
their deprecated compatibility props, and the absence of removed Cinema exports.
Run ESLint and Prettier checks on the refactoring's changed files; unrelated
repository-wide findings should be reported as existing findings rather than
fixed as part of this work. The [public composition guide](../README.md) describes
the supported component and lifecycle contract.

Final automated results at Step 8 completion (2026-10-02):

| Verification               | Result                                                                                                                                                                                                                                                                                                                      |
| -------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `npm test`                 | Passed: 87 tests, including the 15 mounted composition regressions.                                                                                                                                                                                                                                                         |
| `npm run type-check`       | Passed.                                                                                                                                                                                                                                                                                                                     |
| `npm run build`            | Passed; generated the ESM library and declarations. Existing API Extractor/TypeScript version warning remains.                                                                                                                                                                                                              |
| Generated API and examples | Checked required value/type exports, Base's children-only props, seven deprecated props, and absence of Cinema/HistogramContext exports. Nine README/docs entry TSX snippets compiled against the generated declarations, with application-defined `My*` components supplied as placeholders and the host's Vite CSS types. |
| `npm run build-app`        | Passed. Existing Three/Lottie dependency eval warning remains.                                                                                                                                                                                                                                                              |
| Scoped ESLint              | 19 source files: 61 errors and 2 warnings, matching the latest per-file snapshots from Steps 2-7. No source changes were made in Step 8.                                                                                                                                                                                    |
| Prettier                   | All six updated documentation files, the two new composition test files, and Base pass. Eight existing source files in the 19-file scope still have formatting differences; they were not reformatted in this documentation step.                                                                                           |
| `git diff --check`         | Passed.                                                                                                                                                                                                                                                                                                                     |

The lint scope is the union of the prior step scopes: environment components,
Content/decorations/HistogramWrapper and its bounding helpers, FloatingContainer,
Settings/schema helpers, spatial mechanics, workspace state, the public barrel,
and local Core declarations. Existing formatting differences are in
NdmspcDefaultBrowserEnv, NdmspcEnv, HistogramWrapper, bounding-box helpers,
NdmvrContent, SceneDecorations, the public barrel and spatial XR helpers.

Manual browser/mobile/XR acceptance remains necessary:

- Render the standard Env, a custom Base with Content and Menu, and a Base scene
  without histograms. Check floor/lighting, panel layout, and world-coordinate
  placement.
- Check fullscreen entry/exit and Menu-toggle visibility with and without a
  mounted Menu. Switch both Ndmspc environments between their existing views and
  confirm only the active control pair is visible and histogram routing persists.
- Exercise Settings scalar edits, replacement-grid drafts, JSON imports and
  reset through the actual UIKit controls and browser FileReader.
- Verify both histogram renderer branches, draw-option changes, rapid updates,
  renderer replacement and scene unmount with real Core/JSROOT rendering.
- Check physical touch movement/cancellation, resize/orientation changes, pointer
  capture, and editable-input shortcut suppression.
- Enter and exit a headset XR session; check Menu/ModeToolsPanel placement,
  follow/drag/reset, controller movement and histogram shortcuts, plus explicit
  legacy origin-ref overrides.

Remaining deferred work includes upstream Core async/resource gaps that local
React retirement cannot cancel, `shiftScale.enabled`, and isolation of the
existing singleton stores. The retained inert Cinema configuration fields are
deferred cleanup, not supported Cinema functionality. This refactoring does not
generalize spatial mechanics for transformed parent groups or redesign unrelated
JSROOT redraw lifetimes.
Package metadata still points its CommonJS entry to a UMD artifact that the
ESM-only library build does not produce; package metadata alignment is deferred.
