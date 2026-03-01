"use client";

import Link from "next/link";
import { Canvas, useFrame } from "@react-three/fiber";
import { Float, Line, Points, PointMaterial } from "@react-three/drei";
import * as THREE from "three";
import { useEffect, useMemo, useState } from "react";

type SignalCoreHeroProps = {
  liveVelocity: number;
  freshCount: number;
  primaryCount: number;
  monitoredSources: number;
};

type SignalCoreSceneProps = {
  liveVelocity: number;
  scrollActivated: boolean;
};

function SignalCoreScene({ liveVelocity, scrollActivated }: SignalCoreSceneProps) {
  const [mouse, setMouse] = useState({ x: 0, y: 0 });
  const particlePositions = useMemo(() => {
    const points: number[] = [];
    const radius = 2.8;
    for (let i = 0; i < 320; i += 1) {
      const theta = (Math.PI * 2 * i) / 320;
      const jitter = (Math.sin(i * 0.77) + Math.cos(i * 0.23)) * 0.18;
      points.push(
        Math.cos(theta) * (radius + jitter),
        Math.sin(theta * 1.2) * 0.9 + Math.cos(theta * 0.4) * 0.28,
        Math.sin(theta) * (radius + jitter)
      );
    }
    return new Float32Array(points);
  }, []);

  const filamentA = useMemo(
    () =>
      [...new Array(42)].map((_, idx) => {
        const t = (idx / 41) * Math.PI * 2;
        return new THREE.Vector3(
          Math.cos(t) * 2.35,
          Math.sin(t * 1.8) * 0.42,
          Math.sin(t) * 2.35
        );
      }),
    []
  );

  const filamentB = useMemo(
    () =>
      [...new Array(42)].map((_, idx) => {
        const t = (idx / 41) * Math.PI * 2;
        return new THREE.Vector3(
          Math.sin(t * 1.1) * 2.05,
          Math.cos(t * 1.3) * 0.38,
          Math.cos(t) * 2.05
        );
      }),
    []
  );

  useEffect(() => {
    const onMove = (event: MouseEvent) => {
      const x = (event.clientX / window.innerWidth - 0.5) * 2;
      const y = (event.clientY / window.innerHeight - 0.5) * 2;
      setMouse({ x, y });
    };
    window.addEventListener("mousemove", onMove);
    return () => window.removeEventListener("mousemove", onMove);
  }, []);

  useFrame((state) => {
    const targetX = mouse.x * 0.38;
    const targetY = mouse.y * 0.2;
    const drift = scrollActivated ? -0.8 : -0.45;
    state.camera.position.x += (targetX - state.camera.position.x) * 0.025;
    state.camera.position.y += (targetY - state.camera.position.y) * 0.025;
    state.camera.position.z += (4.8 + drift - state.camera.position.z) * 0.02;
    state.camera.lookAt(0, 0, 0);
  });

  const burstScale = 1 + liveVelocity * 0.24;
  const lineOpacity = 0.35 + liveVelocity * 0.35;

  return (
    <>
      <ambientLight intensity={0.45} />
      <pointLight position={[2.5, 2, 3]} intensity={1.25} color="#86edff" />
      <pointLight position={[-2.5, -1.2, -2]} intensity={0.9} color="#816dff" />
      <Float speed={0.8 + liveVelocity * 1.6} rotationIntensity={0.4} floatIntensity={0.5}>
        <mesh scale={[1.35, 1.35, 1.35]}>
          <icosahedronGeometry args={[1.2, 16]} />
          <meshPhysicalMaterial
            color="#79a2ff"
            roughness={0.16}
            metalness={0.08}
            transmission={0.52}
            thickness={1.6}
            clearcoat={1}
            clearcoatRoughness={0.1}
            iridescence={1}
            iridescenceIOR={1.2}
            sheen={0.6}
            sheenColor="#a4fbff"
          />
        </mesh>
        <mesh scale={[1.85, 1.85, 1.85]}>
          <sphereGeometry args={[1.2, 64, 64]} />
          <shaderMaterial
            transparent
            side={THREE.BackSide}
            blending={THREE.AdditiveBlending}
            uniforms={{
              uColor: { value: new THREE.Color("#5ee8ff") },
              uPower: { value: 2.25 + liveVelocity * 1.5 }
            }}
            vertexShader={`
              varying vec3 vNormal;
              varying vec3 vPosition;
              void main() {
                vNormal = normalize(normalMatrix * normal);
                vPosition = (modelViewMatrix * vec4(position, 1.0)).xyz;
                gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
              }
            `}
            fragmentShader={`
              uniform vec3 uColor;
              uniform float uPower;
              varying vec3 vNormal;
              varying vec3 vPosition;
              void main() {
                float fresnel = pow(1.0 - abs(dot(normalize(vNormal), normalize(-vPosition))), uPower);
                gl_FragColor = vec4(uColor, fresnel * 0.68);
              }
            `}
          />
        </mesh>
      </Float>
      <Line points={filamentA} color="#83f0ff" lineWidth={1.2} transparent opacity={lineOpacity} />
      <Line points={filamentB} color="#8d8dff" lineWidth={1.1} transparent opacity={lineOpacity * 0.88} />
      <group scale={burstScale}>
        <Points positions={particlePositions} stride={3} frustumCulled={false}>
          <PointMaterial transparent color="#8befff" size={0.03 + liveVelocity * 0.01} sizeAttenuation depthWrite={false} />
        </Points>
      </group>
    </>
  );
}

