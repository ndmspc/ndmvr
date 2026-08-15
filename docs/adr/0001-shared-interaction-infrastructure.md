# ADR 0001: Shared interaction infrastructure boundary

## Context

Interaction state and behavior is shared by UI components, React Three Fiber scene objects,
environment shells, and desktop, mobile, and XR controllers. Previously, several of these
shared modules lived inside component folders. This made scene and controller code depend on
UI implementation paths, presented hooks and utilities as components, and left cross-layer
DOM event contracts duplicated as string literals.

The affected behavior includes input-focus and pointer-interaction guards, pointer-ray
normalization, floating spatial UI manipulation, mobile-control capability detection, and the
custom events used to coordinate those interactions.

## Decision

Shared interaction behavior is owned by neutral modules under `src/lib/interactions`, while
shared Zustand interaction state is owned by `src/lib/stores/interaction`.

- Pointer normalization and device capability detection are plain utilities.
- Floating spatial UI behavior is implemented as a hook subsystem with independent types,
  desktop behavior, XR behavior, and persistence helpers.
- Cross-layer interaction event names and payload types are defined in one module.
- Existing Zustand stores and DOM `CustomEvent` transport are retained.
- Component modules produce or consume interactions but do not own cross-layer interaction
  infrastructure.

The dependency direction is:

```text
UI / scene / environment / controller components
                    |
                    v
       interaction modules and stores
```

Interaction modules and stores must not import component modules. Platform-specific spatial
helpers depend on shared spatial types rather than importing their orchestrating hook.

## Alternatives considered

### Keep shared modules colocated with their first consumer

This minimizes file movement but preserves inverted dependencies and makes ownership unclear
as additional consumers are added.

### Replace custom events with Context or a global store

This could provide a more structured transport, but it would change runtime behavior and
requires a separate decision about state and event architecture. It is outside this refactor.

### Combine all interaction state into one store

This would couple independent focus and pointer-interaction lifecycles. The existing stores
remain separate until a concrete need justifies merging them.

## Consequences

- Components across layers can consume interaction functionality without depending on other
  component areas.
- Spatial interaction types and platform helpers can evolve without creating reverse imports
  into the hook module.
- Event names and payloads are discoverable and less likely to drift.
- Existing algorithms, event wire values, persistence keys, and public package exports remain
  unchanged.
- The boundary adds several small internal modules, but each has an explicit responsibility.
- Future changes to event transport or store strategy require a separate ADR and migration.
