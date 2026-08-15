Decouple shared interaction infrastructure from components

Move shared interaction logic out of component-specific modules into neutral interaction/store modules.

Refactor the current interaction infrastructure, including:

* `useInputFocus` and `useUIInteraction` stores;
* `getUnifiedRay`;
* `MoveAndRotation` and related desktop/XR helpers, types and persistence;
* shared interaction event names/types;
* `shouldUseMobileControls`.

The goal is to remove unnecessary dependencies between UI, scene, environment and input/controller components and establish a clear shared interaction boundary.

Preserve current behavior and public API. Do not redesign the event mechanism or interaction algorithms.

Add an ADR describing the new interaction infrastructure boundary.

### Out of scope

* `HistogramContext` / active histogram handling;
* `DrawOptions`;
* `HistogramWrapper` split;
* scene modes;
* environment restructuring;
* repository-wide structure changes.

### Acceptance criteria

* Shared interaction infrastructure no longer belongs to component modules.
* UI, scene, environment and controllers consume it from neutral modules.
* Existing desktop, mobile and XR behavior remains unchanged.
* Old misplaced modules are removed.
* Type-check, lint and builds pass.
* ADR is added.