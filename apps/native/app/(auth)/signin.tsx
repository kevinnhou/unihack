import { api } from "@unihack/backend/convex/_generated/api";
import { useMutation } from "convex/react";
import { useRouter } from "expo-router";
import { useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  Text,
  TextInput,
  TouchableOpacity,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuthStore } from "@/stores/auth-store";

export default function SignInScreen() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const signIn = useAuthStore((state) => state.signIn);
  const signInMutation = useMutation(api.authpwd.signIn);

  const handleSignIn = async () => {
    if (!(email && password)) {
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const result = await signInMutation({ email, password });
      if (!result.success) {
        setError(result.reason);
        return;
      }
      await signIn(result.userId, result.name, result.email);
      router.replace("/(tabs)");
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-black">
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        className="flex-1 justify-center px-6"
      >
        <Text className="mb-2 font-black text-4xl text-white">pinfire 🔥</Text>
        <Text className="mb-8 text-gray-400">Sign in to compete</Text>

        <TextInput
          autoCapitalize="none"
          className="mb-3 rounded-2xl bg-neutral-900 px-4 py-4 text-base text-white"
          keyboardType="email-address"
          onChangeText={setEmail}
          placeholder="Email"
          placeholderTextColor="#4b5563"
          value={email}
        />
        <TextInput
          className="mb-3 rounded-2xl bg-neutral-900 px-4 py-4 text-base text-white"
          onChangeText={setPassword}
          placeholder="Password"
          placeholderTextColor="#4b5563"
          secureTextEntry
          value={password}
        />

        {error ? (
          <Text className="mb-3 text-red-400 text-sm">{error}</Text>
        ) : null}

        <TouchableOpacity
          className="mb-4 items-center rounded-2xl bg-orange-500 py-4"
          disabled={loading}
          onPress={handleSignIn}
        >
          {loading ? (
            <ActivityIndicator color="white" />
          ) : (
            <Text className="font-bold text-base text-white">Sign In</Text>
          )}
        </TouchableOpacity>

        <Pressable onPress={() => router.push("/(auth)/signup")}>
          <Text className="text-center text-gray-400">
            No account?{" "}
            <Text className="font-semibold text-orange-400">Sign up</Text>
          </Text>
        </Pressable>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
