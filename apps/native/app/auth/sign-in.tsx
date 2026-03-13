/** biome-ignore-all lint/nursery/noLeakedRender: <explanation> */
import { api } from "@unihack/backend/convex/_generated/api";
import { useMutation } from "convex/react";
import { useRouter } from "expo-router";
import { useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useAuthStore } from "@/stores/auth-store";

export default function SignInScreen() {
  const router = useRouter();
  const { signIn } = useAuthStore();
  const signInMutation = useMutation(api.authpwd.signIn);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSignIn = async () => {
    if (!(email.trim() && password)) {
      setError("Please fill in all fields");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const result = await signInMutation({
        email: email.trim(),
        password,
      });
      if (result.success) {
        await signIn(result.userId, result.name, result.email);
        router.replace("/");
      } else {
        setError(result.reason);
      }
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      className="flex-1 bg-background"
    >
      <View className="flex-1 justify-center px-8">
        <Text className="mb-2 font-bold text-4xl text-foreground">
          Welcome back
        </Text>
        <Text className="mb-10 text-default-400">Sign in to Pinfire</Text>

        <TextInput
          autoCapitalize="none"
          className="mb-4 rounded-2xl border border-default-200 bg-default-50 px-4 py-4 text-base text-foreground"
          keyboardType="email-address"
          onChangeText={(t) => {
            setEmail(t);
            setError(null);
          }}
          placeholder="Email"
          placeholderTextColor="#a1a1aa"
          value={email}
        />
        <TextInput
          className="mb-4 rounded-2xl border border-default-200 bg-default-50 px-4 py-4 text-base text-foreground"
          onChangeText={(t) => {
            setPassword(t);
            setError(null);
          }}
          placeholder="Password"
          placeholderTextColor="#a1a1aa"
          secureTextEntry
          value={password}
        />

        {error && (
          <Text className="mb-4 text-center text-danger text-sm">{error}</Text>
        )}

        <TouchableOpacity
          accessibilityRole="button"
          className={`mb-4 items-center rounded-2xl py-4 ${loading ? "bg-primary/60" : "bg-primary"}`}
          disabled={loading}
          onPress={handleSignIn}
        >
          <Text className="font-bold text-base text-white">
            {loading ? "Signing in..." : "Sign In"}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          accessibilityRole="button"
          className="items-center py-2"
          onPress={() => router.replace("/auth/sign-up")}
        >
          <Text className="text-default-400">
            Don&apos;t have an account?{" "}
            <Text className="font-semibold text-primary">Sign up</Text>
          </Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}
