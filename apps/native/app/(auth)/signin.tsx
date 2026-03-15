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

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function validateSignIn(
  email: string,
  password: string
): { email: string | null; password: string | null } {
  const emailErr = email.trim()
    ? EMAIL_REGEX.test(email.trim())
      ? null
      : "Enter a valid email address"
    : "Email is required";
  const passwordErr = password ? null : "Password is required";
  return { email: emailErr, password: passwordErr };
}

export default function SignInScreen() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<{
    email: string | null;
    password: string | null;
  }>({ email: null, password: null });
  const [serverError, setServerError] = useState<string | null>(null);
  const [focusedField, setFocusedField] = useState<string | null>(null);
  const signIn = useAuthStore((state) => state.signIn);
  const signInMutation = useMutation(api.authpwd.signIn);

  const handleSignIn = async () => {
    const errs = validateSignIn(email, password);
    if (errs.email || errs.password) {
      setFieldErrors(errs);
      return;
    }

    setLoading(true);
    setServerError(null);
    try {
      const result = await signInMutation({ email, password });
      if (!result.success) {
        setServerError(result.reason);
        return;
      }
      await signIn(result.userId, result.name, result.email);
      router.replace("/(tabs)");
    } catch (e: unknown) {
      setServerError(e instanceof Error ? e.message : "Something went wrong");
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
            style={{ alignItems: "center", marginBottom: 48 }}
          >
            <AgonLogo animateOnMount showTagline size="xl" />
          </Animated.View>

          {/* Email input */}
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
              Email
            </Text>
            <TextInput
              autoCapitalize="none"
              keyboardType="email-address"
              onBlur={() => setFocusedField(null)}
              onChangeText={(t) => {
                setEmail(t);
                setFieldErrors((prev) => ({ ...prev, email: null }));
              }}
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
            {fieldErrors.email ? (
              <Text style={{ color: "#f87171", fontSize: 12, marginTop: 4 }}>
                {fieldErrors.email}
              </Text>
            ) : null}
          </Animated.View>

          {/* Password input */}
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
              Password
            </Text>
            <TextInput
              onBlur={() => setFocusedField(null)}
              onChangeText={(t) => {
                setPassword(t);
                setFieldErrors((prev) => ({ ...prev, password: null }));
              }}
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
            {fieldErrors.password ? (
              <Text style={{ color: "#f87171", fontSize: 12, marginTop: 4 }}>
                {fieldErrors.password}
              </Text>
            ) : null}
          </Animated.View>

          {serverError ? (
            <Text
              style={{
                color: "#f87171",
                fontSize: 13,
                marginBottom: 12,
              }}
            >
              {serverError}
            </Text>
          ) : null}

          {/* Sign In button */}
          <Animated.View entering={FadeInUp.delay(300).duration(500)}>
            <TouchableOpacity
              disabled={loading}
              onPress={handleSignIn}
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
                    Sign In
                  </Text>
                  <ChevronRight color="#fff" size={20} />
                </>
              )}
            </TouchableOpacity>
          </Animated.View>

          {/* Sign up link */}
          <Animated.View entering={FadeInUp.delay(400).duration(500)}>
            <Pressable onPress={() => router.push("/(auth)/signup")}>
              <Text
                style={{
                  color: "#6b7280",
                  fontSize: 14,
                  textAlign: "center",
                }}
              >
                No account?{" "}
                <Text style={{ color: "#f97316", fontWeight: "600" }}>
                  Sign up
                </Text>
              </Text>
            </Pressable>
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
