import { useEffect, useRef } from "react";
import * as THREE from "three";
import { computeBinSizePos } from "./utils/HistogramRenderUtils";
import histogramData from "./data/TH3D.json";
import { redraw, parse } from "jsroot";


export default function Histogram({
  binScale = 1,
  padding = { x: 0.01, y: 0.01, z: 0.01 },
  contentMin = 0,
  size = { x: 1, y: 1, z: 1 },
  offset = { x: 0, y: 0, z: 0 },
}) {
  const meshRef = useRef();
  const dummy = new THREE.Object3D();

  function UserHandler(kind, info) {
    console.log(kind, info);
  }

  useEffect(() => {
    const obj = histogramData;
    const rootObj = parse(histogramData);
    const fXbins = obj.fXaxis.fNbins;
    const fYbins = obj.fYaxis.fNbins;
    const fZbins = obj.fZaxis.fNbins;
    const totalBins = fXbins * fYbins * fZbins;

    const maxVal = Math.max(...obj.fArray);

    const geometry = new THREE.BoxGeometry(1, 1, 1);
    const material = new THREE.MeshStandardMaterial({ color: "red" });
    const instanced = new THREE.InstancedMesh(geometry, material, totalBins);

    let index = 0;

    for (let z = 1; z <= fZbins; z++) {
      for (let y = 1; y <= fYbins; y++) {
        for (let x = 1; x <= fXbins; x++) {
          const content = obj.fArray[index];

          if (content < contentMin) {
            dummy.scale.set(0, 0, 0);
          } else {
            const scaleFactor = (content / maxVal) * binScale;
            const pos = computeBinSizePos(obj, { x, y, z }, padding, size);

            dummy.position.set(
              pos.x.pos + offset.x,
              pos.y.pos / 2 + offset.y,
              pos.z.pos + offset.z
            );
            dummy.scale.set(
              pos.x.size * scaleFactor,
              pos.y.size * scaleFactor,
              pos.z.size * scaleFactor
            );
          }

          dummy.updateMatrix();
          instanced.setMatrixAt(index, dummy.matrix);
          index++;
        }
      }
    }

    instanced.instanceMatrix.needsUpdate = true;
    meshRef.current.add(instanced);
    redraw("histo", rootObj, "").then((painter) => {
      painter.configureUserClickHandler((info) => UserHandler("click", info));
    });
  }, []);

  return <group ref={meshRef} />;
}
