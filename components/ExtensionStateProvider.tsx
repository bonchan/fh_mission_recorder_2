import React, { createContext, useContext, useEffect, useState } from 'react';
import { Mission } from '@/utils/interfaces';


interface StateContextType {
    missions: Mission[];
    saveMissions: (newMissions: Mission[]) => Promise<void>;
    // liveState: LiveState;
    // updateLiveState: (newState: Partial<LiveState>) => Promise<void>;
    // refreshData: (targetState?: LiveState) => Promise<void>;
}

const StateContext = createContext<StateContextType | null>(null);

export function ExtensionStateProvider({ children }: { children: React.ReactNode }) {
    const [missions, setMissions] = useState<Mission[]>([]);


    const getStorageKey = () => {
        return `local:missions`;
    };

    const saveMissions = async (newMissions: Mission[]) => {
        const key = getStorageKey();
        if (!key) return;
        setMissions(newMissions);
        await storage.setItem(key as any, newMissions);
    };

    return (
        <StateContext.Provider value={{
            missions,
            saveMissions,
            // liveState, 
            // updateLiveState, 
            // refreshData 
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