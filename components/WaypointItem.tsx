import { useState, useEffect, useRef } from 'react';
import { Waypoint, TAG_OPTIONS, TagCategory } from "@/utils/interfaces";


interface Props {
    waypoint: Waypoint;
    index: number;
    onUpdate: (id: string, updates: Partial<Waypoint>) => void;
    onDelete: (id: string) => void;
}

export function WaypointItem({ waypoint, index, onUpdate, onDelete }: Props) {
    const [isConfirming, setIsConfirming] = useState(false);
    const timerRef = useRef<NodeJS.Timeout | null>(null);

    const handleDeleteClick = () => {
        if (!isConfirming) {
            // First click: arm the button
            setIsConfirming(true);
            // Set timeout to reset after 2 seconds
            timerRef.current = setTimeout(() => {
                setIsConfirming(false);
            }, 2000);
        } else {
            // Second click: actually delete
            if (timerRef.current) clearTimeout(timerRef.current);
            onDelete(waypoint.id);
        }
    };

    useEffect(() => {
        return () => {
            if (timerRef.current) clearTimeout(timerRef.current);
        };
    }, []);

    return (
        <div style={{
            background: '#252525',
            padding: '12px',
            borderRadius: '4px',
            marginBottom: '10px',
            border: '1px solid #333',
            fontSize: '11px'
        }}>
            {/* Static Data Grid */}
            <div style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: '4px 12px',
                color: '#aaa',
                marginBottom: '10px'
            }}>
                <div>

                    {index}
                </div>
                <div style={{ textAlign: 'right' }}>
                    <button
                        onClick={handleDeleteClick}
                        style={{
                            background: isConfirming ? '#ff4444' : '#333',
                            color: 'white',
                            border: 'none',
                            borderRadius: '3px',
                            padding: '2px 8px',
                            cursor: 'pointer',
                            fontSize: '10px',
                            transition: 'background 0.2s ease',
                            fontWeight: isConfirming ? 'bold' : 'normal'
                        }}
                    >
                        {isConfirming ? 'CONFIRM?' : 'DELETE'}
                    </button>
                </div>
                
                <div><span style={{ color: '#666' }}>Lon:</span> {waypoint.longitude.toFixed(6)}</div>
                <div><span style={{ color: '#666' }}>Lat:</span> {waypoint.latitude.toFixed(6)}</div>
                <div><span style={{ color: '#666' }}>Elev:</span> {waypoint.elevation}m</div>
                <div><span style={{ color: '#666' }}>Yaw:</span> {waypoint.yaw}°</div>
                <div><span style={{ color: '#666' }}>Pitch:</span> {waypoint.pitch}°</div>
                <div><span style={{ color: '#666' }}>Zoom:</span> {waypoint.zoom}x</div>
            </div>

            {/* Editable Tag Combo */}
            <div style={{ borderTop: '1px solid #333', paddingTop: '8px' }}>
                <label style={{ display: 'block', fontSize: '9px', color: '#0066ff', marginBottom: '4px', fontWeight: 'bold' }}>
                    TAG
                </label>
                <select
                    value={waypoint.tag}
                    onChange={(e) => onUpdate(waypoint.id, { tag: e.target.value })}
                    style={{
                        width: '100%',
                        background: '#111',
                        color: '#fff',
                        border: '1px solid #444',
                        padding: '5px',
                        borderRadius: '3px',
                        outline: 'none'
                    }}
                >
                    {TAG_OPTIONS.map(opt => (
                        <option key={opt.id} value={opt.id}>{opt.category} - {opt.name}</option>
                    ))}
                </select>
            </div>
        </div>
    );
}