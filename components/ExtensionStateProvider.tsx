import React, { createContext, useContext, useEffect, useState } from 'react';
import { MissionMap, Mission } from '@/utils/interfaces';
import { getProjectMissionsStorageKey } from '@/utils/utils';



interface StateContextType {
    loadMissions: (orgId: string, projectId: string) => Promise<MissionMap>;
    saveMissions: (orgId: string, projectId: string, dockSn: string, missions: Mission[]) => Promise<void>;
}

const StateContext = createContext<StateContextType | null>(null);


export function ExtensionStateProvider({ children }: { children: React.ReactNode }) {

    const getStorageKey = (orgId: string, projectId: string) => `local:${getProjectMissionsStorageKey(orgId, projectId)}]`;

    const loadMissions = async (orgId: string, projectId: string): Promise<MissionMap> => {
        const key = getStorageKey(orgId, projectId);
        const data = await storage.getItem<MissionMap>(key as any);
        return data || {};
    };

    const saveMissions = async (orgId: string, projectId: string, dockSn: string, updatedMissions: Mission[]) => {
        const key = getStorageKey(orgId, projectId);
        // 1. Get existing map for this project
        const currentMap = await loadMissions(orgId, projectId);
        // 2. Update only the specific dock
        const newMap = { ...currentMap, [dockSn]: updatedMissions };
        // 3. Save back to storage
        await storage.setItem(key as any, newMap);
    };

    return (
        <StateContext.Provider value={{
            loadMissions,
            saveMissions
        }}>
            {children}
        </StateContext.Provider>
    );
}

export const useExtensionState = () => {
    const context = useContext(StateContext);
    if (!context) throw new Error("useExtensionState must be used within Provider");
    return context;
};