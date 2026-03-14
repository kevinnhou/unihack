import { create } from "zustand";

type LiveState = {
  roomId: string | null;
  roomCode: string | null;
  isHost: boolean;
  targetDistanceMeters: number;
  joinError: string | null;
  setRoom: (
    roomId: string,
    code: string,
    isHost: boolean,
    targetDistanceMeters?: number
  ) => void;
  setTargetDistanceMeters: (meters: number) => void;
  setJoinError: (err: string | null) => void;
  reset: () => void;
};

const initialState = {
  roomId: null as string | null,
  roomCode: null as string | null,
  isHost: false,
  targetDistanceMeters: 5000,
  joinError: null as string | null,
};

export const useLiveStore = create<LiveState>((set) => ({
  ...initialState,

  setRoom: (roomId, roomCode, isHost, targetDistanceMeters) => {
    set({
      roomId,
      roomCode,
      isHost,
      targetDistanceMeters: targetDistanceMeters ?? 5000,
      joinError: null,
    });
  },

  setTargetDistanceMeters: (targetDistanceMeters) => {
    set({ targetDistanceMeters });
  },

  setJoinError: (joinError) => {
    set({ joinError });
  },

  reset: () => {
    set(initialState);
  },
}));
