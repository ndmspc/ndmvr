import { Canvas } from "@react-three/fiber";
import { useRef, useState } from "react";
import { createXRStore, XR, XROrigin } from "@react-three/xr";
import { PerspectiveCamera } from "@react-three/drei";
import Scene from "./components/Scene";
import Controllers from "./components/Controllers";
import VRUI from "./components/VRUI/VRUI";
import Switch from "./components/Switch";
import CameraSync from "./components/CameraSync";

// eslint-disable-next-line react-refresh/only-export-components
export const store = createXRStore();

function App() {
  const xrOriginRef = useRef();
  const cameraRef = useRef();
  const [show2D, setShow2D] = useState(false);
  const [showMenu, setShowMenu] = useState(true);

  const JSROOT_IMAGE_ID = "histo";

  return (
    <div
      style={{
        display: "flex",
        width: "100%",
        height: "100vh",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <div
        style={{
          display: show2D ? "none" : "block",
          width: "100%",
          height: "100vh",
        }}
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

      <div
        id="histogram"
        style={{
          display: !show2D ? "none" : "block",
          width: "100%",
          height: "100vh",
        }}
      >
        <div id={JSROOT_IMAGE_ID} style={{ width: "800px", height: "800px" }}></div>
      </div>

      <div

        style={{
          position: "absolute",
          bottom: "20px",
          left: "20px",
          zIndex: 10,
        }}
      >
        <Switch checked onToggle={(checked) => setShow2D(checked)} />
      </div>
    </div>
  );
}

export default App;
