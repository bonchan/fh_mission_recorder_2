// import { useExtensionState } from '@/components/ExtensionStateProvider';
// import { MissionItem } from '@/components/MissionItem';
// import { Mission, Waypoint } from '@/utils/interfaces'
// import { delay } from '@/utils/time';

// export default function SidePanelView() {
//   const { missions, saveMissions } = useExtensionState();
//   const [isFetching, setIsFetching] = useState(false);

//   const createNewMission = async () => {
//     const missionName = window.prompt("Enter Mission Name:");

//     if (missionName == null || missionName == '') return

//     const newMission: Mission = {
//       id: crypto.randomUUID(),
//       name: missionName,
//       lastUpdated: new Date().toISOString(),
//       waypoints: [],
//     };

//     console.log('newMission', newMission)

//     const updatedMissions = [newMission, ...missions];
//     await saveMissions(updatedMissions);
//   };

//   const handleUpdateMission = async (updatedMission: Mission) => {
//         const updatedMissions = missions.map(m => m.id === updatedMission.id ? updatedMission : m);
//         saveMissions(updatedMissions);
//     };

// const handleAddWaypoint = async (missionId: string) => {
//         if ( isFetching) return;

//         setIsFetching(true);

//         await delay(1500);

//         try {
//             // // 1. Get the active tab
//             // const [tab] = await browser.tabs.query({ active: true, currentWindow: true });

//             // // 2. Message the content script to get live API/UI data
//             // const messagePayload = {
//             //     type: 'GET_COCKPIT_DATA',
//             //     payload: data
//             // };

//             // const liveData = await browser.tabs.sendMessage(tab.id!, messagePayload);

//             // 3. Create the waypoint with REAL data
//             const newWaypoint: Waypoint = {
//                 id: crypto.randomUUID(),
//                 // longitude: liveData.longitude,
//                 // latitude: liveData.latitude,
//                 // elevation: liveData.elevation,
//                 // yaw: liveData.yaw,
//                 // pitch: liveData.pitch,
//                 // zoom: liveData.zoom,

//                 longitude: 0,
//                 latitude: 0,
//                 elevation: 0,
//                 yaw: 0,
//                 pitch: 0,
//                 zoom: 1,

//                 tag: "None",
//                 // actionGroup: [],
//             };

//             // 4. Update state and storage
//             const updatedMissions = missions.map(m => {
//                 if (m.id === missionId) {
//                     return { ...m, lastUpdated: new Date().toISOString(), waypoints: [...m.waypoints, newWaypoint] };
//                 }
//                 return m;
//             });

//             // const storageKey = `${data.ORG_ID}_${data.PROJECT_UUID}_${data.DOCK_SN}_missions`;
//             // await browser.storage.local.set({ [storageKey]: updatedMissions });
//             saveMissions(updatedMissions);

//         } catch (err) {
//             console.error("Could not grab data from page. Is the DJI tab active?", err);
//             alert("Error adding new waypoint, try again.");
//         } finally {
//             setIsFetching(false);
//         }
//     };

//   return (
//     <div style={{ padding: '20px', backgroundColor: '#121212', color: '#e0e0e0', minHeight: '100vh', fontFamily: 'sans-serif' }}>
//       <button
//         onClick={() => createNewMission()}
//         style={{ width: '100%', padding: '8px', background: '#0066ff', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', marginBottom: '20px' }}
//       >
//         New Mission
//       </button>

//       <h3 style={{ fontSize: '1rem', marginBottom: '10px' }}>Missions (
//         {missions.length}
//         )</h3>
//       <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
//         {missions.length === 0 ? (
//           <div style={{ color: '#555', fontSize: '12px', textAlign: 'center', marginTop: '20px' }}>No missions logged for this configuration.</div>
//         ) : (
//           missions.map((m) => (

//             // <pre style={{ fontSize: '10px', color: '#888', background: '#000', padding: '10px' }}>
//             //   {JSON.stringify(m, null, 2)}
//             // </pre>


//             <MissionItem
//               key={m.id}
//               mission={m}
//               onSave={handleUpdateMission}
//               onAddWaypoint={handleAddWaypoint}
//               isFetching={isFetching}
//               onViewDashboard={() => { }}
//             />
//           ))
//         )}
//       </div>
//     </div>
//   );

// }


