import { create } from "zustand";

type LiveState = {
  roomId: string | null;
  roomCode: string | null;
  isHost: boolean;
  targetDistanceMeters: number;
  joinError: string | null;
  requestedFriendIds: string[];
  setRoom: (
    roomId: string,
    code: string,
    isHost: boolean,
    targetDistanceMeters?: number
  ) => void;
  markFriendRequested: (friendId: string) => void;
  setRequestedFriendIds: (
    friendIdsOrUpdater: string[] | ((friendIds: string[]) => string[])
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
  requestedFriendIds: [] as string[],
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
      requestedFriendIds: [],
    });
  },

  markFriendRequested: (friendId) => {
    set((state) => ({
      requestedFriendIds: state.requestedFriendIds.includes(friendId)
        ? state.requestedFriendIds
        : [...state.requestedFriendIds, friendId],
    }));
  },

  setRequestedFriendIds: (requestedFriendIdsOrUpdater) => {
    if (typeof requestedFriendIdsOrUpdater === "function") {
      set((state) => ({
        requestedFriendIds: requestedFriendIdsOrUpdater(state.requestedFriendIds),
      }));
      return;
    }
    set({ requestedFriendIds: requestedFriendIdsOrUpdater });
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
