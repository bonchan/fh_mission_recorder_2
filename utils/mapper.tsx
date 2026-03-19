import { Drone, Dock } from '@/utils/interfaces';
import { extractNumber } from '@/utils/utils'

export function toDock(djiItem: any): any | null {
    if (!djiItem.host || !djiItem.parents || djiItem.parents.length === 0) return null;
    const parentRaw = djiItem.parents[0];
    const device_state = parentRaw.device_state;

    const dock: Dock = {
        index: extractNumber(parentRaw.device_organization_callsign),
        deviceSn: parentRaw.device_sn,
        deviceModelName: parentRaw.device_model.name,
        deviceOrganizationCallsign: parentRaw.device_organization_callsign,
        longitude: device_state.longitude,
        latitude: device_state.latitude,
        height: device_state.height,
    };

    return dock

}

export function toDrone(djiItem: any, dock: Dock | null): any | null {
    if (!djiItem.host || !djiItem.parents || djiItem.parents.length === 0) return null;

    const hostRaw = djiItem.host;
    const camera = hostRaw.device_state.cameras?.[0] || { payload_index: 'unknown' };

    const drone: Drone = {
        deviceSn: hostRaw.device_sn,
        deviceModelName: hostRaw.device_model.name,
        deviceModelKey: hostRaw.device_model.key,
        deviceOrganizationCallsign: hostRaw.device_organization_callsign,
        payloadIndex: camera.payload_index,
        parent: dock,
    };

    return drone

}

export function toDockDrone(djiItem: any): any | null {
    if (!djiItem.host || !djiItem.parents || djiItem.parents.length === 0) return null;
    const dock: Dock = toDock(djiItem)
    const drone: Drone = toDrone(djiItem, dock)
    return drone;
}




export function toWaypoint(djiItem: any): any | null {
    if (!djiItem.host || !djiItem.parents || djiItem.parents.length === 0) return null;
    const hostRaw = djiItem.host;
    const device_state = hostRaw.device_state;
    const payload_index = device_state.cameras[0].payload_index;

    const waypoint: Waypoint = {
        deviceSn: hostRaw.device_sn,
        id: crypto.randomUUID(),
        longitude: device_state.longitude,
        latitude: device_state.latitude,
        elevation: device_state.elevation,
        height: device_state.height,
        yaw: device_state[payload_index].gimbal_yaw,
        pitch: device_state[payload_index].gimbal_pitch,
        zoom: device_state.cameras[0].zoom_factor,
        turn: 'CW',
        tag: 'None',
        actionGroup: null
    };

    // const getRandom = (min: number, max: number) => Math.random() * (max - min) + min;
    // const offset = 0.0001;

    // const waypoint: Waypoint = {
    //     deviceSn: hostRaw.device_sn,
    //     id: crypto.randomUUID(),
    //     // Simple +- 1000m (approx)
    //     longitude: device_state.longitude + getRandom(-offset, offset),
    //     latitude: device_state.latitude + getRandom(-offset, offset),
    //     // 20 to 50m
    //     elevation: getRandom(20, 50),
    //     height: getRandom(20, 50),
    //     // 0 to 360
    //     yaw: getRandom(0, 360),
    //     // -90 to 20
    //     pitch: getRandom(-90, 20),
    //     zoom: device_state.cameras[0].zoom_factor,
    //     tag: 'None',
    // };

    return waypoint

}