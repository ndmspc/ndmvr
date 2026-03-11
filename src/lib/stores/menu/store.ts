import { create } from "zustand";

interface MenuStore {
    menuExists: boolean;
    showMenu: boolean;
    activeTab: string | null;
    setMenuExists: (exists: boolean) => void;
    setShowMenu: (state: boolean) => void;
    toggleTab: (tab: string) => void;
    setActiveTab: (tab: string | null) => void;
}

export const useMenuStore = create<MenuStore>((set, get) => ({
    menuExists: false,
    showMenu: false,
    activeTab: null,
    setMenuExists: (exists) => set({ menuExists: exists }),
    setShowMenu: (state) => set({ showMenu: state, activeTab: null }),
    toggleTab: (tab) => {
        set((state) => ({
            showMenu: !state.showMenu,
            activeTab: !state.showMenu ? tab : null,
        }));
    },
    setActiveTab: (tab) => set({ activeTab: tab }),
}));
