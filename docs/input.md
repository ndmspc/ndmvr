# Internal input bindings

`DesktopController` owns desktop movement and camera look. `VRController` owns XR movement
and snap turning. `MobileMoveController` remains a separate DOM component with direction
callbacks beside the Canvas. `NdmvrEnv` forwards those callbacks through the `mobile-move`
window event; `DesktopController` keeps its own held-direction set. Desktop movement combines
it with keyboard state without changing keyboard holds. Desktop unmount clears mobile
directions so holds cannot carry across controller or XR transitions.

Features register shortcuts directly with `useInputBinding`, under the existing Canvas/XR
ancestors. `NdmvrContent` mounts the existing `KeyboardListener`. No additional input provider,
action registry or public remapping configuration is needed.

```tsx
// Inside Menu, before its hidden-state early return:
useInputBinding({
    keyboard: { code: "KeyM", ctrl: false },
    vr: { hand: "right", button: "b-button", grip: false },
    onPress: toggleMenu,
});

// Inside BoundingFrameBox:
useInputBinding({
    keyboard: { code: ["ShiftLeft", "ShiftRight"] },
    vr: { hand: "right", button: "xr-standard-trigger" },
    onChange: setSnapPressed,
});
```

Keyboard strings are `KeyboardEvent.code` values; an array means either key. `ctrl` and
`grip` qualify a primary-button press: changing the modifier while the primary button stays
down does not create another press. For combination edges, use a VR `chord`, such as
`{ hand: "right", chord: ["xr-standard-squeeze", "b-button"] as const }`. It fires when
the whole combination becomes pressed, in either order.

`onPress` fires once per press. `onChange` reports aggregate held state across keyboard and
VR: releasing one source leaves it true while another is held. False also means cancellation,
including unmount; it must not be used as a commit-on-release action. Mounting or
changing an XR controller initializes held state without firing a press. Binding descriptors
stay fixed while mounted; callbacks may be inline and update on rerender.

Bindings stop with their feature. Keep a feature mounted while hidden if its shortcut must
reopen it. Scene-mode and bin-box toggles live in persistent `NdmvrContent`, because their
controls may be absent and there may be several histograms.

| Owner | Bindings |
| --- | --- |
| Menu | M / right B without grip |
| NdmvrContent | Ctrl+M / right grip+A for mode; B / right grip+B for bin box |
| BoundingFrameBox | Either Shift / right trigger for snapping |
| useMoveAndRotation | R / left X for reset; right A without grip for following; Shift for rotation; right grip + left stick for spatial movement |
| HistogramWrapper | Local squeeze-start/end gesture state for modified clicks |

Histogram squeeze gestures retain WebXR event semantics, including holds from either hand,
instead of being converted to sampled button thresholds.

Editable DOM controls block bindings, including UIKit's hidden native input elements.
Blur, document/session visibility loss,
source removal, session end and unmount cancel the relevant holds. Pointer cancellation and
pointer ownership cleanup also remain. Mobile and keyboard holds are independent.

The hook is internal and uses the existing XR context and keyboard store. It has no arbitration
between duplicate bindings and no cross-hand chord or commit-on-release API. Those are not
needed by current features. Existing singleton stores and window events remain; this change
does not provide multiple-environment isolation. Help, its export/props and H/Y shortcuts have
been removed, along with unused controller Menu/Help
callbacks and old spatial window-event adapters. Menu tabs are local; only visibility and mount
status are shared with the external menu button.

Run `npm run type-check`, `npm run lint`, `npm run build`, and
`npm run build-app -- --outDir dist/app`. No automated input tests are currently configured. Real touch,
pointer capture, headset input and histogram rendering require browser/device validation.
