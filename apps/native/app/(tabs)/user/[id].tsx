import { useLocalSearchParams, useRouter } from "expo-router";
import { Image, Pressable, StyleSheet, Text, View } from "react-native";

export default function UserProfile() {
  const { id } = useLocalSearchParams();
  const router = useRouter();

  // Mock user data — replace with real fetch.
  const user = {
    id,
    name:
      id === "2"
        ? "Design Team"
        : id === "4"
          ? "Family"
          : id === "3"
            ? "Jordan Lee"
            : "Alex Parker",
    avatar: `https://picsum.photos/seed/${id}/400`,
    bio: "This is a sample profile. Replace with real user data fetched from your backend.",
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <Text style={styles.backText}>Back</Text>
        </Pressable>
        <Text style={styles.headerTitle}>Profile</Text>
      </View>

      <View style={styles.body}>
        <Image source={{ uri: user.avatar }} style={styles.avatar} />
        <Text style={styles.name}>{user.name}</Text>
        <Text style={styles.bio}>{user.bio}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff" },
  header: {
    height: 92,
    flexDirection: "row",
    alignItems: "flex-end",
    paddingBottom: 12,
    paddingHorizontal: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#eee",
  },
  backButton: { padding: 8 },
  backText: { color: "#007aff", fontSize: 16 },
  headerTitle: {
    flex: 1,
    textAlign: "center",
    fontSize: 18,
    fontWeight: "600",
    marginRight: 40,
  },
  body: { alignItems: "center", paddingTop: 28, paddingHorizontal: 20 },
  avatar: {
    width: 120,
    height: 120,
    borderRadius: 60,
    marginBottom: 16,
    backgroundColor: "#ddd",
  },
  name: { fontSize: 20, fontWeight: "700", marginBottom: 8 },
  bio: { color: "#666", fontSize: 14, textAlign: "center" },
});
