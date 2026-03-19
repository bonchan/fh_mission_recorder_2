import { useState, useEffect } from 'react';
import { useExtensionState } from '@/components/ExtensionStateProvider';
import { MissionItem } from '@/components/MissionItem';
import { ViewContext, MissionMap, Mission, Waypoint, Dock } from '@/utils/interfaces';
import { delay } from '@/utils/time';
import { toDock, toWaypoint } from '@/utils/mapper'
import { getProjectMissionsStorageKey } from '@/utils/utils';

export default function SidePanelView() {
  const { loadMissions, saveMissions } = useExtensionState();
  const [projectMissionsMap, setProjectMissionsMap] = useState<MissionMap>({});

  const [isFetching, setIsFetching] = useState(false);

  // --- Modal State ---
  const [showModal, setShowModal] = useState(false);
  const [newMissionName, setNewMissionName] = useState('');
  const [projectId, setProjectId] = useState('');
  const [orgId, setOrgId] = useState('');
  const [selectedDeviceIndex, setSelectedDeviceIndex] = useState(0);
  const [devices, setDevices] = useState<Drone[]>([]);

  const [currentUser, setCurrentUser] = useState('');


  useEffect(() => {

    const init = async () => {

      setIsFetching(true);
      try {
        const [tab] = await browser.tabs.query({ active: true, currentWindow: true });
        if (!tab?.id) return;

        if (!currentUser) {
          const currentUserResponse = await browser.tabs.sendMessage(tab.id, { action: "GET_CURRENT_USER" });
          setCurrentUser(currentUserResponse.currentUser.data.nickname)
        }

        const topologiesResponse = await browser.tabs.sendMessage(tab.id, { action: "GET_TOPOLOGIES" });

        const pId = topologiesResponse.projectId;
        const oId = topologiesResponse.orgId;
        const topologies = topologiesResponse.topologies.data.list

        setProjectId(pId);
        setOrgId(oId);

        const data = await loadMissions(oId, pId);
        setProjectMissionsMap(data);

        const deviceList: Drone[] = [];

        for (const item of topologies) {
          const drone = toDockDrone(item);
          // Only add to the list if the mapper returned a valid object
          if (drone && drone.deviceSn && drone.parent.deviceSn) {
            deviceList.push(drone);
          }
        }
        const deviceListSorted = [...deviceList].sort((a, b) => {
          const indexA = a.parent?.index ?? 999;
          const indexB = b.parent?.index ?? 999;
          return indexA - indexB;
        });

        setDevices(deviceListSorted);
        if (deviceListSorted.length > 0) {
          setSelectedDeviceIndex(0)
        }

      } catch (err) {
        console.error("Failed to load docks", err);
        alert("Please ensure the DJI tab is active and refreshed.");
      } finally {
        setIsFetching(false);
      }

    };
    init();

    const handleStorageChange = (changes: any, areaName: string) => {
      if (areaName === 'local' && projectId && orgId) {
        const expectedKey = getProjectMissionsStorageKey(orgId, projectId);
        if (changes[expectedKey]) {
          console.log("Storage updated in another tab! Syncing...", changes[expectedKey]);
          setProjectMissionsMap(changes[expectedKey].newValue || {});
        }
      }
    };

    browser.storage.onChanged.addListener(handleStorageChange);

    return () => {
      browser.storage.onChanged.removeListener(handleStorageChange);
    };

  }, [projectId, orgId]);

  // 1. Open Modal and Fetch Docks via Content Script
  const openCreateModal = async () => {
    setShowModal(true);
  };

  // 2. Finalize Mission Creation
  const handleConfirmCreate = async () => {
    console.log(newMissionName, selectedDeviceIndex)
    if (!newMissionName) return;

    const selectedDock = devices[selectedDeviceIndex];
    const dockSn = selectedDock?.parent?.deviceSn

    if (dockSn == undefined) return;

    const newMission: Mission = {
      id: crypto.randomUUID(),
      name: newMissionName,
      author: currentUser,
      projectId: projectId,
      orgId: orgId,
      device: devices[selectedDeviceIndex],
      lastUpdated: Date.now(),
      isExpanded: true,
      waypoints: [],
    };

    const currentDockMissions = projectMissionsMap[dockSn] || [];
    const updatedList = [newMission, ...currentDockMissions];
    await saveMissions(orgId, projectId, dockSn, updatedList);
    setProjectMissionsMap(prev => ({ ...prev, [dockSn]: updatedList }));

    // await saveMissions([newMission, ...missions]);

    // Reset and Close
    setNewMissionName('');
    setShowModal(false);

    console.log('newMission', newMission)
  };

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

  const handleAddWaypoint = async (mission: Mission) => {
    if (isFetching) return;
    setIsFetching(true);

    try {
      const [tab] = await browser.tabs.query({ active: true, currentWindow: true });
      if (!tab?.id) return;

      const response = await browser.tabs.sendMessage(tab.id, { action: "GET_TOPOLOGIES" });

      // 1. Find the specific drone data in the response
      let capturedWaypoint: Waypoint | null = null;

      for (const item of response.topologies.data.list) {
        const wp = toWaypoint(item);
        if (wp && wp.deviceSn === mission.device?.deviceSn) {
          capturedWaypoint = wp;
          break;
        }
      }

      if (!capturedWaypoint) {
        throw new Error("Could not find telemetry for the drone assigned to this mission.");
      }

      // 2. Identify the Dock SN for storage
      const dockSn = mission.device?.parent?.deviceSn;
      if (!dockSn) throw new Error("Mission has no associated dock SN");

      // 3. Update the specific mission within the dock's list
      const currentDockMissions = projectMissionsMap[dockSn] || [];

      const updatedList = currentDockMissions.map(m => {
        if (m.id === mission.id) {
          return {
            ...m,
            lastUpdated: Date.now(),
            waypoints: [...m.waypoints, capturedWaypoint!]
          };
        }
        return m;
      });

      // 4. Update local map state
      setProjectMissionsMap(prev => ({
        ...prev,
        [dockSn]: updatedList
      }));

      // 5. Persist to project-specific storage
      await saveMissions(orgId, projectId, dockSn, updatedList);

    } catch (err) {
      console.error("Waypoint addition failed:", err);
      alert(err instanceof Error ? err.message : "Error adding waypoint.");
    } finally {
      setIsFetching(false);
    }
  };

  const handleViewDashboard = async (mission: Mission) => {
    const [tab] = await browser.tabs.query({ active: true, currentWindow: true });
    if (!tab?.id) return;

    browser.runtime.sendMessage({
      type: 'OPEN_DASHBOARD',
      missionId: mission.id,
      orgId: mission.orgId,
      projectId: mission.projectId,
      sourceTabId: tab.id
    });
  };


  const displayMissions = Object.values(projectMissionsMap).flat();

  return (
    <div style={{ padding: '20px', backgroundColor: '#121212', color: '#e0e0e0', minHeight: '100vh', fontFamily: 'sans-serif' }}>

      <button
        onClick={openCreateModal}
        disabled={isFetching}
        style={{
          width: '100%', padding: '10px', background: '#0066ff', color: 'white',
          border: 'none', borderRadius: '4px', cursor: isFetching ? 'not-allowed' : 'pointer',
          marginBottom: '20px', fontWeight: 'bold'
        }}
      >
        {isFetching ? 'Wait...' : 'New Mission'}
      </button>

      {/* --- Overlay Modal --- */}
      {showModal && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.8)', display: 'flex',
          alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '20px'
        }}>
          <div style={{
            background: '#1e1e1e', padding: '20px', borderRadius: '8px',
            width: '100%', maxWidth: '300px', border: '1px solid #333'
          }}>
            <h2 style={{ fontSize: '1.1rem', marginTop: 0 }}>Create Mission</h2>

            <label style={{ display: 'block', fontSize: '12px', marginBottom: '5px', color: '#888' }}>Mission Name</label>
            <input
              value={newMissionName}
              onChange={(e) => setNewMissionName(e.target.value)}
              placeholder="e.g. Morning Patrol"
              style={{ width: '100%', padding: '8px', marginBottom: '15px', background: '#2c2c2c', border: '1px solid #444', color: 'white', boxSizing: 'border-box' }}
            />

            <label style={{ display: 'block', fontSize: '12px', marginBottom: '5px', color: '#888' }}>Select Dock</label>
            <select
              value={selectedDeviceIndex}
              onChange={(e) => setSelectedDeviceIndex(Number(e.target.value))}
              style={{ width: '100%', padding: '8px', marginBottom: '20px', background: '#2c2c2c', border: '1px solid #444', color: 'white' }}
            >
              {devices.map((device, index) => {
                return (
                  <option key={device.parent?.deviceSn} value={index}>{device.parent?.deviceOrganizationCallsign} - {device.deviceOrganizationCallsign}</option>
                )
              }
              )}
            </select>

            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                onClick={() => setShowModal(false)}
                style={{ flex: 1, padding: '8px', background: 'transparent', border: '1px solid #555', color: 'white', cursor: 'pointer' }}
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmCreate}
                disabled={!newMissionName}
                style={{ flex: 1, padding: '8px', background: '#0066ff', border: 'none', color: 'white', cursor: 'pointer', opacity: !newMissionName ? 0.5 : 1 }}
              >
                Create
              </button>
            </div>
          </div>
        </div>
      )}

      <h3 style={{ fontSize: '1rem', marginBottom: '10px' }}>Missions ({displayMissions.length})</h3>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {displayMissions.length === 0 ? (
          <div style={{ color: '#555', fontSize: '12px', textAlign: 'center', marginTop: '20px' }}>
            No missions logged.
          </div>
        ) : (
          displayMissions.map((m) => (
            <MissionItem
              key={m.id}
              mission={m}
              isFetching={isFetching}
              viewContext={ViewContext.SIDEPANEL}
              onSave={handleUpdateMission}
              onAddWaypoint={handleAddWaypoint}
              onViewDashboard={handleViewDashboard}
              onExportMission={() => { }}
            />
          ))
        )}
      </div>
    </div>
  );
}