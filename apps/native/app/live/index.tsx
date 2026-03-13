/** biome-ignore-all lint/nursery/noLeakedRender: <explanation> */
import { Ionicons } from "@expo/vector-icons";
import { api } from "@unihack/backend/convex/_generated/api";
import type { Id } from "@unihack/backend/convex/_generated/dataModel";
import { useMutation } from "convex/react";
import { Redirect, useRouter } from "expo-router";
import { useRef, useState } from "react";
import { Text, TextInput, TouchableOpacity, View } from "react-native";
import { useAuthStore } from "@/stores/auth-store";
import { useLiveStore } from "@/stores/live-store";

export default function LiveIndexScreen() {
  const router = useRouter();
  const liveStore = useLiveStore();
  const { userId } = useAuthStore();
  const createRoomMutation = useMutation(api.live.createLiveRoom);
  const joinRoomMutation = useMutation(api.live.joinLiveRoom);

  const [codeChars, setCodeChars] = useState(["", "", "", ""]);
  const [joinError, setJoinError] = useState<string | null>(null);
  const inputRefs = [
    useRef<TextInput>(null),
    useRef<TextInput>(null),
    useRef<TextInput>(null),
    useRef<TextInput>(null),
  ];

  if (!userId) {
    return <Redirect href="/auth/sign-in" />;
  }

  const handleCreate = async () => {
    const { roomId, code } = await createRoomMutation({
      userId: userId as Id<"users">,
    });
    liveStore.setRoom(roomId, code, true);
    router.push("/live/lobby" as Parameters<typeof router.push>[0]);
  };

  const handleJoin = async () => {
    const code = codeChars.join("").toUpperCase();
    if (code.length < 4) {
      setJoinError("Enter full 4-character code");
      return;
    }
    const result = await joinRoomMutation({
      userId: userId as Id<"users">,
      code,
    });
    if (result.success) {
      liveStore.setRoom(result.roomId, code, false);
      setJoinError(null);
      router.push("/live/lobby" as Parameters<typeof router.push>[0]);
    } else {
      setJoinError(result.reason);
    }
  };

  const handleCharInput = (text: string, idx: number) => {
    const char = text.toUpperCase().slice(-1);
    const next = [...codeChars];
    next[idx] = char;
    setCodeChars(next);
    setJoinError(null);
    if (char && idx < 3) {
      inputRefs[idx + 1].current?.focus();
    }
  };

  return (
    <View className="flex-1 bg-background px-6 pt-16">
      <View className="mb-8 flex-row items-center gap-3">
        <TouchableOpacity
          accessibilityRole="button"
          onPress={() => router.back()}
        >
          <Ionicons color="#a1a1aa" name="arrow-back" size={24} />
        </TouchableOpacity>
        <Text className="font-bold text-2xl text-foreground">Live Race</Text>
      </View>

      {/* Create room */}
      <View className="mb-6 rounded-2xl border border-default-200 p-5">
        <Text className="mb-1 font-semibold text-foreground text-lg">
          Create a Room
        </Text>
        <Text className="mb-4 text-default-400 text-sm">
          Share the code with friends to race together.
        </Text>
        <TouchableOpacity
          accessibilityRole="button"
          className="items-center rounded-xl bg-primary py-4"
          onPress={handleCreate}
        >
          <Text className="font-bold text-base text-white">Start New Race</Text>
        </TouchableOpacity>
      </View>

      {/* Join room */}
      <View className="rounded-2xl border border-default-200 p-5">
        <Text className="mb-1 font-semibold text-foreground text-lg">
          Join a Room
        </Text>
        <Text className="mb-4 text-default-400 text-sm">
          Enter the 4-letter code to join.
        </Text>
        <View className="mb-4 flex-row justify-center gap-3">
          {codeChars.map((char, idx) => (
            <TextInput
              autoCapitalize="characters"
              className="h-14 w-14 rounded-xl border border-default-300 bg-default-50 text-center font-bold text-2xl text-foreground"
              // biome-ignore lint/suspicious/noArrayIndexKey: fixed 4-slot array
              key={idx}
              maxLength={1}
              onChangeText={(t) => handleCharInput(t, idx)}
              ref={inputRefs[idx]}
              value={char}
            />
          ))}
        </View>
        {joinError && (
          <Text className="mb-3 text-center text-danger text-sm">
            {joinError}
          </Text>
        )}
        <TouchableOpacity
          accessibilityRole="button"
          className="items-center rounded-xl border border-primary py-4"
          onPress={handleJoin}
        >
          <Text className="font-bold text-base text-primary">Join Room</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}
