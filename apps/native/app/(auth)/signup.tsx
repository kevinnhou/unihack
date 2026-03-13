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
import { authClient } from "@/lib/auth-client";

export default function SignUpScreen() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSignUp = async () => {
    if (!(name && email && password)) {
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const result = await authClient.signUp.email({
        email,
        password,
        name,
      });
      if (result.error) {
        setError(result.error.message ?? "Sign up failed");
        return;
      }
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
        <Text className="mb-2 font-black text-4xl text-white">
          Create account
        </Text>
        <Text className="mb-8 text-gray-400">Join pinfire and compete</Text>

        <TextInput
          className="mb-3 rounded-2xl bg-neutral-900 px-4 py-4 text-base text-white"
          onChangeText={setName}
          placeholder="Display name"
          placeholderTextColor="#4b5563"
          value={name}
        />
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
          onPress={handleSignUp}
        >
          {loading ? (
            <ActivityIndicator color="white" />
          ) : (
            <Text className="font-bold text-base text-white">
              Create Account
            </Text>
          )}
        </TouchableOpacity>

        <Pressable onPress={() => router.push("/(auth)/signin")}>
          <Text className="text-center text-gray-400">
            Have an account?{" "}
            <Text className="font-semibold text-orange-400">Sign in</Text>
          </Text>
        </Pressable>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
