import { create } from "zustand";

type LiveState = {
  roomId: string | null;
  roomCode: string | null;
  isHost: boolean;
  joinError: string | null;
  setRoom: (roomId: string, code: string, isHost: boolean) => void;
  setJoinError: (err: string | null) => void;
  reset: () => void;
};

const initialState = {
  roomId: null as string | null,
  roomCode: null as string | null,
  isHost: false,
  joinError: null as string | null,
};

export const useLiveStore = create<LiveState>((set) => ({
  ...initialState,

  setRoom: (roomId, roomCode, isHost) => {
    set({ roomId, roomCode, isHost, joinError: null });
  },

  setJoinError: (joinError) => {
    set({ joinError });
  },

  reset: () => {
    set(initialState);
  },
}));
