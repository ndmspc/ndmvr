# BinBox

## Introduction

`BinBox` is a React Three Fiber helper component used to display contextual information about a selected or hovered histogram bin.

The component renders a semi-transparent 3D box around a bin, highlights its boundaries, and displays textual information directly in the 3D scene. It is mainly used for improving readability and helping users understand the exact position, size, and value of a selected histogram bin.

`BinBox` is usually controlled by `HistogramWrapper`, which provides the required position, scale, axis ranges, and content label.

## Usage

```tsx
<BinBox
    position={[0, 2, 0]}
    scale={[4, 3, 4]}
    axisRanges={[
        { axis: "x", title: "X axis", min: 0, max: 10 },
        { axis: "y", title: "Y axis", min: 5, max: 20 },
        { axis: "z", title: "Z axis", min: 2, max: 8 }
    ]}
    contentLabel="Bin value: 128"
    color="#ffff00"
    showOnlyOnHover={false}
/>
```

## Props

| Name | Type | Required | Default | Description |
|---|---|---:|---|---|
| `position` | `THREE.Vector3 \| { x: number; y: number; z: number } \| [number, number, number]` | Yes | — | Position of the box in the 3D scene. |
| `scale` | `THREE.Vector3 \| { x: number; y: number; z: number } \| [number, number, number]` | Yes | — | Size of the box on the X, Y, and Z axes. |
| `axisRanges` | `BinBoxAxisRange[]` | No | `[]` | List of axis ranges displayed in the information block. |
| `contentLabel` | `string` | No | — | Main text displayed inside the box, usually representing the bin value. |
| `color` | `string` | No | `"#ffff00"` | Primary color used for the box outline and highlight. |
| `labelFontSize` | `number` | No | `56` | Base font size used for labels. |
| `showOnlyOnHover` | `boolean` | No | `true` | If enabled, the information is displayed only while the user hovers over the box. |
| `onHoverChange` | `(hovered: boolean) => void` | No | — | Callback called when the hover state changes. |
| `passThroughPointerEvents` | `boolean` | No | `true` | Allows pointer events to pass through the helper overlay to objects behind it. |

## BinBoxAxisRange

```ts
interface BinBoxAxisRange {
    axis: "x" | "y" | "z" | string;
    title: string;
    min?: number;
    max?: number;
}
```

## Visual structure

`BinBox` consists of several visual layers.

| Layer | Description |
|---|---|
| Invisible hitbox | Used for hover detection when the component should react to pointer events. |
| Glow mesh | Slightly larger transparent box used to visually highlight the selected bin. |
| Wall mesh | Semi-transparent box representing the volume of the selected bin. |
| Edge lines | Visible boundary lines around the selected bin. |
| Axis markers | Labels showing orientation of the X, Y, and Z axes. |
| Information label | Text block displaying the bin value and axis ranges. |

## Behavior

The component displays the selected bin as an additional visual overlay. It does not modify the original histogram geometry.

If `showOnlyOnHover` is enabled, the information label is shown only when the user hovers over the component. If it is disabled, the information is always visible.

The component can also be configured to ignore pointer blocking. This is useful when the user should still be able to interact with the histogram behind the `BinBox`.

## Camera-aware labels

`BinBox` adjusts label placement according to the camera position. This improves readability because labels are placed on sides that are more visible to the user.

The label size is also adapted according to the camera distance. This helps keep the text readable when the user moves closer to or farther away from the histogram.

## Internal helpers

`BinBox` uses internal helper logic for visual calculations.

| Helper / helper logic | Description |
|---|---|
| Vector normalization | Converts `position` and `scale` props into `THREE.Vector3` values. |
| Label placement calculation | Determines suitable label positions based on camera direction. |
| Distance-based text scaling | Adjusts label size according to the distance between the camera and the box. |
| Axis range formatting | Formats axis minimum and maximum values for display. |
| Hover state handling | Controls whether the information block should be visible. |

These helpers are used only inside the component and are not part of the public API.

## Example with always visible information

```tsx
<BinBox
    position={[1, 1, 1]}
    scale={[2, 2, 2]}
    contentLabel="Content: 42"
    axisRanges={[
        { axis: "x", title: "X", min: 0, max: 1 },
        { axis: "y", title: "Y", min: 10, max: 20 },
        { axis: "z", title: "Z", min: 5, max: 15 }
    ]}
    showOnlyOnHover={false}
/>
```

## Example with hover callback

```tsx
<BinBox
    position={[0, 0, 0]}
    scale={[1, 1, 1]}
    contentLabel="Selected bin"
    onHoverChange={(hovered) => {
        console.log("BinBox hovered:", hovered);
    }}
/>
```

## Related components

| Component | Relationship |
|---|---|
| `HistogramWrapper` | Provides selected bin data and controls when `BinBox` is displayed. |

## Notes

`BinBox` improves the readability of histogram data in 3D and VR environments. It gives the user direct visual feedback about the selected bin without requiring the user to interpret the bin position only from the histogram geometry.

