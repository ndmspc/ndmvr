import { Canvas } from "@react-three/fiber";
import { useRef } from "react";
import { createXRStore, XR, XROrigin } from "@react-three/xr";
import { PerspectiveCamera, Sky, KeyboardControls } from "@react-three/drei";
import Scene from "./components/Scene";
import Histogram from "./Histogram";
import VRMovement from "./components/VRMovement";
import VRUI from "./VRUI";
import { useColorStore } from "./utils/colorStore";
import { Button } from "@react-three/uikit-default";

const store = createXRStore();

function App() {
  const xrOriginRef = useRef();
  const toggleColor = useColorStore((s) => s.toggleColor);

  return (

    <div style={{ display: "flex", width: "100vw", height: "100vh" }}>
      <div style={{ width: "50%", height: "100vh", position: "relative" }}>
        <KeyboardControls
          map={[
            { name: "forward", keys: ["ArrowUp", "KeyW"] },
            { name: "backward", keys: ["ArrowDown", "KeyS"] },
            { name: "left", keys: ["ArrowLeft", "KeyA"] },
            { name: "right", keys: ["ArrowRight", "KeyD"] },
            { name: "jump", keys: ["Space"] },
          ]}
        >
          <Canvas shadows>
            <color attach="background" args={["#ececec"]} />
            <PerspectiveCamera makeDefault position={[0, 1.6, 10]} fov={90} />
            <Sky />
            <fog attach="fog" args={["#997D31", 5, 60]} />

            <XR store={store}>
              <Histogram />
              <Scene />
              <VRUI />
              <VRMovement originRef={xrOriginRef} speed={2} />
              <XROrigin ref={xrOriginRef} position={[0, 1.6, 10]} />
            </XR>
          </Canvas>
        </KeyboardControls>

        {/* Enter VR Button */}
        <div
          style={{
            position: "absolute",
            bottom: "20px",
            left: "20px",
            zIndex: 10,
          }}
        >
          <button
            onClick={() => store.enterVR({ optionalFeatures: [] })}
            style={{
              fontSize: "20px",
              padding: "10px 20px",
              cursor: "pointer",
            }}
          >
            Enter VR
          </button>
        </div>
      </div>

      <div
        style={{
          width: "50%",
          height: "100vh",
          display: "flex",
          justifyContent: "center",
          flexDirection: "column",
          alignItems: "center",
          background: "#f0f0f0",
        }}
      >
        <button
          onClick={toggleColor}
          style={{
            fontSize: "24px",
            padding: "16px 32px",
            cursor: "pointer",
          }}
        >
          Change Color
        </button>
        {/* <Canvas><Button variant="outline"  > Buttton</Button></Canvas> */}
        <div
          id="histo"
          style={{ position: "relative", width: "800px", height: "600px" }}
        ></div>
      </div>
    </div>
  );
}

export default App;
