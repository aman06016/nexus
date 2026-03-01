"use client";

import { Canvas, useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useState } from "react";
import * as THREE from "three";

function HorizonMesh() {
  const material = useMemo(
    () =>
      new THREE.ShaderMaterial({
        transparent: true,
        side: THREE.DoubleSide,
        uniforms: {
          uTime: { value: 0 },
          uColorA: { value: new THREE.Color("#57e8ff") },
          uColorB: { value: new THREE.Color("#6a62ff") }
        },
        vertexShader: `
          varying vec2 vUv;
          uniform float uTime;

          float hash(vec2 p) {
            return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
          }

          float noise(vec2 p) {
            vec2 i = floor(p);
            vec2 f = fract(p);
            float a = hash(i);
            float b = hash(i + vec2(1.0, 0.0));
            float c = hash(i + vec2(0.0, 1.0));
            float d = hash(i + vec2(1.0, 1.0));
            vec2 u = f * f * (3.0 - 2.0 * f);
            return mix(a, b, u.x) + (c - a) * u.y * (1.0 - u.x) + (d - b) * u.x * u.y;
          }

          float fbm(vec2 p) {
            float value = 0.0;
            float amp = 0.55;
            for (int i = 0; i < 4; i++) {
              value += amp * noise(p);
              p *= 2.0;
              amp *= 0.5;
            }
            return value;
          }

          void main() {
            vUv = uv;
            vec3 pos = position;
            float ridge = smoothstep(0.18, 0.82, uv.x) * smoothstep(0.22, 0.78, 1.0 - abs(uv.y - 0.5) * 2.0);
            float n = fbm(vec2(uv.x * 3.6 + uTime * 0.16, uv.y * 6.0 - uTime * 0.24));
            float displacement = (n - 0.5) * 0.22 * ridge;
            pos.z += displacement;
            pos.y += sin(uv.x * 7.2 + uTime * 1.35) * 0.025 * ridge;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
          }
        `,
        fragmentShader: `
          varying vec2 vUv;
          uniform vec3 uColorA;
          uniform vec3 uColorB;

          void main() {
            float center = 1.0 - abs(vUv.y - 0.5) * 2.0;
            float ribbon = smoothstep(0.0, 0.9, center);
            float mesh = (sin(vUv.x * 120.0) * 0.5 + 0.5) * 0.14 + (sin(vUv.y * 80.0) * 0.5 + 0.5) * 0.09;
            vec3 color = mix(uColorA, uColorB, vUv.x);
            float alpha = ribbon * (0.34 + mesh);
            gl_FragColor = vec4(color, alpha);
          }
        `
      }),
    []
  );

  useFrame((state) => {
    material.uniforms.uTime.value = state.clock.elapsedTime;
  });

  return (
    <mesh>
      <planeGeometry args={[5.9, 0.62, 200, 32]} />
      <primitive object={material} attach="material" />
    </mesh>
  );
}

export function DataHorizonDivider() {
  const [render3D, setRender3D] = useState(false);

  useEffect(() => {
    const canvas = document.createElement("canvas");
    const context = canvas.getContext("webgl2") || canvas.getContext("webgl");
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const deviceMemory =
      "deviceMemory" in navigator ? (navigator as Navigator & { deviceMemory?: number }).deviceMemory ?? 8 : 8;
    setRender3D(Boolean(context) && !reducedMotion && deviceMemory > 4);
  }, []);

  return (
    <section className="relative overflow-hidden rounded-xl border border-borderSoft/70 bg-bgSecondary/65 px-3 py-2">
      <div className="pointer-events-none absolute left-0 right-0 top-1/2 h-px -translate-y-1/2 bg-gradient-to-r from-transparent via-accentSecondary/40 to-transparent" />
      {render3D ? (
        <div className="h-20 w-full">
          <Canvas camera={{ position: [0, 0, 2.6], fov: 36 }} dpr={[1, 1.8]}>
            <ambientLight intensity={0.4} />
            <pointLight position={[1.5, 0.6, 2]} intensity={0.8} color="#57e8ff" />
            <pointLight position={[-1.5, -0.4, 2]} intensity={0.65} color="#6a62ff" />
            <HorizonMesh />
          </Canvas>
        </div>
      ) : (
        <div className="h-20 w-full rounded-lg bg-gradient-to-r from-accentSecondary/20 via-accentPrimary/15 to-accentSecondary/20" />
      )}
      <p className="mt-1 text-center text-[10px] uppercase tracking-[0.18em] text-textTertiary">Data Horizon</p>
    </section>
  );
}
