import { create } from "zustand";

export const useColorStore = create((set) => ({
  color: "black",
  toggleColor: () =>
    set((state) => ({
      color: state.color === "black" ? "orange" : "black",
    })),
}));
