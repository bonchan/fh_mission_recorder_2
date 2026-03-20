import React, { useMemo, useState, useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Line, Sphere, Plane, PerspectiveCamera, Ring, Cone } from '@react-three/drei';
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

const TurnIndicator = ({ nextPointLocal, direction }: { nextPointLocal: THREE.Vector3, direction: 'CW' | 'CCW' }) => {
  // 1. Find the midpoint relative to the current point
  const midPoint = nextPointLocal.clone().multiplyScalar(0.5);

  // Size of the arrow (in meters)
  const radius = 4;

  return (
    <group position={midPoint}>
      {/* Rotate -90deg on X to lay flat on the ground.
        Scale X by -1 to instantly flip the arrow from CW to CCW 
      */}
      <group
        rotation={[-Math.PI / 2, 0, 0]}
        scale={[direction === 'CW' ? 1 : -1, 1, 1]}
      >
        {/* The curved line (an incomplete Ring) */}
        <Ring args={[radius - 0.3, radius + 0.3, 32, 1, 0, Math.PI * 1.5]}>
          <meshBasicMaterial color="#ffaa00" side={THREE.DoubleSide} transparent opacity={0.8} />
        </Ring>

        {/* The Arrow Head (placed at the 270-degree mark of the Ring) */}
        <Cone args={[1, 2, 16]} position={[0, -radius, 0]} rotation={[0, 0, -Math.PI / 2]}>
          <meshBasicMaterial color="#ffaa00" />
        </Cone>
      </group>
    </group>
  );
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
    // Subtract/Add 1 to create an extra "ring" of padding tiles around the mission
    const padding = 1;
    const startTileX = Math.floor(lonToTile(minLon, zoom)) - padding;
    const endTileX = Math.floor(lonToTile(maxLon, zoom)) + padding;

    // Y tiles increase going South, so maxLat is the smaller Y index
    const startTileY = Math.floor(latToTile(maxLat, zoom)) - padding;
    const endTileY = Math.floor(latToTile(minLat, zoom)) + padding;

    // Limit the grid size so we don't crash the browser
    const maxTiles = 49; // Increased to 7x7 grid max to accommodate the extra ring
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
    let minX = Infinity, maxX = -Infinity;
    let minZ = Infinity, maxZ = -Infinity;

    const localPoints = mission.waypoints.map((wp: any) => {
      const pX = (wp.longitude - first.longitude) * metersPerLon;
      const pY = wp.elevation || 0;
      const pZ = (first.latitude - wp.latitude) * metersPerLat;

      if (pX < minX) minX = pX;
      if (pX > maxX) maxX = pX;
      if (pZ < minZ) minZ = pZ;
      if (pZ > maxZ) maxZ = pZ;

      return new THREE.Vector3(pX, pY, pZ);
    });

    // 5. Calculate Camera Height to fit all points
    const sizeX = maxX - minX;
    const sizeZ = maxZ - minZ;
    const maxDimension = Math.max(sizeX, sizeZ, 100); // 100m fallback if only 1 point exists

    const fov = 50; // Standard PerspectiveCamera FOV
    // Math: Height = (Width / 2) / tan(FOV / 2). Added * 1.5 for a nice padding margin.
    const cameraHeight = ((maxDimension / 2) / Math.tan((fov * Math.PI) / 360)) * 1.5;

    return {
      points: localPoints,
      center: localPoints[Math.floor(localPoints.length / 2)],
      mapTiles,
      cameraHeight
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
        <PerspectiveCamera
          makeDefault
          fov={50}
          position={[
            sceneData.center.x,
            sceneData.cameraHeight,
            sceneData.center.z + 0.01
          ]}
        />

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

          const nextP = sceneData.points[i + 1];
          let nextPointLocal = null;
          if (nextP) {
            // Subtract current point from next point to get the relative distance
            nextPointLocal = new THREE.Vector3().subVectors(nextP, p);
          }

          return (
            <group key={i} position={p}>
              {/* --- Render the Indicator halfway to the next point --- */}
              {nextPointLocal && (
                <TurnIndicator
                  nextPointLocal={nextPointLocal}
                  direction={wp.turn}
                />
              )}

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