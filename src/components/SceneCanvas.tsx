"use client";

import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Canvas,
  useFrame,
  useThree,
} from "@react-three/fiber";
import {
  Color,
  Euler,
  InstancedMesh,
  LatheGeometry,
  Mesh,
  PerspectiveCamera,
  SRGBColorSpace,
  Vector2,
  Vector3,
  CanvasTexture,
  CylinderGeometry,
  SphereGeometry,
  BoxGeometry,
  Object3D,
  MathUtils,
  MeshStandardMaterial,
} from "three";
import {
  Environment,
  Float,
  Html,
  OrbitControls,
  Stars,
} from "@react-three/drei";
import { EffectComposer, Bloom } from "@react-three/postprocessing";
import { BlendFunction } from "postprocessing";
import { createNoise3D } from "simplex-noise";

const EXPORT_WIDTH = 3200;
const EXPORT_HEIGHT = 4000;
const WATERFALL_PARTICLES = 900;

type CaptureBridgeProps = {
  onReady: (capture: (() => Promise<void>) | null) => void;
};

function createSeededRandom(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function CaptureBridge({ onReady }: CaptureBridgeProps) {
  const { gl, camera, scene, invalidate } = useThree();

  useEffect(() => {
    const renderer = gl;
    const capture = async () => {
      const perspectiveCamera = camera as PerspectiveCamera;
      const originalPixelRatio = renderer.getPixelRatio();
      const originalSize = renderer.getSize(new Vector2());
      const originalAspect = perspectiveCamera.aspect;
      const canvas = renderer.domElement;
      const prevStyle = {
        width: canvas.style.width,
        height: canvas.style.height,
      };

      renderer.setPixelRatio(1);
      renderer.setSize(EXPORT_WIDTH, EXPORT_HEIGHT, false);
      perspectiveCamera.aspect = EXPORT_WIDTH / EXPORT_HEIGHT;
      perspectiveCamera.updateProjectionMatrix();

      renderer.render(scene, perspectiveCamera);

      const dataUrl = canvas.toDataURL("image/png", 1);
      const link = document.createElement("a");
      link.href = dataUrl;
      link.download = `prime-baby-moonfall-${Date.now()}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      renderer.setPixelRatio(originalPixelRatio);
      renderer.setSize(originalSize.x, originalSize.y, false);
      canvas.style.width = prevStyle.width;
      canvas.style.height = prevStyle.height;
      perspectiveCamera.aspect = originalAspect;
      perspectiveCamera.updateProjectionMatrix();
      renderer.render(scene, perspectiveCamera);
      invalidate();
    };

    onReady(capture);
    return () => {
      onReady(null);
    };
  }, [camera, gl, invalidate, onReady, scene]);

  return null;
}

function createBottleProfile() {
  const points = [];
  points.push(new Vector2(0.0, 0.0));
  points.push(new Vector2(0.55, 0.0));
  points.push(new Vector2(0.62, 0.2));
  points.push(new Vector2(0.66, 0.6));
  points.push(new Vector2(0.63, 1.2));
  points.push(new Vector2(0.58, 1.6));
  points.push(new Vector2(0.52, 2.1));
  points.push(new Vector2(0.45, 2.5));
  points.push(new Vector2(0.42, 2.9));
  points.push(new Vector2(0.38, 3.15));
  points.push(new Vector2(0.34, 3.35));
  points.push(new Vector2(0.3, 3.55));
  points.push(new Vector2(0.32, 3.65));
  points.push(new Vector2(0.36, 3.72));
  points.push(new Vector2(0.32, 3.8));
  points.push(new Vector2(0.26, 3.85));
  points.push(new Vector2(0.2, 3.95));
  points.push(new Vector2(0.18, 4.05));
  points.push(new Vector2(0.22, 4.2));
  points.push(new Vector2(0.26, 4.32));
  points.push(new Vector2(0.28, 4.42));
  points.push(new Vector2(0.24, 4.5));
  points.push(new Vector2(0.18, 4.58));
  points.push(new Vector2(0.12, 4.64));
  points.push(new Vector2(0.11, 4.72));
  points.push(new Vector2(0.13, 4.82));
  points.push(new Vector2(0.17, 4.9));
  points.push(new Vector2(0.2, 4.98));
  points.push(new Vector2(0.21, 5.05));
  points.push(new Vector2(0.18, 5.16));
  points.push(new Vector2(0.12, 5.2));
  points.push(new Vector2(0.05, 5.23));
  points.push(new Vector2(0.0, 5.24));
  return points;
}

function useBottleGeometries() {
  return useMemo(() => {
    const profile = createBottleProfile();
    const body = new LatheGeometry(profile, 96);
    body.rotateX(Math.PI);
    const pump = new CylinderGeometry(0.26, 0.3, 0.75, 48, 1, true);
    const pumpNeck = new CylinderGeometry(0.18, 0.2, 0.55, 48);
    const pumpTop = new BoxGeometry(0.55, 0.14, 0.36);
    const nozzle = new BoxGeometry(0.22, 0.12, 0.18);
    const droplet = new SphereGeometry(0.12, 32, 32);
    return { body, pump, pumpNeck, pumpTop, nozzle, droplet };
  }, []);
}

function createLabelTexture() {
  if (typeof window === "undefined") {
    return null;
  }
  const canvas = document.createElement("canvas");
  canvas.width = 1024;
  canvas.height = 1024;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    return null;
  }

  const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
  gradient.addColorStop(0, "#fefffa");
  gradient.addColorStop(0.55, "#f4faff");
  gradient.addColorStop(1, "#e4f0ff");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.fillStyle = "#123b6e";
  ctx.font = "bold 210px 'Helvetica Neue', 'Segoe UI', sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("PRIME", canvas.width / 2, 320);
  ctx.font = "600 130px 'Helvetica Neue', 'Segoe UI', sans-serif";
  ctx.fillText("BABY", canvas.width / 2, 470);

  ctx.font = "500 72px 'Helvetica Neue', 'Segoe UI', sans-serif";
  ctx.fillStyle = "#245d9b";
  ctx.fillText("SOOTHING GLOW LOTION", canvas.width / 2, 640);

  ctx.fillStyle = "#1c4d84";
  ctx.font = "400 50px 'Helvetica Neue', 'Segoe UI', sans-serif";
  ctx.fillText("DEEP HYDRATION COMPLEX", canvas.width / 2, 760);

  ctx.strokeStyle = "rgba(34, 96, 160, 0.4)";
  ctx.lineWidth = 12;
  ctx.beginPath();
  ctx.ellipse(canvas.width / 2, 820, 320, 160, MathUtils.degToRad(8), 0, Math.PI * 2);
  ctx.stroke();

  ctx.fillStyle = "rgba(134, 188, 255, 0.16)";
  ctx.beginPath();
  ctx.ellipse(canvas.width / 2, 820, 320, 160, MathUtils.degToRad(8), 0, Math.PI * 2);
  ctx.fill();

  const texture = new CanvasTexture(canvas);
  texture.anisotropy = 16;
  texture.colorSpace = SRGBColorSpace;
  texture.needsUpdate = true;
  return texture;
}

function Bottle() {
  const { body, pump, pumpNeck, pumpTop, nozzle, droplet } = useBottleGeometries();
  const labelTexture = useMemo(() => createLabelTexture(), []);

  useEffect(() => {
    return () => {
      labelTexture?.dispose();
      body.dispose();
      pump.dispose();
      pumpNeck.dispose();
      pumpTop.dispose();
      nozzle.dispose();
      droplet.dispose();
    };
  }, [body, droplet, labelTexture, nozzle, pump, pumpNeck, pumpTop]);

  return (
    <group position={[0, 2.06, 0.38]} rotation={[-MathUtils.degToRad(22), 0, MathUtils.degToRad(4)]}>
      <mesh geometry={body} castShadow receiveShadow>
        <meshPhysicalMaterial
          color="#f7fbff"
          roughness={0.32}
          metalness={0.18}
          clearcoat={0.6}
          clearcoatRoughness={0.12}
          transmission={0.16}
          thickness={0.45}
          envMapIntensity={1.3}
          map={labelTexture ?? undefined}
        />
      </mesh>
      <mesh geometry={pumpNeck} position={[0, 2.8, 0.0]} castShadow receiveShadow>
        <meshPhysicalMaterial
          color="#d9e2ff"
          roughness={0.18}
          metalness={0.32}
          clearcoat={0.5}
          envMapIntensity={1.6}
        />
      </mesh>
      <mesh geometry={pump} position={[0, 3.26, 0]} castShadow>
        <meshPhysicalMaterial
          color="#c8d9ff"
          metalness={0.48}
          roughness={0.22}
          envMapIntensity={1.8}
          clearcoat={0.32}
        />
      </mesh>
      <mesh geometry={pumpTop} position={[0, 3.68, 0.1]} rotation={[0, MathUtils.degToRad(5), 0]} castShadow>
        <meshPhysicalMaterial color="#f2f5ff" metalness={0.24} roughness={0.18} envMapIntensity={2.4} />
      </mesh>
      <mesh geometry={nozzle} position={[0.08, 3.72, 0.32]} rotation={[0, MathUtils.degToRad(5), MathUtils.degToRad(-6)]} castShadow>
        <meshPhysicalMaterial color="#fdfbff" metalness={0.12} roughness={0.28} envMapIntensity={1.6} />
      </mesh>
      <mesh geometry={droplet} position={[0.12, 3.58, 0.38]} scale={[1, 1.5, 1]} castShadow>
        <meshPhysicalMaterial
          color="#e3f1ff"
          emissive="#9cc8ff"
          emissiveIntensity={0.7}
          roughness={0.25}
          metalness={0.1}
          envMapIntensity={1.4}
          transparent
          opacity={0.9}
        />
      </mesh>
    </group>
  );
}

function Rock() {
  const meshRef = useRef<Mesh>(null);
  const geometry = useMemo(() => {
    const geo = new LatheGeometry(
      [
        new Vector2(0.0, -2.5),
        new Vector2(1.75, -2.2),
        new Vector2(1.94, -1.8),
        new Vector2(1.58, -1.1),
        new Vector2(1.22, -0.4),
        new Vector2(0.86, 0.6),
        new Vector2(0.72, 1.4),
        new Vector2(0.6, 2.2),
        new Vector2(0.4, 3.1),
        new Vector2(0.22, 3.6),
        new Vector2(0.18, 4.2),
      ],
      24
    );
    const noise = createNoise3D(createSeededRandom(1337));
    const pos = geo.attributes.position;
    const temp = new Vector3();
    for (let i = 0; i < pos.count; i += 1) {
      temp.fromBufferAttribute(pos, i);
      const noiseValue = noise(temp.x * 0.65, temp.y * 0.8, temp.z * 0.65);
      const ridge = noise(temp.x * 1.2, temp.y * 0.4, temp.z * 1.4);
      const displacement = 1 + noiseValue * 0.55 + Math.pow(Math.abs(ridge), 3) * 0.3;
      temp.multiplyScalar(displacement);
      pos.setXYZ(i, temp.x, temp.y, temp.z);
    }
    geo.computeVertexNormals();
    return geo;
  }, []);

  useEffect(() => {
    return () => geometry.dispose();
  }, [geometry]);

  useFrame((_, delta) => {
    if (!meshRef.current) return;
    meshRef.current.rotation.y += delta * 0.05;
  });

  return (
    <mesh ref={meshRef} geometry={geometry} position={[0, -2.6, 0]} rotation={[MathUtils.degToRad(8), 0, MathUtils.degToRad(12)]} receiveShadow castShadow>
      <meshStandardMaterial
        color="#243147"
        roughness={0.85}
        metalness={0.18}
        emissive="#111522"
        emissiveIntensity={0.12}
      />
    </mesh>
  );
}

type Particle = {
  offset: number;
  speed: number;
  jitter: number;
};

function flowPosition(progress: number, jitter: number) {
  const p = MathUtils.clamp(progress, 0, 1);
  const start = new Vector3(0.16, 3.54, 0.46);
  const end = new Vector3(-0.3 + jitter * 0.12, -1.4 - jitter * 0.5, -0.3 + jitter * 0.18);
  const curveHeight = 1.8 + Math.sin(p * Math.PI) * 0.6;
  const pos = new Vector3().lerpVectors(start, end, p);
  pos.x += Math.sin(p * Math.PI * 1.2 + jitter * 4.2) * 0.18;
  pos.z += Math.cos(p * Math.PI * 1.6 + jitter * 3.6) * 0.1;
  pos.y += Math.sin(p * Math.PI) * curveHeight;

  return pos;
}

function Waterfall() {
  const meshRef = useRef<InstancedMesh>(null);
  const [droplets] = useState<Particle[]>(() =>
    Array.from({ length: WATERFALL_PARTICLES }, () => ({
      offset: Math.random(),
      speed: 0.18 + Math.random() * 0.32,
      jitter: MathUtils.randFloatSpread(0.65),
    }))
  );
  const dummy = useMemo(() => new Object3D(), []);

  useFrame((_state, delta) => {
    if (!meshRef.current) return;
    droplets.forEach((particle, idx) => {
      particle.offset = (particle.offset + delta * particle.speed) % 1;
      const position = flowPosition(particle.offset, particle.jitter);
      dummy.position.copy(position);
      const scale = MathUtils.lerp(0.05, 0.28, 1 - Math.pow(1 - particle.offset, 2));
      dummy.scale.setScalar(scale);
      dummy.rotation.set(
        Math.sin(particle.offset * Math.PI * 2 + particle.jitter) * 0.4,
        Math.cos(particle.offset * Math.PI * 1.6 + particle.jitter) * 0.25,
        Math.sin(particle.offset * Math.PI) * 0.3
      );
      dummy.updateMatrix();
      meshRef.current!.setMatrixAt(idx, dummy.matrix);
    });
    meshRef.current.instanceMatrix.needsUpdate = true;
  });

  useEffect(() => {
    const mesh = meshRef.current;
    return () => {
      mesh?.geometry.dispose();
    };
  }, []);

  return (
    <instancedMesh ref={meshRef} args={[undefined, undefined, WATERFALL_PARTICLES]} frustumCulled={false}>
      <sphereGeometry args={[0.22, 16, 16]} />
      <meshPhysicalMaterial
        color="#cbe6ff"
        emissive="#9ccfff"
        emissiveIntensity={1.05}
        roughness={0.15}
        metalness={0.12}
        transparent
        opacity={0.88}
        envMapIntensity={1.3}
        iridescence={0.12}
        iridescenceIOR={1.3}
      />
    </instancedMesh>
  );
}

function Mist() {
  const meshRef = useRef<Mesh>(null);
  const geometry = useMemo(() => new SphereGeometry(1.8, 32, 32), []);

  useEffect(() => {
    return () => geometry.dispose();
  }, [geometry]);

  useFrame(() => {
    if (!meshRef.current) return;
    const material = meshRef.current.material;
    if (Array.isArray(material)) return;
    const mat = material as MeshStandardMaterial;
    mat.opacity = 0.24 + Math.sin(performance.now() * 0.0006) * 0.04;
  });

  return (
    <mesh ref={meshRef} geometry={geometry} position={[0, 1.1, 0.22]} scale={[1.4, 1.1, 1.6]}>
      <meshStandardMaterial color="#9bc6ff" transparent opacity={0.28} emissive="#87bfff" emissiveIntensity={0.25} roughness={0.6} metalness={0.0} />
    </mesh>
  );
}

function Spray() {
  const meshRef = useRef<InstancedMesh>(null);
  const [particles] = useState(() =>
    Array.from({ length: 180 }, () => ({
      baseTheta: Math.random() * Math.PI * 2,
      radius: 0.05 + Math.random() * 0.2,
      speed: 0.6 + Math.random() * 0.4,
      height: Math.random() * 0.5,
      jitter: Math.random() * 2,
    }))
  );
  const dummy = useMemo(() => new Object3D(), []);

  useFrame(() => {
    if (!meshRef.current) return;
    const t = performance.now() * 0.0006;
    particles.forEach((particle, idx) => {
      const phase = (t * particle.speed + particle.jitter) % 1;
      const radius = particle.radius + Math.sin(phase * Math.PI) * 0.04;
      const x = Math.cos(particle.baseTheta) * radius;
      const z = Math.sin(particle.baseTheta) * radius;
      const y = 3.54 + phase * 0.8 + particle.height * 0.5;
      dummy.position.set(x, y, 0.48 + z);
      const scale = 0.04 + phase * 0.08;
      dummy.scale.setScalar(scale);
      dummy.rotation.copy(new Euler(phase * 0.4, particle.baseTheta, phase * 0.3));
      dummy.updateMatrix();
      meshRef.current!.setMatrixAt(idx, dummy.matrix);
    });
    meshRef.current.instanceMatrix.needsUpdate = true;
  });

  return (
    <instancedMesh ref={meshRef} args={[undefined, undefined, 180]} frustumCulled={false}>
      <sphereGeometry args={[0.12, 8, 8]} />
      <meshBasicMaterial color="#d9ebff" transparent opacity={0.8} />
    </instancedMesh>
  );
}

function Moon() {
  return (
    <group position={[6, 8, -12]}>
      <mesh>
        <sphereGeometry args={[2.4, 64, 64]} />
        <meshBasicMaterial color="#cfe1ff" />
      </mesh>
      <mesh>
        <sphereGeometry args={[2.6, 64, 64]} />
        <meshBasicMaterial color="#dfe9ff" transparent opacity={0.25} />
      </mesh>
    </group>
  );
}

function GroundGlow() {
  return (
    <mesh position={[0, -3.2, 0]} rotation={[-Math.PI / 2, 0, 0]}>
      <planeGeometry args={[30, 30, 1, 1]} />
      <meshBasicMaterial
        color={new Color("#0c1426")}
        transparent
        opacity={0.6}
      />
    </mesh>
  );
}

function SceneContent() {
  return (
    <>
      <color attach="background" args={["#04060f"]} />
      <fog attach="fog" args={["#04060f", 12, 38]} />
      <ambientLight intensity={0.3} color="#8fb3ff" />
      <directionalLight
        position={[6, 12, -6]}
        intensity={1.6}
        color="#9dc0ff"
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
      />
      <spotLight
        position={[-5, 4, 6]}
        intensity={1.1}
        color="#5b7cff"
        angle={MathUtils.degToRad(36)}
        penumbra={0.6}
      />
      <pointLight position={[2.4, 3.8, 3]} intensity={0.6} color="#a7c8ff" />
      <Environment preset="night" resolution={256} />
      <Stars radius={120} depth={60} count={1800} factor={4} saturation={0.01} fade speed={0.4} />
      <Moon />
      <GroundGlow />
      <Rock />
      <Float speed={1.4} rotationIntensity={0.12} floatIntensity={0.16}>
        <Bottle />
      </Float>
      <Waterfall />
      <Mist />
      <Spray />
      <EffectComposer>
        <Bloom
          intensity={1.1}
          luminanceThreshold={0.1}
          luminanceSmoothing={0.45}
          mipmapBlur
          blendFunction={BlendFunction.ADD}
          radius={0.8}
        />
      </EffectComposer>
    </>
  );
}

export default function SceneCanvas() {
  const captureRef = useRef<(() => Promise<void>) | null>(null);
  const [isExporting, setIsExporting] = useState(false);

  const handleCaptureBridge = useCallback((capture: (() => Promise<void>) | null) => {
    captureRef.current = capture;
  }, []);

  const handleExport = useCallback(async () => {
    if (!captureRef.current || isExporting) return;
    try {
      setIsExporting(true);
      await captureRef.current();
    } finally {
      setIsExporting(false);
    }
  }, [isExporting]);

  return (
    <div className="flex w-full max-w-5xl flex-col items-center gap-6">
      <div className="relative w-full rounded-[28px] border border-slate-700/40 bg-gradient-to-br from-slate-900/70 via-slate-950/85 to-slate-950/95 shadow-[0_20px_80px_rgba(8,22,64,0.65)]">
        <Canvas
          id="prime-baby-scene"
          shadows
          className="h-[540px] w-full rounded-[28px]"
          camera={{ position: [0.22, 1.9, 5.2], fov: 39 }}
          dpr={[1, 1.6]}
          gl={{ antialias: true, preserveDrawingBuffer: true }}
        >
          <Suspense fallback={<Html center className="text-xs uppercase tracking-[0.4em] text-slate-200/60">Initializing scene…</Html>}>
            <SceneContent />
            <OrbitControls
              enablePan={false}
              enableZoom={false}
              maxPolarAngle={MathUtils.degToRad(100)}
              minPolarAngle={MathUtils.degToRad(30)}
              target={[0, 1.6, 0]}
            />
            <CaptureBridge onReady={handleCaptureBridge} />
          </Suspense>
        </Canvas>
      </div>
      <button
        onClick={handleExport}
        disabled={isExporting}
        className="inline-flex items-center gap-2 rounded-full border border-sky-400/40 bg-slate-900/80 px-6 py-3 text-sm font-semibold uppercase tracking-[0.25em] text-sky-100 transition hover:border-sky-300/80 hover:text-sky-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-400/60 disabled:cursor-wait disabled:border-slate-700 disabled:text-slate-400"
      >
        {isExporting ? "Rendering…" : "Export 3200 × 4000 PNG"}
      </button>
    </div>
  );
}
