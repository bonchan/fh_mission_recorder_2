import React, { useMemo } from 'react';

interface Props {
  mission: Mission | null;
}

export const MissionVisualizer: React.FC<Props> = ({ mission }) => {
  const padding = 40;
  const width = 500;
  const height = 400;

  const plotData = useMemo(() => {
    if (!mission || mission.waypoints.length === 0) return null;

    const waypoints = mission.waypoints;

    // 1. Find the bounds of the mission
    const lats = waypoints.map(w => w.latitude);
    const lngs = waypoints.map(w => w.longitude);
    
    const minLat = Math.min(...lats);
    const maxLat = Math.max(...lats);
    const minLng = Math.min(...lngs);
    const maxLng = Math.max(...lngs);

    const latRange = maxLat - minLat || 0.0001; // Avoid division by zero
    const lngRange = maxLng - minLng || 0.0001;

    // 2. Map GPS to SVG Coordinates (X, Y)
    const points = waypoints.map(w => ({
      x: padding + ((w.longitude - minLng) / lngRange) * (width - padding * 2),
      // SVG Y is inverted (0 is top)
      y: height - (padding + ((w.latitude - minLat) / latRange) * (height - padding * 2)),
      h: w.height
    }));

    // 3. Create the SVG Path string
    const pathData = points.reduce((acc, p, i) => 
      acc + (i === 0 ? `M ${p.x} ${p.y}` : ` L ${p.x} ${p.y}`), ""
    );

    return { points, pathData };
  }, [mission]);

  if (!mission || !plotData) {
    return (
      <div style={{ color: '#666', display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
        No mission data selected
      </div>
    );
  }

  return (
    <div style={{ width: '100%', height: '100%', backgroundColor: '#111', borderRadius: '8px', padding: '10px' }}>
      <div style={{ color: '#eee', fontSize: '12px', marginBottom: '8px', fontFamily: 'monospace' }}>
        Mission: {mission.name} | {mission.waypoints.length} Waypoints
      </div>
      
      <svg viewBox={`0 0 ${width} ${height}`} style={{ width: '100%', height: 'auto' }}>
        {/* Grid Lines */}
        <line x1={padding} y1={height-padding} x2={width-padding} y2={height-padding} stroke="#333" strokeWidth="1" />
        <line x1={padding} y1={padding} x2={padding} y2={height-padding} stroke="#333" strokeWidth="1" />

        {/* The Flight Path */}
        <path
          d={plotData.pathData}
          fill="none"
          stroke="#0066ff"
          strokeWidth="3"
          strokeLinejoin="round"
          strokeLinecap="round"
          style={{ filter: 'drop-shadow(0px 0px 4px rgba(0, 102, 255, 0.5))' }}
        />

        {/* Waypoints */}
        {plotData.points.map((p, i) => (
          <g key={i}>
            <circle cx={p.x} cy={p.y} r={i === 0 ? 5 : 3} fill={i === 0 ? "#00ff00" : "#fff"} />
            {/* Height labels for every 5th point to keep it clean */}
            {i % 5 === 0 && (
              <text x={p.x + 5} y={p.y - 5} fill="#888" fontSize="10" fontFamily="sans-serif">
                {p.h}m
              </text>
            )}
          </g>
        ))}
      </svg>
    </div>
  );
};