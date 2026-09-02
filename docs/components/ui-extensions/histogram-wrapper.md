# HistogramWrapper

## Introduction

`HistogramWrapper` is a React Three Fiber component that connects histogram data from the NDMVR communication layer with the 3D scene. It is responsible for rendering the histogram object, handling user interaction with histogram bins, and displaying additional UI helpers used for inspection and editing.

The component acts as the main integration layer between histogram streams, renderer configuration, scene interaction, and helper components such as `BinBox` and `BoundingFrameBox`.

`HistogramWrapper` supports both the standard NDMVR histogram renderer and the JSROOT renderer. Depending on the selected renderer, the component creates the corresponding visualization object and manages its lifecycle inside the scene.

## Usage

```tsx
<HistogramWrapper id="histogram-1" />
```

## Props

| Name | Type | Required | Description |
|---|---|---:|---|
| `id` | `string` | Yes | Unique identifier of the histogram stream that should be rendered in the scene. |

## Main responsibilities

`HistogramWrapper` provides the following functionality:

| Responsibility | Description |
|---|---|
| Histogram rendering | Creates and updates the 3D histogram object according to the received histogram data. |
| Renderer selection | Uses either the standard NDMVR renderer or the JSROOT renderer depending on the configuration. |
| Interaction handling | Handles click, double-click, hover, and shifted interaction variants. |
| Bin inspection | Displays `BinBox` for the currently hovered or selected bin. |
| Modify mode support | Displays `BoundingFrameBox` when the histogram is editable. |
| Configuration updates | Emits updated histogram bounds after editing. |
| Resource cleanup | Disposes obsolete Three.js objects when the rendered object changes or the component is unmounted. |

## Rendering behavior

The component subscribes to the histogram stream using the provided `id`. When new histogram data or configuration is received, the component decides which renderer should be used.

If the histogram uses the standard NDMVR renderer, `HistogramWrapper` creates a histogram painter object and inserts the generated Three.js object into the scene.

If the histogram uses the JSROOT renderer, the component creates a JSROOT-based histogram object instead. In this mode, editing through `BoundingFrameBox` is not enabled, because the editing logic is connected to the internal NDMVR histogram representation.

## Interaction model

The component supports several interaction types used by the histogram system.

| Interaction | Event name |
|---|---|
| Mouse click | `mouseclick` |
| Mouse double-click | `mousedbclick` |
| Shift + mouse click | `shiftmouseclick` |
| Shift + mouse double-click | `shiftmousedbclick` |
| Pointer move / hover | `mousemove` |

The same interaction model is reused in desktop and VR environments. In VR mode, the controller squeeze action can be interpreted as a shifted interaction, which allows the application to keep the same logic for mouse and controller input.

## Bin inspection

When bin information display is enabled, `HistogramWrapper` renders the `BinBox` component around the currently hovered bin.

The wrapper prepares the data required by `BinBox`, including:

| Data | Description |
|---|---|
| Position | Center position of the selected bin. |
| Scale | Size of the selected bin in the 3D scene. |
| Axis ranges | Minimum and maximum values for displayed axes. |
| Content label | Textual information about the bin value. |

Example:

```tsx
<BinBox
    position={hoveredBinFrameData.position}
    scale={hoveredBinFrameData.scale}
    axisRanges={hoveredBinFrameData.axisRanges}
    contentLabel={hoveredBinFrameData.contentLabel}
    color="#ffff00"
    showOnlyOnHover={false}
    labelFontSize={64}
    passThroughPointerEvents={true}
/>
```

## Modify mode

When modify mode is active, `HistogramWrapper` displays the `BoundingFrameBox` component around the rendered histogram.

The bounding frame allows the user to resize the histogram directly in the 3D scene. During dragging, the wrapper receives the updated frame position and scale. After the drag operation ends, these values are converted back into histogram bounds and sent to the configuration stream.

Example:

```tsx
{painterLimits && modifyModeEnabled && !isJsrootRenderer && (
    <BoundingFrameBox
        position={getBoundingFramePosition(painterLimits)}
        scale={getBoundingFrameScale(painterLimits)}
        shiftScaleStep={currentShiftStep}
        onChange={onBoundingBoxChange}
        onDragEnd={onBoundingBoxDragEnd}
    />
)}
```

## Internal helpers

`HistogramWrapper` uses helper logic to keep rendering, interaction, and configuration updates separated from the main component structure.

| Helper / helper logic | Description |
|---|---|
| `getBoundingFramePosition()` | Calculates the center position of the editable bounding frame from histogram limits. |
| `getBoundingFrameScale()` | Calculates the size of the editable bounding frame according to histogram dimensions. |
| Hovered bin data conversion | Converts hovered bin data into position, scale, axis ranges, and text content for `BinBox`. |
| Bounds conversion | Converts the edited bounding frame position and scale back into histogram pad bounds. |
| Histogram stream access | Receives histogram data from the communication layer using the histogram identifier. |
| Configuration stream access | Sends updated histogram configuration after editing. |
| Object cleanup | Removes obsolete Three.js objects and disposes their resources when necessary. |

These helpers are used internally by the component and are not intended to be used directly by external components.

## Lifecycle

`HistogramWrapper` manages the lifecycle of the rendered histogram object.

When the component receives new data, it updates or recreates the rendered object. When the renderer type changes or the component is unmounted, old Three.js objects are removed from the scene and disposed.

This prevents obsolete geometry, materials, or renderer instances from remaining in memory.

## Related components

| Component | Relationship |
|---|---|
| `BinBox` | Used to display information about the currently hovered histogram bin. |
| `BoundingFrameBox` | Used to resize the histogram in modify mode. |

## Notes

`HistogramWrapper` is the central component for the improved histogram interaction workflow. It does not only render the histogram, but also coordinates additional UI helpers, user interaction, edit mode behavior, and configuration updates.
