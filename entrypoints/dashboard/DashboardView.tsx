import React, { useState, useEffect } from 'react';
import { MissionItem } from '@/components/MissionItem';
import { MissionVisualizer } from '@/components/MissionVisualizer';
import { useExtensionState } from '@/components/ExtensionStateProvider';
import { ViewContext, Mission, MissionMap } from '@/utils/interfaces';
import { browser } from 'wxt/browser';
import { getProjectMissionsStorageKey } from '@/utils/utils';
import { generateDJIMission, generateDJIMissionFiles } from '@/utils/wpml-generator';
import { XMLDebugModal } from '@/components/XMLDebugModal';

export function DashboardView() {
    const { loadMissions, saveMissions, loadAnnotations } = useExtensionState();
    const [debugXml, setDebugXml] = useState<{ template: string, waylines: string } | null>(null);

    // 1. Get IDs from URL
    const params = new URLSearchParams(window.location.search);
    const initialMissionId = params.get('missionId');
    const orgId = params.get('orgId') || '';
    const projectId = params.get('projectId') || '';

    const [selectedMissionId, setSelectedMissionId] = useState(initialMissionId);
    const [projectMissionsMap, setProjectMissionsMap] = useState<MissionMap>({});

    const [annotations, setAnnotations] = useState<Annotation[]>([]);

    // 2. Fetch Initial Data using Provider logic
    useEffect(() => {
        const fetchInitialData = async () => {
            if (!orgId || !projectId) return;
            const missions = await loadMissions(orgId, projectId);
            setProjectMissionsMap(missions);

            const annotations = await loadAnnotations(orgId, projectId);
            setAnnotations(annotations);
        };
        fetchInitialData();
    }, [orgId, projectId]);

    // 3. Sync Listener: If sidepanel adds a waypoint, dashboard updates immediately
    useEffect(() => {
        if (!orgId || !projectId) return;

        const handleStorageChange = (changes: any, areaName: string) => {
            // Using your double underscore key format
            const expectedKey = getProjectMissionsStorageKey(orgId, projectId);
            if (areaName === 'local' && changes[expectedKey]) {
                setProjectMissionsMap(changes[expectedKey].newValue || {});
            }
        };

        browser.storage.onChanged.addListener(handleStorageChange);
        return () => browser.storage.onChanged.removeListener(handleStorageChange);
    }, [orgId, projectId]);

    const handleUpdateMission = async (updatedMission: Mission) => {
        // 1. Identify which dock this mission belongs to
        const dockSn = updatedMission.device?.parent?.deviceSn;
        if (!dockSn) {
            console.error("Mission has no associated dock SN");
            return;
        }

        // 2. Get the current list for that specific dock from your local map state
        const currentDockMissions = projectMissionsMap[dockSn] || [];

        // 3. Map through ONLY that dock's missions to update the one that changed
        const updatedList = currentDockMissions.map(m =>
            m.id === updatedMission.id ? updatedMission : m
        );

        // 4. Update local UI state (the map)
        setProjectMissionsMap(prev => ({
            ...prev,
            [dockSn]: updatedList
        }));

        // 5. Persist to storage using the org/project/dock context
        await saveMissions(orgId, projectId, dockSn, updatedList);
    };

    const handleExportMission = async (mission: Mission) => {
        const blob = await generateDJIMission(mission);
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;

        const cleanName = mission.name.replace(/[<>:"/|?*._\\]/g, '');
        a.download = `P2--${cleanName}.kmz`;
        a.click();
        window.URL.revokeObjectURL(url);
    }

    const handleDebugMission = async (mission: Mission) => {
        const { template, waylines } = await generateDJIMissionFiles(mission)
        setDebugXml({ template, waylines });
    }

    // 4. Flatten map for the sidebar list
    const missions = Object.values(projectMissionsMap).flat();
    const activeMission = missions.find(m => m.id === selectedMissionId);

    return (
        <div style={{
            display: 'grid',
            gridTemplateColumns: '280px 1fr 1.5fr',
            height: '100vh',
            backgroundColor: '#121212',
            color: '#eee',
            fontFamily: 'Inter, system-ui, sans-serif'
        }}>
            {debugXml && (
                <XMLDebugModal
                    templateKml={debugXml.template}
                    waylinesWpml={debugXml.waylines}
                    onClose={() => setDebugXml(null)}
                />
            )}

            {/* Column 1: Missions List */}
            <div style={{ borderRight: '1px solid #333', padding: '15px', overflowY: 'auto' }}>
                <h3 style={{ fontSize: '11px', textTransform: 'uppercase', color: '#555', letterSpacing: '1px' }}>Project Missions</h3>
                <div style={{ marginTop: '20px' }}>
                    {missions.length === 0 ? (
                        <p style={{ fontSize: '12px', color: '#555' }}>No missions found for this project.</p>
                    ) : (
                        missions.map(m => (
                            <div
                                key={m.id}
                                onClick={() => setSelectedMissionId(m.id)}
                                style={{
                                    padding: '12px',
                                    marginBottom: '8px',
                                    borderRadius: '6px',
                                    cursor: 'pointer',
                                    fontSize: '13px',
                                    transition: 'all 0.2s ease',
                                    backgroundColor: selectedMissionId === m.id ? '#1e1e1e' : 'transparent',
                                    border: selectedMissionId === m.id ? '1px solid #0066ff' : '1px solid transparent',
                                    color: selectedMissionId === m.id ? '#fff' : '#aaa'
                                }}
                            >
                                <div style={{ fontWeight: 'bold' }}>{m.name}</div>
                                <div style={{ fontSize: '10px', color: '#555', marginTop: '4px' }}>
                                    {m.device?.parent?.deviceOrganizationCallsign} • {m.waypoints.length} WPs
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>

            {/* Column 2: Mission Detail View */}
            <div style={{ borderRight: '1px solid #333', padding: '20px', overflowY: 'auto' }}>
                <h3 style={{ fontSize: '11px', textTransform: 'uppercase', color: '#555', letterSpacing: '1px' }}>Waypoint Editor</h3>
                <div style={{ marginTop: '20px' }}>
                    {activeMission ? (
                        <MissionItem
                            mission={activeMission}
                            isFetching={false}
                            viewContext={ViewContext.DASHBOARD}
                            onSave={handleUpdateMission}
                            onAddWaypoint={() => { }}
                            onViewDashboard={() => { }}
                            onExportMission={handleExportMission}
                            onDebugMission={handleDebugMission}
                        />
                    ) : (
                        <div style={{ textAlign: 'center', marginTop: '100px', color: '#333' }}>
                            <div style={{ fontSize: '40px', marginBottom: '10px' }}>🔭</div>
                            Select a mission to view telemetry
                        </div>
                    )}
                </div>
            </div>

            {/* Column 3: Map Legend */}
            <div style={{ padding: '20px', backgroundColor: '#0a0a0a' }}>
                <div style={{
                    border: '1px solid #222',
                    height: '100%',
                    borderRadius: '12px',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    background: 'radial-gradient(circle at center, #111 0%, #0a0a0a 100%)'
                }}>
                    {activeMission && (
                        <MissionVisualizer mission={activeMission} annotations={annotations} />
                    )}
                </div>
            </div>
        </div>
    );
}