function StaticSignalPoster({ liveVelocity }: { liveVelocity: number }) {
  return (
    <div className="signal-poster h-full rounded-2xl border border-borderSoft/80 bg-bgPrimary/70">
      <div className="signal-poster-orb" style={{ opacity: 0.7 + liveVelocity * 0.25 }} />
      <div className="signal-poster-ring signal-poster-ring-a" />
      <div className="signal-poster-ring signal-poster-ring-b" />
      <div className="signal-poster-ring signal-poster-ring-c" />
    </div>
  );
}

export function SignalCoreHero({
  liveVelocity,
  freshCount,
  primaryCount,
  monitoredSources
}: SignalCoreHeroProps) {
  const [webglReady, setWebglReady] = useState(false);
  const [scrollActivated, setScrollActivated] = useState(false);

  useEffect(() => {
    const canvas = document.createElement("canvas");
    const context = canvas.getContext("webgl2") || canvas.getContext("webgl");
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const deviceMemory = "deviceMemory" in navigator ? (navigator as Navigator & { deviceMemory?: number }).deviceMemory ?? 8 : 8;
    const lowPower = deviceMemory <= 4;
    setWebglReady(Boolean(context) && !reducedMotion && !lowPower);
  }, []);

  useEffect(() => {
    const onScroll = () => setScrollActivated(window.scrollY > 12);
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <section className="hero-shell relative overflow-hidden rounded-card p-6 md:min-h-[82vh] md:p-8">
      <div className="hero-grid grid gap-8 md:h-full md:grid-cols-[minmax(0,1fr)_minmax(320px,0.95fr)] md:items-center">
        <div>
          <p className="inline-flex rounded-full border border-accentSecondary/35 bg-accentSecondary/10 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-accentSecondary">
            Real-Time Intelligence
          </p>
          <h1 className="mt-4 text-3xl font-semibold tracking-tight md:text-5xl">
            <span className="hero-reveal-step" style={{ animationDelay: "0ms" }}>
              Separate signal from AI noise
            </span>
            <br />
            <span className="hero-reveal-step" style={{ animationDelay: "120ms" }}>
              before it hits your roadmap.
            </span>
          </h1>
          <p className="hero-reveal-step mt-3 max-w-2xl text-base text-textSecondary md:text-lg" style={{ animationDelay: "240ms" }}>
            NEXUS ranks verified coverage by impact, freshness, and source quality so your team acts on decisive stories faster.
          </p>
          <div className="hero-reveal-step mt-6 flex flex-wrap gap-3" style={{ animationDelay: "360ms" }}>
            <Link
              href="/trending"
              className="motion-press rounded-md border border-accentPrimary/50 bg-accentPrimary/20 px-4 py-2.5 text-sm font-semibold text-accentPrimary transition hover:bg-accentPrimary/30"
            >
              Open Top Signals
            </Link>
            <Link
              href="/search?q=agentic%20ai"
              className="motion-press rounded-md border border-borderSoft bg-bgSecondary/80 px-4 py-2.5 text-sm font-medium text-textSecondary transition hover:bg-bgPrimary hover:text-textPrimary"
            >
              Explore Agentic AI
            </Link>
          </div>
          <div className="hero-reveal-step mt-6 grid max-w-2xl grid-cols-3 gap-3 text-sm" style={{ animationDelay: "480ms" }}>
            <div className="rounded-xl border border-borderSoft bg-bgPrimary/60 p-3">
              <p className="text-[11px] text-textTertiary">Velocity</p>
              <p className="mt-1 text-lg font-semibold text-accentSecondary">{Math.round(liveVelocity * 100)}%</p>
            </div>
            <div className="rounded-xl border border-borderSoft bg-bgPrimary/60 p-3">
              <p className="text-[11px] text-textTertiary">Fresh 24h</p>
              <p className="mt-1 text-lg font-semibold text-textPrimary">{freshCount}</p>
            </div>
            <div className="rounded-xl border border-borderSoft bg-bgPrimary/60 p-3">
              <p className="text-[11px] text-textTertiary">Primary</p>
              <p className="mt-1 text-lg font-semibold text-textPrimary">{primaryCount}</p>
            </div>
          </div>
        </div>
        <div className="hero-scene-shell relative h-[360px] w-full overflow-hidden rounded-2xl border border-borderSoft/80 bg-bgSecondary/65 md:h-[500px]">
          <div className="pointer-events-none absolute left-3 top-3 z-10 rounded-full border border-borderSoft bg-bgPrimary/70 px-3 py-1 text-xs text-textSecondary">
            {monitoredSources} monitored sources
          </div>
          {webglReady ? (
            <Canvas dpr={[1, 1.8]} camera={{ position: [0, -0.1, 4.4], fov: 46 }}>
              <color attach="background" args={["#0c1220"]} />
              <fog attach="fog" args={["#0c1220", 4, 11]} />
              <SignalCoreScene liveVelocity={liveVelocity} scrollActivated={scrollActivated} />
            </Canvas>
          ) : (
            <StaticSignalPoster liveVelocity={liveVelocity} />
          )}
        </div>
      </div>
    </section>
  );
}
