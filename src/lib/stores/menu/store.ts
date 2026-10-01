import { create } from "zustand";

interface MenuStore {
    menuExists: boolean;
    showMenu: boolean;
    setMenuExists: (exists: boolean) => void;
    setShowMenu: (state: boolean) => void;
    toggleMenu: () => void;
}

export const useMenuStore = create<MenuStore>((set) => ({
    menuExists: false,
    showMenu: false,
    setMenuExists: (exists) =>
        set(exists ? { menuExists: true } : { menuExists: false, showMenu: false }),
    setShowMenu: (showMenu) => set({ showMenu }),
    toggleMenu: () => set((state) => ({ showMenu: !state.showMenu })),
}));
