# BoundingFrameBox

## Introduction

`BoundingFrameBox` is an interactive React Three Fiber component used for resizing histogram objects directly in the 3D scene.

The component renders a bounding frame around the selected histogram and provides draggable edges and corners. It is intended to be used in modify mode, where the user can change the size and bounds of the histogram visually.

`BoundingFrameBox` is usually rendered by `HistogramWrapper`, which passes the current position and scale of the histogram and receives updated values through callbacks.

## Usage

```tsx
<BoundingFrameBox
    position={[0, 2, 0]}
    scale={[10, 4, 10]}
    shiftScaleStep={{ x: 2, y: 1, z: 2 }}
    onChange={(position, scale) => {
        console.log("Current frame:", position, scale);
    }}
    onDragEnd={(position, scale) => {
        console.log("Final frame:", position, scale);
    }}
/>
```

## Props

| Name | Type | Required | Default | Description |
|---|---|---:|---|---|
| `position` | `THREE.Vector3 \| { x: number; y: number; z: number } \| [number, number, number]` | Yes | — | Center position of the bounding frame. |
| `scale` | `THREE.Vector3 \| { x: number; y: number; z: number } \| [number, number, number]` | Yes | — | Current size of the bounding frame. |
| `shiftScaleStep` | `{ x: number; y: number; z: number }` | No | — | Step values used for snapping when snap scaling is active. |
| `onChange` | `(position: THREE.Vector3, scale: THREE.Vector3) => void` | No | — | Called continuously while the user is dragging the frame. |
| `onDragEnd` | `(position: THREE.Vector3, scale: THREE.Vector3) => void` | No | — | Called once after the drag operation ends. |

## Main responsibilities

`BoundingFrameBox` provides the following functionality:

| Responsibility | Description |
|---|---|
| Frame rendering | Displays a visual frame around the editable histogram object. |
| Edge dragging | Allows resizing the frame along one main direction. |
| Corner dragging | Allows resizing the frame using corner handles. |
| Hover feedback | Highlights the currently hovered editable part of the frame. |
| Drag calculation | Calculates new position and scale during user interaction. |
| Snapping | Supports step-based resizing when snap scaling is enabled. |
| Minimum size control | Prevents invalid or inverted frame dimensions. |

## Interaction model

The component contains interactive parts that can be dragged by the user.

| Element | Description |
|---|---|
| Edges | Used to resize the frame along the selected axis or direction. |
| Corners | Used to resize the frame from a corner point. |

When the user hovers over an editable part of the frame, it is visually highlighted. When the user starts dragging, the component calculates a drag plane and uses pointer movement to update the frame dimensions.

## Drag behavior

Dragging is based on raycasting. The component creates a ray from the active input source and intersects it with a drag plane. The result is used to calculate the new position and scale of the frame.

The same drag logic can be used for mouse input and VR controller input. This makes the component suitable for both desktop and immersive environments.

During dragging, the component calls `onChange` with the current position and scale.

After dragging ends, the component calls `onDragEnd` with the final values.

## Snapping

`BoundingFrameBox` supports snapping through the `shiftScaleStep` prop. When snap scaling is active, the new scale is rounded according to the provided step values.

Example:

```tsx
<BoundingFrameBox
    position={[0, 0, 0]}
    scale={[10, 5, 10]}
    shiftScaleStep={{ x: 2, y: 1, z: 2 }}
/>
```

Snap scaling can be controlled by the application through a custom event.

```ts
window.dispatchEvent(
    new CustomEvent("ndmvr-shiftstep-scale", {
        detail: { pressed: true }
    })
);
```

When the event indicates that snapping is active, the component applies step-based resizing.

## Minimum scale

The component enforces a minimum scale on all axes. This prevents the frame from becoming invisible, inverted, or invalid during resizing.

This is important because resizing is performed interactively and the user can drag the frame in different directions.

## UI interaction locking

While the frame is being dragged, the component marks the UI interaction state as active. This prevents conflicts with other controls, such as camera movement or histogram selection.

After the drag operation ends, the interaction state is released.

## Internal helpers

`BoundingFrameBox` uses internal helper logic for interaction and resizing.

| Helper / helper logic | Description |
|---|---|
| Vector normalization | Converts `position` and `scale` props into `THREE.Vector3` values. |
| Unified ray calculation | Creates a common ray representation for mouse and VR controller input. |
| Drag plane calculation | Defines the plane used to calculate drag movement. |
| Resize direction detection | Determines which edge or corner is being edited. |
| Scale snapping | Rounds the new scale according to `shiftScaleStep`. |
| Minimum scale validation | Prevents invalid scale values. |
| Hover state handling | Tracks which frame element is currently hovered. |
| Drag state handling | Tracks whether the frame is currently being dragged. |

These helpers are internal implementation details and are not part of the public component API.

## Example with continuous update

```tsx
<BoundingFrameBox
    position={framePosition}
    scale={frameScale}
    onChange={(newPosition, newScale) => {
        setFramePosition(newPosition);
        setFrameScale(newScale);
    }}
/>
```

## Example with final update only

```tsx
<BoundingFrameBox
    position={framePosition}
    scale={frameScale}
    onDragEnd={(newPosition, newScale) => {
        updateHistogramBounds(newPosition, newScale);
    }}
/>
```

## Related components

| Component | Relationship |
|---|---|
| `HistogramWrapper` | Renders `BoundingFrameBox` in modify mode and converts the edited frame values into histogram bounds. |

## Notes

`BoundingFrameBox` is used to make histogram resizing more intuitive. Instead of changing numeric configuration values manually, the user can directly manipulate the histogram bounds in the 3D scene.
