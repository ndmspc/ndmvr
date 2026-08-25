# ADR 0002: Histogram workspace and active-pad ownership

## Context

Histogram state was split across scene and UI components. `NdmvrContent` merged configured
pad streams and implicitly treated the most recently updated histogram as active, while
`DrawOptions` subscribed to core state subjects through a scene-owned React context. Layer
and outline scene-mode actions separately targeted `pad1`.

This made data arrival change selection, coupled UI code to scene ownership, and prevented
multi-pad commands from consistently targeting the histogram selected by the user.

The package declarations also advertised `HistogramContext`, but the package barrel exported
it with `export type`, so the runtime ESM bundle did not provide that value. There is therefore
no working package-level runtime context API to retain.

## Decision

Histogram workspace behavior is owned by neutral modules under
`src/lib/stores/histogramWorkspace`.

- The Zustand state module owns configured pads, the active pad ID, and per-pad histogram and
  core-state snapshots.
- The core adapter owns configuration, histogram, and state-subject subscriptions and the
  corresponding publish operations.
- Domain commands own pad activation and pad-specific updates used by components and scene
  modes.
- An internal facade is the only histogram-workspace import boundary for the rest of the
  application. It is not part of the package's public barrel.
- Adapter lifecycle is reference counted. The first consumer starts the shared subscriptions;
  the final consumer schedules their teardown and workspace reset for the next task. An
  immediate remount cancels that teardown, and release functions are idempotent.

The first configured pad is active initially. Histogram and pad-state emissions never alter
the active pad. If configuration removes the active pad, the first remaining configured pad
becomes active; with no pads the active ID is `null`.

The dependency direction is:

```text
scene / UI / scene-mode consumers
              |
              v
      histogram commands/facade
          |             |
          v             v
     workspace state   core adapter
                            |
                            v
                       ndmvr-core subjects
```

## Alternatives considered

### Keep a React context in `NdmvrContent`

This would preserve scene ownership and require non-component scene-mode actions to use a
different active-pad mechanism.

### Put all workspace behavior in one Zustand module

This provides one file to import but mixes state transitions, RxJS lifecycle, core transport,
and domain commands. Separate modules keep those responsibilities testable while the facade
preserves one domain boundary.

### Export a compatibility `HistogramContext`

A compatibility provider would add a new runtime API rather than preserve the published
bundle's behavior. The incorrect declaration is removed and the workspace remains internal
until a concrete external API is required.

## Consequences

- Active-pad selection is explicit and independent of histogram arrival order.
- Draw options and pad-specific scene actions consistently target the same pad.
- Multiple workspace consumers share subscriptions safely, including across React Strict Mode
  setup and cleanup cycles.
- Components no longer access histogram or state subjects directly for workspace behavior.
- Single-pad behavior remains unchanged, and no active-pad highlighting or data-routing change
  is introduced.
- External workspace access would require a separate public-API decision and export.
