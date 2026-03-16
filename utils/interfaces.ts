export interface Mission {
    id: string;
    name: string;
    projectId: string;
    orgId: string;
    device: Drone | undefined;
    lastUpdated: string;
    waypoints: Waypoint[];
}

export interface Waypoint {
    id: string;
    deviceSn: string;
    longitude: number;
    latitude: number;
    elevation: number;
    height: number;
    yaw: number;
    pitch: number;
    zoom: number;
    tag: string;
}









export interface Dock {
    index: number;
    deviceSn: string;
    deviceModelName: string;
    deviceOrganizationCallsign: string;
    longitude: number;
    latitude: number;
    height: number;
}

export interface Drone {
    deviceSn: string;
    deviceModelName: string;
    deviceModelKey: string;
    deviceOrganizationCallsign: string;
    payloadIndex: string | number;
    parent: Dock | null;
}
