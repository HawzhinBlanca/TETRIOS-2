

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Booster, BoosterType, LevelRewards, AdventureLevelConfig } from '../types';
import { BOOSTERS, DEFAULT_COINS } from '../constants';

interface BoosterState {
    coins: number;
    ownedBoosters: Record<BoosterType, number>;
    activeBoosters: BoosterType[]; // Boosters selected for the current level
    
    // Actions
    addCoins: (amount: number) => void;
    spendCoins: (amount: number) => boolean; // Returns true if successful
    addBooster: (type: BoosterType, amount: number) => void;
    useBooster: (type: BoosterType) => void; // Uses one of a booster (removes from owned)
    toggleActiveBooster: (type: BoosterType) => void; // Add/remove from active for current level
    consumeActiveBoosters: () => void; // Deduct active boosters from owned inventory
    resetActiveBoosters: () => void; // Clears active boosters after level start/end
    applyLevelRewards: (rewards: LevelRewards, levelConfig?: AdventureLevelConfig) => void; // Apply end-of-level rewards
    initializeBoosters: () => void; // Set up initial boosters and coins
}

export const useBoosterStore = create<BoosterState>()(
    persist(
        (set, get) => ({
            coins: DEFAULT_COINS,
            ownedBoosters: {} as Record<BoosterType, number>,
            activeBoosters: [],

            addCoins: (amount) => set((state) => ({ coins: state.coins + amount })),
            spendCoins: (amount) => {
                const { coins } = get();
                if (coins >= amount) {
                    set((state) => ({ coins: state.coins - amount }));
                    return true;
                }
                return false;
            },
            addBooster: (type, amount) => set((state) => ({
                ownedBoosters: {
                    ...state.ownedBoosters,
                    [type]: (state.ownedBoosters[type] || 0) + amount,
                },
            })),
            useBooster: (type) => set((state) => {
                const currentQuantity = state.ownedBoosters[type] || 0;
                if (currentQuantity > 0) {
                    return {
                        ownedBoosters: {
                            ...state.ownedBoosters,
                            [type]: currentQuantity - 1,
                        },
                    };
                }
                return state;
            }),
            toggleActiveBooster: (type) => set((state) => {
                const isActive = state.activeBoosters.includes(type);
                if (isActive) {
                    return { activeBoosters: state.activeBoosters.filter((t) => t !== type) };
                } else {
                    // Check if player owns this booster
                    if ((state.ownedBoosters[type] || 0) > 0) {
                        return { activeBoosters: [...state.activeBoosters, type] };
                    }
                }
                return state;
            }),
            consumeActiveBoosters: () => set((state) => {
                const newOwnedBoosters = { ...state.ownedBoosters };
                state.activeBoosters.forEach(boosterType => {
                    if (newOwnedBoosters[boosterType]) {
                        newOwnedBoosters[boosterType]--;
                    }
                });
                return { ownedBoosters: newOwnedBoosters };
            }),
            resetActiveBoosters: () => set({ activeBoosters: [] }),
            applyLevelRewards: (rewards, levelConfig) => {
                const { addCoins, addBooster } = get();
                addCoins(rewards.coins);

                // Add boosters specifically from the level's rewards config
                levelConfig?.rewards?.boosters?.forEach(rewardBooster => {
                    addBooster(rewardBooster.type, rewardBooster.amount);
                });

                // Also add any booster rewards directly specified in the `rewards` parameter
                rewards.boosterRewards?.forEach(rewardBooster => {
                    addBooster(rewardBooster.type, rewardBooster.amount);
                });
            },
            initializeBoosters: () => {
                const { ownedBoosters } = get();
                // Add initial quantities of boosters if not already present
                Object.values(BOOSTERS).forEach(booster => {
                    if (booster.initialQuantity && !(booster.type in ownedBoosters)) {
                        set((state) => ({
                            ownedBoosters: {
                                ...state.ownedBoosters,
                                [booster.type]: booster.initialQuantity!,
                            },
                        }));
                    }
                });
            },
        }),
        {
            name: 'tetrios-booster-store',
            version: 2, // Increment version for new field
            migrate: (persistedState: any, currentVersion) => {
                if (currentVersion < 2) {
                    // Initialize default boosters
                    Object.values(BOOSTERS).forEach(booster => {
                        if (booster.initialQuantity && !(booster.type in persistedState.ownedBoosters)) {
                            persistedState.ownedBoosters = {
                                ...persistedState.ownedBoosters,
                                [booster.type]: booster.initialQuantity,
                            };
                        }
                    });
                }
                return persistedState as BoosterState;
            },
        }
    )
);

// Call initializeBoosters on app start to ensure initial boosters are set
useBoosterStore.getState().initializeBoosters();