import { useState, useEffect } from 'react';
import { useExtensionState } from '@/components/ExtensionStateProvider';
import { MissionItem } from '@/components/MissionItem';
import { Mission, Waypoint, Dock } from '@/utils/interfaces';
import { delay } from '@/utils/time';
import { toDock, toWaypoint } from '@/utils/mapper'

export default function SidePanelView() {
  const { missions, saveMissions } = useExtensionState();
  const [isFetching, setIsFetching] = useState(false);

  // --- Modal State ---
  const [showModal, setShowModal] = useState(false);
  const [newMissionName, setNewMissionName] = useState('');
  const [projectId, setProjectId] = useState('');
  const [orgId, setOrgId] = useState('');
  const [selectedDeviceIndex, setSelectedDeviceIndex] = useState(0);
  const [devices, setDevices] = useState<Drone[]>([]);

  useEffect(() => {
    console.log("This runs only once on mount");

    const init = async () => {
      // Perform initial setup, check auth, or fetch data
      console.log("Sidepanel opened");

      setIsFetching(true);
      try {
        const [tab] = await browser.tabs.query({ active: true, currentWindow: true });
        if (!tab?.id) return;
        const response = await browser.tabs.sendMessage(tab.id, { action: "GET_TOPOLOGIES" });
        console.log('response', response)
        setProjectId(response.projectId)
        setOrgId(response.orgId)
        const deviceList: Drone[] = [];

        for (const item of response.topologies.data.list) {
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

        console.log('deviceListSorted', deviceListSorted)

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

  }, []);

  // 1. Open Modal and Fetch Docks via Content Script
  const openCreateModal = async () => {
    setShowModal(true);
  };

  // 2. Finalize Mission Creation
  const handleConfirmCreate = async () => {
    console.log(newMissionName, selectedDeviceIndex)
    if (!newMissionName) return;

    const newMission: Mission = {
      id: crypto.randomUUID(),
      name: newMissionName,
      projectId: projectId,
      orgId: orgId,
      device: devices[selectedDeviceIndex],
      lastUpdated: new Date().toISOString(),
      waypoints: [],
    };

    await saveMissions([newMission, ...missions]);

    // Reset and Close
    setNewMissionName('');
    setShowModal(false);

    console.log(newMission)
  };

  const handleUpdateMission = async (updatedMission: Mission) => {
    const updatedMissions = missions.map(m => m.id === updatedMission.id ? updatedMission : m);
    saveMissions(updatedMissions);
  };

  const handleAddWaypoint = async (mission: Mission) => {
    if (isFetching) return;

    setIsFetching(true);

    // await delay(1500);
    // alert(mission)

    try {


      const [tab] = await browser.tabs.query({ active: true, currentWindow: true });
      if (!tab?.id) return;
      const response = await browser.tabs.sendMessage(tab.id, { action: "GET_TOPOLOGIES" });
      console.log('response', response)

      let newWaypoint: Waypoint;

      for (const item of response.topologies.data.list) {
        newWaypoint = toWaypoint(item);
        // Only add to the list if the mapper returned a valid object
        if (newWaypoint && newWaypoint.deviceSn && newWaypoint.deviceSn == mission.device?.deviceSn) {
          break
        }
      }

      // 4. Update state and storage
      const updatedMissions = missions.map(m => {
        if (m.id === mission.id) {
          return { ...m, lastUpdated: new Date().toISOString(), waypoints: [...m.waypoints, newWaypoint] };
        }
        return m;
      });

      // const storageKey = `${data.ORG_ID}_${data.PROJECT_UUID}_${data.DOCK_SN}_missions`;
      // await browser.storage.local.set({ [storageKey]: updatedMissions });
      saveMissions(updatedMissions);

    } catch (err) {
      console.error("Could not grab data from page. Is the DJI tab active?", err);
      alert("Error adding new waypoint, try again.");
    } finally {
      setIsFetching(false);
    }
  };

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

      <h3 style={{ fontSize: '1rem', marginBottom: '10px' }}>Missions ({missions.length})</h3>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {missions.length === 0 ? (
          <div style={{ color: '#555', fontSize: '12px', textAlign: 'center', marginTop: '20px' }}>
            No missions logged.
          </div>
        ) : (
          missions.map((m) => (
            <MissionItem
              key={m.id}
              mission={m}
              onSave={handleUpdateMission}
              onAddWaypoint={handleAddWaypoint}
              isFetching={isFetching}
              onViewDashboard={() => { }}
            />
          ))
        )}
      </div>
    </div>
  );
}