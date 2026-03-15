import { api } from "@unihack/backend/convex/_generated/api";
import { useMutation } from "convex/react";
import { useRouter } from "expo-router";
import { ChevronRight } from "lucide-react-native";
import { useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
} from "react-native";
import Animated, { FadeInUp } from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";
import { AgonLogo } from "@/components/agon-logo";
import { useAuthStore } from "@/stores/auth-store";

export default function SignUpScreen() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [focusedField, setFocusedField] = useState<string | null>(null);
  const signIn = useAuthStore((state) => state.signIn);
  const signUpMutation = useMutation(api.authpwd.signUp);

  const handleSignUp = async () => {
    if (!(name && email && password)) {
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const result = await signUpMutation({ name, email, password });
      if (!result.success) {
        setError(result.reason);
        return;
      }
      await signIn(result.userId, result.name, email);
      router.replace("/(tabs)");
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#000" }}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={{
            flexGrow: 1,
            backgroundColor: "#000",
            paddingHorizontal: 24,
            justifyContent: "center",
            paddingTop: 80,
            paddingBottom: 40,
          }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Hero section */}
          <Animated.View
            entering={FadeInUp.duration(600)}
            style={{ alignItems: "center", marginBottom: 32 }}
          >
            <AgonLogo animateOnMount size="lg" />
            <Text
              style={{
                color: "#6b7280",
                fontSize: 14,
                marginTop: 16,
              }}
            >
              Start your journey
            </Text>
          </Animated.View>

          {/* Name input */}
          <Animated.View
            entering={FadeInUp.delay(100).duration(500)}
            style={{ marginBottom: 16 }}
          >
            <Text
              style={{
                color: "#9ca3af",
                fontSize: 12,
                fontWeight: "600",
                letterSpacing: 1,
                textTransform: "uppercase",
                marginBottom: 6,
              }}
            >
              Display Name
            </Text>
            <TextInput
              onBlur={() => setFocusedField(null)}
              onChangeText={setName}
              onFocus={() => setFocusedField("name")}
              placeholder="Your name"
              placeholderTextColor="#4b5563"
              style={{
                backgroundColor: "#111",
                borderColor: focusedField === "name" ? "#f97316" : "#1f2937",
                borderRadius: 16,
                borderWidth: 1,
                color: "#fff",
                fontSize: 16,
                paddingHorizontal: 16,
                paddingVertical: 16,
              }}
              value={name}
            />
          </Animated.View>

          {/* Email input */}
          <Animated.View
            entering={FadeInUp.delay(200).duration(500)}
            style={{ marginBottom: 16 }}
          >
            <Text
              style={{
                color: "#9ca3af",
                fontSize: 12,
                fontWeight: "600",
                letterSpacing: 1,
                textTransform: "uppercase",
                marginBottom: 6,
              }}
            >
              Email
            </Text>
            <TextInput
              autoCapitalize="none"
              keyboardType="email-address"
              onBlur={() => setFocusedField(null)}
              onChangeText={setEmail}
              onFocus={() => setFocusedField("email")}
              placeholder="you@example.com"
              placeholderTextColor="#4b5563"
              style={{
                backgroundColor: "#111",
                borderColor: focusedField === "email" ? "#f97316" : "#1f2937",
                borderRadius: 16,
                borderWidth: 1,
                color: "#fff",
                fontSize: 16,
                paddingHorizontal: 16,
                paddingVertical: 16,
              }}
              value={email}
            />
          </Animated.View>

          {/* Password input */}
          <Animated.View
            entering={FadeInUp.delay(300).duration(500)}
            style={{ marginBottom: 16 }}
          >
            <Text
              style={{
                color: "#9ca3af",
                fontSize: 12,
                fontWeight: "600",
                letterSpacing: 1,
                textTransform: "uppercase",
                marginBottom: 6,
              }}
            >
              Password
            </Text>
            <TextInput
              onBlur={() => setFocusedField(null)}
              onChangeText={setPassword}
              onFocus={() => setFocusedField("password")}
              placeholder="••••••••"
              placeholderTextColor="#4b5563"
              secureTextEntry
              style={{
                backgroundColor: "#111",
                borderColor:
                  focusedField === "password" ? "#f97316" : "#1f2937",
                borderRadius: 16,
                borderWidth: 1,
                color: "#fff",
                fontSize: 16,
                paddingHorizontal: 16,
                paddingVertical: 16,
              }}
              value={password}
            />
          </Animated.View>

          {error ? (
            <Text
              style={{
                color: "#f87171",
                fontSize: 13,
                marginBottom: 12,
              }}
            >
              {error}
            </Text>
          ) : null}

          {/* Create Account button */}
          <Animated.View entering={FadeInUp.delay(400).duration(500)}>
            <TouchableOpacity
              disabled={loading}
              onPress={handleSignUp}
              style={{
                alignItems: "center",
                backgroundColor: "#f97316",
                borderRadius: 20,
                flexDirection: "row",
                justifyContent: "center",
                marginBottom: 24,
                marginTop: 8,
                paddingVertical: 18,
              }}
            >
              {loading ? (
                <ActivityIndicator color="white" />
              ) : (
                <>
                  <Text
                    style={{
                      color: "#fff",
                      fontSize: 16,
                      fontWeight: "700",
                      marginRight: 8,
                    }}
                  >
                    Create Account
                  </Text>
                  <ChevronRight color="#fff" size={20} />
                </>
              )}
            </TouchableOpacity>
          </Animated.View>

          {/* Sign in link */}
          <Animated.View entering={FadeInUp.delay(500).duration(500)}>
            <Pressable onPress={() => router.push("/(auth)/signin")}>
              <Text
                style={{
                  color: "#6b7280",
                  fontSize: 14,
                  textAlign: "center",
                }}
              >
                Have an account?{" "}
                <Text style={{ color: "#f97316", fontWeight: "600" }}>
                  Sign in
                </Text>
              </Text>
            </Pressable>
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
