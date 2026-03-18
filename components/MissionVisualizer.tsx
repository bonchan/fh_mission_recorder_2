import React, { useMemo, useState } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Line, Sphere, Plane, PerspectiveCamera } from '@react-three/drei';
import * as THREE from 'three';

// --- TILE MATH HELPERS ---
const lonToTile = (lon: number, zoom: number) => ((lon + 180) / 360) * Math.pow(2, zoom);
const latToTile = (lat: number, zoom: number) =>
  ((1 - Math.log(Math.tan(lat * Math.PI / 180) + 1 / Math.cos(lat * Math.PI / 180)) / Math.PI) / 2) * Math.pow(2, zoom);

const tileToLon = (x: number, zoom: number) => (x / Math.pow(2, zoom)) * 360 - 180;
const tileToLat = (y: number, zoom: number) => {
  const n = Math.PI - (2 * Math.PI * y) / Math.pow(2, zoom);
  return (180 / Math.PI) * Math.atan(0.5 * (Math.exp(n) - Math.exp(-n)));
};

// --- PROVIDERS ---
const PROVIDERS = {
  arcgis: (z: number, y: number, x: number) => `https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/${z}/${y}/${x}`,
  osm: (z: number, y: number, x: number) => `https://tile.openstreetmap.org/${z}/${x}/${y}.png`
};

export const MissionVisualizer = ({ mission }: { mission: any }) => {
  const [provider, setProvider] = useState<keyof typeof PROVIDERS>('arcgis');
  const zoom = 17;

  const sceneData = useMemo(() => {
    if (!mission?.waypoints?.length) return null;

    const first = mission.waypoints[0];

    const tileX = Math.floor(lonToTile(first.longitude, zoom));
    const tileY = Math.floor(latToTile(first.latitude, zoom));

    const west = tileToLon(tileX, zoom);
    const east = tileToLon(tileX + 1, zoom);
    const north = tileToLat(tileY, zoom);
    const south = tileToLat(tileY + 1, zoom);

    const metersPerLat = 111320;
    const metersPerLon = metersPerLat * Math.cos(first.latitude * (Math.PI / 180));

    const tileWidthM = (east - west) * metersPerLon;
    const tileHeightM = (north - south) * metersPerLat;

    const tileCenterLon = (west + east) / 2;
    const tileCenterLat = (north + south) / 2;

    const offsetX = (tileCenterLon - first.longitude) * metersPerLon;
    const offsetZ = (first.latitude - tileCenterLat) * metersPerLat;

    const localPoints = mission.waypoints.map((wp: any) => new THREE.Vector3(
      (wp.longitude - first.longitude) * metersPerLon,
      wp.elevation || 0,
      (first.latitude - wp.latitude) * metersPerLat
    ));

    const loader = new THREE.TextureLoader();
    const url = PROVIDERS[provider](zoom, tileY, tileX);
    const texture = loader.load(url);
    texture.anisotropy = 16;

    return {
      points: localPoints,
      center: localPoints[Math.floor(localPoints.length / 2)],
      texture,
      planeSize: [tileWidthM, tileHeightM],
      planePosition: [offsetX, -0.05, offsetZ] as [number, number, number]
    };
  }, [mission, provider]);

  if (!sceneData) return <div style={{ color: 'white', padding: '20px' }}>No Mission Loaded</div>;

  return (
    <div style={{ position: 'relative', width: '100%', height: '600px', background: '#000', borderRadius: '12px', overflow: 'hidden' }}>
      <div style={{ position: 'absolute', top: 10, left: 10, zIndex: 10, display: 'flex', gap: '8px' }}>
        <select
          value={provider}
          onChange={(e) => setProvider(e.target.value as any)}
          style={{ padding: '6px 12px', borderRadius: '4px', background: '#222', color: '#fff', border: '1px solid #444', cursor: 'pointer' }}
        >
          <option value="arcgis">Satellite (ArcGIS)</option>
          <option value="osm">Map (OpenStreetMap)</option>
        </select>
        <div style={{ background: 'rgba(0,0,0,0.6)', color: '#aaa', padding: '6px 10px', borderRadius: '4px', fontSize: '12px' }}>
          WP: {mission.waypoints.length}
        </div>
      </div>

      <Canvas>
        <PerspectiveCamera makeDefault position={[50, 50, 50]} />
        <ambientLight intensity={1.5} />
        <pointLight position={[100, 200, 100]} />

        <Plane
          args={[sceneData.planeSize[0], sceneData.planeSize[1]]}
          rotation={[-Math.PI / 2, 0, 0]}
          position={sceneData.planePosition}
        >
          <meshStandardMaterial map={sceneData.texture} />
        </Plane>

        <Line points={sceneData.points} color="#ffff00" lineWidth={2} />

        {sceneData.points.map((p: any, i: any) => (
          <group key={i} position={p}>
            <Sphere args={[0.5, 12, 12]}>
              <meshStandardMaterial color={i === 0 ? "#00ff00" : i === sceneData.points.length - 1 ? "#ff0000" : "#ffffff"} />
            </Sphere>
            <Line
              points={[new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, -p.y, 0)]}
              color="#ffffff"
              transparent
              opacity={0.2}
              lineWidth={0.5}
            />
          </group>
        ))}

        {/* Updated Controls */}
        <OrbitControls
          target={sceneData.center}
          enableDamping
          mouseButtons={{
            LEFT: THREE.MOUSE.PAN,      // Left click to Pan
            MIDDLE: THREE.MOUSE.ROTATE, // Middle click to Orbit
            //RIGHT: THREE.MOUSE.DOLLY    // Right click to Zoom (optional)
          }}
        />
      </Canvas>
    </div>
  );
};