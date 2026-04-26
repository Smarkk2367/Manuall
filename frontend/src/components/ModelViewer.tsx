"use client";

import { useEffect, useState, useMemo } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls, Stage, Center } from "@react-three/drei";
import * as THREE from "three";
import { Loader2 } from "lucide-react";

interface MeshData {
  positions: number[];
  normals: number[];
  indices: number[];
}

export default function ModelViewer({ resultFile }: { resultFile: string }) {
  const [meshData, setMeshData] = useState<MeshData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchMesh = async () => {
      try {
        const res = await fetch(`http://localhost:3001/api/step/file/${resultFile}`);
        if (!res.ok) throw new Error("Failed to load 3D data");
        const data = await res.json();
        setMeshData(data);
      } catch (err: any) {
        setError(err.message || "Failed to load model");
      }
    };
    fetchMesh();
  }, [resultFile]);

  //Convert raw arrays to Float32Arrays for Three.js
  const geometry = useMemo(() => {
    if (!meshData) return null;

    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.Float32BufferAttribute(meshData.positions, 3));
    geo.setAttribute("normal", new THREE.Float32BufferAttribute(meshData.normals, 3));
    geo.setIndex(meshData.indices);

    geo.rotateX(-Math.PI / 2);

    return geo;
  }, [meshData]);

  if (error) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-red-50 text-red-700">
        <p>{error}</p>
      </div>
    );
  }

  if (!geometry) {
    return (
      <div className="w-full h-full flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
        <span className="ml-3 text-gray-500 font-medium">Loading 3D model...</span>
      </div>
    );
  }

  return (
    <div className="w-full h-full bg-[#f8f9fa] relative">
      <Canvas shadows dpr={[1, 2]} camera={{ position: [-10, 20, -5], fov: 45 }}>
        <color attach="background" args={["#f8f9fa"]} />
        <ambientLight intensity={0.5} />
        <directionalLight position={[10, 10, 5]} intensity={1} castShadow />
        <directionalLight position={[-10, 10, -5]} intensity={0.5} />

        <Center>
          <mesh geometry={geometry} castShadow receiveShadow>
            <meshStandardMaterial
              color="#e2e8f0"
              roughness={0.7}
              metalness={0.1}
              side={THREE.DoubleSide}
            />
          </mesh>
        </Center>

        <OrbitControls
          makeDefault
          minPolarAngle={0}
          maxPolarAngle={Math.PI / 2}
          enablePan={true}
          enableZoom={true}
        />

        <Stage environment="city" intensity={0.5} shadows={{ type: 'contact', opacity: 0.2, blur: 2 }}>
          <Center>
            <mesh geometry={geometry}>
              <meshStandardMaterial color="#f1f5f9" roughness={0.6} />
            </mesh>
          </Center>
        </Stage>
      </Canvas>

      <div className="absolute top-4 left-4 bg-white/80 backdrop-blur-md px-4 py-2 rounded-lg shadow-sm border border-gray-100">
        <h3 className="text-sm font-bold text-gray-900">Interactive Preview</h3>
        <p className="text-xs text-gray-500">Drag to rotate, scroll to zoom</p>
      </div>
    </div>
  );
}
