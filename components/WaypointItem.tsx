import { Waypoint } from "@/utils/interfaces";

const TAG_OPTIONS = ["None", "Power Line", "Insulator", "Tower Base", "Vegetation", "Hardware"];

interface Props {
    waypoint: Waypoint;
    onUpdate: (id: string, updates: Partial<Waypoint>) => void;
}

export function WaypointItem({ waypoint, onUpdate }: Props) {
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
                        <option key={opt} value={opt}>{opt}</option>
                    ))}
                </select>
            </div>
        </div>
    );
}