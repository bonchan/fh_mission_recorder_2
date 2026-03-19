import React, { useMemo, useState, useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
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

const CompassSync = ({ compassRef }: { compassRef: React.RefObject<HTMLDivElement | null> }) => {
  const tempEuler = new THREE.Euler();

  useFrame(({ camera }) => {
    if (compassRef.current) {
      tempEuler.setFromQuaternion(camera.quaternion, 'YXZ');
      const angle = -tempEuler.y;
      compassRef.current.style.transform = `rotate(${angle}rad)`;
    }
  });
  return null;
};

export const MissionVisualizer = ({ mission }: { mission: any }) => {
  const [provider, setProvider] = useState<keyof typeof PROVIDERS>('arcgis');
  const controlsRef = useRef<any>(null);
  const compassDivRef = useRef<HTMLDivElement>(null);

  // Backing off the zoom slightly helps ensure we don't try to load 100 tiles for a long flight
  const zoom = 17;

  const sceneData = useMemo(() => {
    if (!mission?.waypoints?.length) return null;

    // 1. Calculate GPS Bounds
    let minLat = Infinity, maxLat = -Infinity;
    let minLon = Infinity, maxLon = -Infinity;

    mission.waypoints.forEach((wp: any) => {
      if (wp.latitude < minLat) minLat = wp.latitude;
      if (wp.latitude > maxLat) maxLat = wp.latitude;
      if (wp.longitude < minLon) minLon = wp.longitude;
      if (wp.longitude > maxLon) maxLon = wp.longitude;
    });

    // 2. Determine Tile Grid based on Bounds
    const startTileX = Math.floor(lonToTile(minLon, zoom));
    const endTileX = Math.floor(lonToTile(maxLon, zoom));
    // Y tiles increase going South, so maxLat is the smaller Y index
    const startTileY = Math.floor(latToTile(maxLat, zoom));
    const endTileY = Math.floor(latToTile(minLat, zoom));

    // Limit the grid size so we don't crash the browser if points are very far apart
    const maxTiles = 25; // 5x5 grid max
    if ((endTileX - startTileX + 1) * (endTileY - startTileY + 1) > maxTiles) {
      console.warn("Mission is too large to render full map grid at this zoom level.");
    }

    const first = mission.waypoints[0];
    const metersPerLat = 111320;
    const metersPerLon = metersPerLat * Math.cos(first.latitude * (Math.PI / 180));

    const loader = new THREE.TextureLoader();
    const mapTiles = [];

    // 3. Generate the Map Tiles
    for (let x = startTileX; x <= endTileX; x++) {
      for (let y = startTileY; y <= endTileY; y++) {

        // Safety Break
        if (mapTiles.length >= maxTiles) break;

        const west = tileToLon(x, zoom);
        const east = tileToLon(x + 1, zoom);
        const north = tileToLat(y, zoom);
        const south = tileToLat(y + 1, zoom);

        const tileWidthM = (east - west) * metersPerLon;
        const tileHeightM = (north - south) * metersPerLat;

        const tileCenterLon = (west + east) / 2;
        const tileCenterLat = (north + south) / 2;

        const offsetX = (tileCenterLon - first.longitude) * metersPerLon;
        const offsetZ = (first.latitude - tileCenterLat) * metersPerLat;

        const url = PROVIDERS[provider](zoom, y, x);
        const texture = loader.load(url);
        texture.anisotropy = 16;

        mapTiles.push({
          id: `${x}-${y}`,
          texture,
          planeSize: [tileWidthM, tileHeightM] as [number, number],
          planePosition: [offsetX, -0.05, offsetZ] as [number, number, number]
        });
      }
    }

    // 4. Project Local Points
    const localPoints = mission.waypoints.map((wp: any) => new THREE.Vector3(
      (wp.longitude - first.longitude) * metersPerLon,
      wp.elevation || 0,
      (first.latitude - wp.latitude) * metersPerLat
    ));

    return {
      points: localPoints,
      center: localPoints[Math.floor(localPoints.length / 2)],
      mapTiles
    };
  }, [mission, provider]);

  if (!sceneData) return <div style={{ color: 'white', padding: '20px' }}>No Mission Loaded</div>;

  const handleCompassClick = () => {
    if (controlsRef.current) {
      controlsRef.current.setPolarAngle(0);
      controlsRef.current.setAzimuthalAngle(0);
      controlsRef.current.update();
    }
  };

  return (
    <div style={{ position: 'relative', width: '100%', height: '600px', background: '#000', borderRadius: '12px', overflow: 'hidden' }}>

      <div style={{ position: 'absolute', top: 10, left: 10, zIndex: 10, display: 'flex', gap: '8px' }}>
        <select value={provider} onChange={(e) => setProvider(e.target.value as any)} style={{ padding: '6px 12px', borderRadius: '4px', background: '#222', color: '#fff', border: '1px solid #444', cursor: 'pointer' }}>
          <option value="arcgis">Satellite (ArcGIS)</option>
          <option value="osm">Map (OpenStreetMap)</option>
        </select>
        <div style={{ background: 'rgba(0,0,0,0.6)', color: '#aaa', padding: '6px 10px', borderRadius: '4px', fontSize: '12px' }}>
          WP: {mission.waypoints.length}
        </div>
      </div>

      <div
        ref={compassDivRef}
        onClick={handleCompassClick}
        title="Reset to North-Up / Zenithal"
        style={{
          position: 'absolute', top: 15, right: 15, zIndex: 10,
          width: '50px', height: '50px', borderRadius: '50%',
          backgroundColor: 'rgba(20, 20, 20, 0.8)', border: '2px solid #333',
          cursor: 'pointer', display: 'flex', justifyContent: 'center', alignItems: 'center',
          color: '#888', fontSize: '11px', fontWeight: 'bold', userSelect: 'none',
          boxShadow: '0 4px 10px rgba(0,0,0,0.5)',
        }}
        onMouseEnter={(e) => { e.currentTarget.style.borderColor = '#0066ff'; e.currentTarget.style.color = '#fff'; }}
        onMouseLeave={(e) => { e.currentTarget.style.borderColor = '#333'; e.currentTarget.style.color = '#888'; }}
      >
        <span style={{ position: 'absolute', top: 2, color: '#ff4444' }}>N</span>
        <span style={{ position: 'absolute', bottom: 2 }}>S</span>
        <span style={{ position: 'absolute', right: 4 }}>E</span>
        <span style={{ position: 'absolute', left: 4 }}>W</span>
        <div style={{ width: '6px', height: '6px', backgroundColor: '#555', borderRadius: '50%' }} />
      </div>

      <Canvas>
        <PerspectiveCamera makeDefault position={[50, 50, 50]} />
        <ambientLight intensity={1.5} />
        <pointLight position={[100, 200, 100]} />

        <CompassSync compassRef={compassDivRef} />

        {/* MAP GRID */}
        {sceneData.mapTiles.map((tile) => (
          <Plane
            key={tile.id}
            args={tile.planeSize}
            rotation={[-Math.PI / 2, 0, 0]}
            position={tile.planePosition}
          >
            <meshStandardMaterial map={tile.texture} />
          </Plane>
        ))}

        <Line points={sceneData.points} color="#ffff00" lineWidth={2} />

        {sceneData.points.map((p: any, i: number) => {
          const wp = mission.waypoints[i];
          const yawRad = (wp.yaw || 0) * (Math.PI / 180);
          const pitchRad = (wp.pitch || 0) * (Math.PI / 180);

          const dirY = Math.sin(pitchRad);
          const h = Math.cos(pitchRad);
          const dirX = h * Math.sin(yawRad);
          const dirZ = -h * Math.cos(yawRad);

          const dirVector = new THREE.Vector3(dirX, dirY, dirZ).normalize();
          const arrowLength = 15;

          return (
            <group key={i} position={p}>
              {/* Waypoint Dot */}
              <Sphere args={[0.5, 12, 12]}>
                <meshStandardMaterial color={i === 0 ? "#00ff00" : i === sceneData.points.length - 1 ? "#ff0000" : "#ffffff"} />
              </Sphere>

              {/* Vertical Height Line */}
              <Line
                points={[new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, -p.y, 0)]}
                color="#ffffff"
                transparent
                opacity={0.2}
                lineWidth={0.5}
              />

              {/* CAMERA VIEW ARROW (Magenta) */}
              <arrowHelper
                args={[
                  dirVector,                  // Direction
                  new THREE.Vector3(0, 0, 0), // Origin (relative to the group)
                  arrowLength,                // Length
                  0xff00ff,                   // Color (Hex number, not string)
                  3,                          // Head length
                  2                           // Head width
                ]}
              />
            </group>
          );
        })}

        <OrbitControls
          ref={controlsRef}
          target={sceneData.center}
          enableDamping
          maxPolarAngle={Math.PI / 2}
          mouseButtons={{
            LEFT: THREE.MOUSE.PAN,
            MIDDLE: THREE.MOUSE.ROTATE,
          }}
        />
      </Canvas>
    </div>
  );
};