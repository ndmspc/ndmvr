import { useThree } from "@react-three/fiber";
import { useEffect, useState } from "react";
import { functionSubjectGet, NdmvrRaycaster } from "@ndmspc/ndmvr-aframe";

export default function Raycaster() {
  const { scene } = useThree();
  const [raycaster, setRaycaster] = useState(null);

  useEffect(() => {
    if (scene) {
      setRaycaster(new NdmvrRaycaster(scene));
    }
  }, [scene]);

  const functions = [
    {
      event: "mouseclick",
      target: {
        entity: "nested-histogram",
        id: "*",
      },
      function: function (event, context) {
        context.showChildHistogram(event.index);
        context.setPointerToChild(
          context.computeJsRootIndexFromPosition(event.index)
        );

        const t = context.getChildByPosition(
          context.pointer.origin,
          event.index
        );

        const i = event.computeJsRootIndexFromPosition(event.index);

        const l = event.splice(-1);

        t.getBinError(i);
      },
    },
    {
      event: "shiftmouseclick",
      target: {
        entity: "nested-histogram",
        id: "*",
      },
      function: function (event, context) {
        context.hideChildHistogram(event.index);
      },
    },
    {
      event: "mousedbclick",
      target: {
        entity: "nested-histogram",
        id: "*",
      },
      function: function (event, context) {
        context.setPointerToChild(
          context.computeJsRootIndexFromPosition(event.index),
          "unlikepm"
        );
      },
    },
    {
      event: "shiftmousedbclick",
      target: {
        entity: "nested-histogram",
        id: "*",
      },
      function: function (event, context) {
        context.setPointerToParent();
      },
    },
    {
      event: "mousemove",
      target: {
        entity: "nested-histogram",
        id: "*",
      },
      function: function (event, context) {
        // console.log('mousemove: ', event);
        // this.showChildHistogram(event)
      },
    },
  ];

  useEffect(() => {
    setTimeout(() => functionSubjectGet().addFunctions(functions), 100);
  }, []);

  return null;
}
