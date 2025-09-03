import {Canvas} from "@react-three/fiber";
import Scene from "../lib/components/Scene.jsx";
import {useRef, useState} from "react";
import {PerspectiveCamera} from "@react-three/drei";
import {XR, XROrigin} from "@react-three/xr";
import CameraSync from "./CameraSync.jsx";
import VRUI from "./VRUI/VRUI.jsx";
import Controllers from "./Controllers.jsx";
import Switch from "./Switch.jsx";
import {store} from "../App.jsx";

export default function SceneWrapper(props) {
  const xrOriginRef = useRef();
  const cameraRef = useRef();
  const [showMenu, setShowMenu] = useState(true);

  return (
      <div
        style={{ width: "100%", height: "100%", ...props.style }}
      >
        <Canvas shadows>
          <color attach="background" args={["#ececec"]} />
          <PerspectiveCamera
            ref={cameraRef}
            makeDefault
            position={[0, 1.6, 10]}
            fov={90}
          />

          <XR store={store}>
            <CameraSync cameraRef={cameraRef} originRef={xrOriginRef} />

            <Scene />

            {showMenu && <VRUI originRef={xrOriginRef} />}

            <Controllers
              originRef={xrOriginRef}
              cameraRef={cameraRef}
              showMenu={showMenu}
              setShowMenu={setShowMenu}
            />
            <XROrigin ref={xrOriginRef} position={[0, 1.6, 10]} />
          </XR>

        </Canvas>
      </div>
  );
}