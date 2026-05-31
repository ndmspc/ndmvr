import { useMemo } from "react";
import * as THREE from "three";

const SKY_TOP_COLOR = "#96b9e7";
const SKY_HORIZON_COLOR = "#bed6e3";

function GradientSky() {
    const uniforms = useMemo(
        () => ({
            topColor: { value: new THREE.Color(SKY_TOP_COLOR) },
            horizonColor: { value: new THREE.Color(SKY_HORIZON_COLOR) },
            exponent: { value: 0.75 },
        }),
        [],
    );

    return (
        <mesh renderOrder={-1000}>
            <sphereGeometry args={[500, 32, 16]} />
            <shaderMaterial
                side={THREE.BackSide}
                depthWrite={false}
                fog={false}
                uniforms={uniforms}
                vertexShader={`
                    varying vec3 vWorldPosition;

                    void main() {
                        vec4 worldPosition = modelMatrix * vec4(position, 1.0);
                        vWorldPosition = worldPosition.xyz;
                        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
                    }
                `}
                fragmentShader={`
                    uniform vec3 topColor;
                    uniform vec3 horizonColor;
                    uniform float exponent;
                    varying vec3 vWorldPosition;

                    void main() {
                        float height = normalize(vWorldPosition).y;
                        float gradient = pow(smoothstep(-0.05, 0.85, height), exponent);
                        gl_FragColor = vec4(mix(horizonColor, topColor, gradient), 1.0);
                    }
                `}
            />
        </mesh>
    );
}

export default function SceneDecorations() {
    const grid = useMemo(() => new THREE.GridHelper(100, 100), []);
    const axes = useMemo(() => new THREE.AxesHelper(5), []);

    return (
        <>
            <GradientSky />
            <fog attach="fog" args={[SKY_HORIZON_COLOR, 45, 130]} />
            <ambientLight intensity={0.4} />
            <directionalLight position={[0, 5, 5]} intensity={1} />

            <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
                <planeGeometry args={[100, 100]} />
                <meshStandardMaterial color="lightgray" />
            </mesh>

            <primitive object={grid} />
            <primitive object={axes} />
        </>
    );
}
