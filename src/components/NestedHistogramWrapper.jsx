import { useEffect, useRef } from "react";
import { useThree } from "@react-three/fiber";
import * as THREE from "three";
import {
  functionSubjectGet,
  histogramSubjectGet,
  NestedHistogram,
} from "@ndmspc/ndmvr-aframe";
import { filter } from "rxjs";

export default function NestedHistogramWrapper({
  id,
  px = 0.1,
  py = 0.1,
  pz = 0.1,
}) {
  const { scene } = useThree();
  const instancedMesh = useRef(null);

  useEffect(() => {
    const subFunction = functionSubjectGet()
      .getObservable()
      .pipe(
        filter((e) => e.target.id.includes("*") || e.target.id.includes(id))
      )
      .subscribe((f) => {
        if (!instancedMesh.current) return;
        if (f.flag === "add") {
          instancedMesh.current.addEvent(f.event, f.function);
        } else if (f.flag === "remove") {
          instancedMesh.current.removeEvent(f.event, f.function);
        }
      });
    console.log(subFunction);

    const histoSub = histogramSubjectGet()
      .getStream()
      .pipe(filter((e) => e.id === id))
      // .subscribe((histo) => {
      //   if (instancedMesh.current) {
      //     instancedMesh.current.remove();
      //   }
      //   instancedMesh.current = new NestedHistogram(px, py, pz, histo, id);
      //   instancedMesh.current.init();

      //   scene.add(instancedMesh.current.instancedMesh);
      //   instancedMesh.current.renderHistogram(
      //     0,
      //     instancedMesh.current.totalInstances,
      //     0
      //   );
      // });
      .subscribe((histo) => {
        instancedMesh.current?.remove?.();

        const nh = new NestedHistogram(px, py, pz, histo, id);
        instancedMesh.current = nh;

        nh.init?.();
        if (!instancedMesh.current || !nh?.instancedMesh) return;

        scene.add(nh.instancedMesh);

        nh.renderHistogram?.(0, nh.totalInstances, 0);
        if (!instancedMesh.current || !nh?.instancedMesh) return;

        const box = new THREE.Box3().setFromObject(nh.instancedMesh);
        const lift = Math.max(0, -box.min.y);
        nh.instancedMesh.position.y = lift + 0.01;
      });

    return () => {
      // instancedMesh.current.dispose();
      // scene.remove(instancedMesh.current);
      histoSub.unsubscribe();
      subFunction.unsubscribe();
      // console.log(subFunction);
    };
  }, [scene]);

  return null;
}
