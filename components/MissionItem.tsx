import { useState, useRef } from 'react';
import { WaypointItem } from './WaypointItem';
import { ViewContext, Mission, Waypoint } from '@/utils/interfaces';

interface Props {
    mission: Mission;
    onSave: (updatedMission: Mission) => void;
    onAddWaypoint: (mission: Mission) => void;
    isFetching: boolean;
    onViewDashboard: (mission: Mission) => void;
    viewContext: ViewContext
}

export function MissionItem({ mission, onSave, onAddWaypoint, isFetching, onViewDashboard, viewContext }: Props) {
    const [isExpanded, setIsExpanded] = useState(viewContext == ViewContext.DASHBOARD);
    const addButtonRef = useRef<HTMLButtonElement>(null);

    const updateWaypoint = (wpId: string, updates: Partial<Waypoint>) => {
        const updatedWaypoints = mission.waypoints.map(wp =>
            wp.id === wpId ? { ...wp, ...updates } : wp
        );
        onSave({ ...mission, waypoints: updatedWaypoints, lastUpdated: new Date().toISOString() });
    };

    const deleteWaypoint = (wpId: string) => {
        const updatedWaypoints = mission.waypoints.filter(wp => wp.id !== wpId);
        onSave({
            ...mission,
            waypoints: updatedWaypoints,
            lastUpdated: new Date().toISOString()
        });
    };

    const handleAddWaypointClick = async (e: React.MouseEvent) => {
        e.stopPropagation();

        await onAddWaypoint(mission);

        setTimeout(() => {
            addButtonRef.current?.scrollIntoView({
                behavior: 'smooth',
                block: 'center'
            });
        }, 100);
    };

    return (
        <div style={{ background: '#1e1e1e', borderRadius: '8px', marginBottom: '10px', border: '1px solid #333' }}>
            <div
                onClick={() => viewContext == ViewContext.SIDEPANEL ? setIsExpanded(!isExpanded) : () => { }}
                style={{ padding: '12px', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
            >
                <div style={{ textAlign: 'left' }}>
                    <div style={{ fontWeight: 'bold', fontSize: '14px' }}>{mission.name} - {mission.device?.parent?.deviceOrganizationCallsign}</div>
                    <div style={{ fontSize: '10px', color: '#666' }}>{mission.waypoints.length} Waypoints</div>
                </div>

                {viewContext == ViewContext.SIDEPANEL &&
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            onViewDashboard(mission);
                        }}
                        style={{
                            background: '#333',
                            border: 'none',
                            color: '#99b7e2',
                            padding: '5px 10px',
                            borderRadius: '4px',
                            fontSize: '11px',
                            cursor: 'pointer',
                            fontWeight: 'bold'
                        }}
                    >
                        Dashboard ↗
                    </button>
                }
                <div style={{ fontSize: '18px' }}>{isExpanded ? '▾' : '▸'}</div>
            </div>

            {isExpanded && (
                <div style={{ padding: '12px', borderTop: '1px solid #333', background: '#181818' }}>
                    {mission.waypoints.map((wp, index) => (
                        <WaypointItem
                            key={wp.id}
                            index={index}
                            waypoint={wp}
                            onUpdate={updateWaypoint}
                            onDelete={deleteWaypoint}
                            viewContext={viewContext}
                        />
                    ))}
                    {viewContext == ViewContext.SIDEPANEL &&
                        <button
                            ref={addButtonRef}
                            disabled={isFetching}
                            onClick={handleAddWaypointClick}
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
                    }
                </div>
            )}
        </div>
    );
}