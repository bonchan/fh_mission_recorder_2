import { useState } from 'react';
import { WaypointItem } from './WaypointItem';
import { Mission, Waypoint } from '@/utils/interfaces';

interface Props {
    mission: Mission;
    onSave: (updatedMission: Mission) => void;
    onAddWaypoint: (mission: Mission) => void;
    isFetching: boolean;
    onViewDashboard: (missionId: string) => void;
}

export function MissionItem({ mission, onSave, onAddWaypoint, isFetching, onViewDashboard }: Props) {
    const [isExpanded, setIsExpanded] = useState(false);

    const updateWaypoint = (wpId: string, updates: Partial<Waypoint>) => {
        const updatedWaypoints = mission.waypoints.map(wp =>
            wp.id === wpId ? { ...wp, ...updates } : wp
        );
        onSave({ ...mission, waypoints: updatedWaypoints, lastUpdated: new Date().toISOString() });
    };

    return (
        <div style={{ background: '#1e1e1e', borderRadius: '8px', marginBottom: '10px', border: '1px solid #333' }}>
            <div
                onClick={() => setIsExpanded(!isExpanded)}
                style={{ padding: '12px', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
            >
                <div style={{ textAlign: 'left' }}>
                    <div style={{ fontWeight: 'bold', fontSize: '14px' }}>{mission.name} - {mission.device?.parent?.deviceOrganizationCallsign}</div>
                    <div style={{ fontSize: '10px', color: '#666' }}>{mission.waypoints.length} Waypoints</div>
                </div>
                {/* <button
                    onClick={(e) => {
                        e.stopPropagation();
                        onViewDashboard(mission.id);
                    }}
                    style={{
                        background: '#333',
                        border: 'none',
                        color: '#0066ff',
                        padding: '5px 10px',
                        borderRadius: '4px',
                        fontSize: '11px',
                        cursor: 'pointer',
                        fontWeight: 'bold'
                    }}
                >
                    MAP ↗
                </button> */}
                <div style={{ fontSize: '18px' }}>{isExpanded ? '▾' : '▸'}</div>
            </div>

            {isExpanded && (
                <div style={{ padding: '12px', borderTop: '1px solid #333', background: '#181818' }}>

                    <button
                        disabled={isFetching}
                        onClick={(e) => {
                            e.stopPropagation();
                            onAddWaypoint(mission);
                        }}
                        style={{
                            width: '100%',
                            padding: '10px',
                            background: isFetching ? '#333' : '#0066ff',
                            color: isFetching ? '#888' : 'white',
                            border: 'none',
                            borderRadius: '4px',
                            cursor: isFetching ? 'not-allowed' : 'pointer',
                            display: 'flex',
                            justifyContent: 'center',
                            alignItems: 'center',
                            gap: '10px'
                        }}
                    >
                        {isFetching ? (
                            <>
                                <span className="spinner"></span> Wait...
                            </>
                        ) : (
                            "+ Add Waypoint at Drone Position"
                        )}
                    </button>
                    <br></br>

                    {mission.waypoints.map(wp => (
                        <WaypointItem key={wp.id} waypoint={wp} onUpdate={updateWaypoint} />
                    ))}
                </div>
            )}
        </div>
    );
}