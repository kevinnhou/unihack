import { useRouter } from "expo-router";
import { useMemo, useState } from "react";
import {
  FlatList,
  Image,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

const MOCK_ITEMS = [
  {
    id: "1",
    name: "Alex Parker",
    avatar: "https://picsum.photos/seed/alex/200",
    isGroup: false,
  },
  {
    id: "2",
    name: "Design Team",
    avatar: "https://picsum.photos/seed/group1/200",
    isGroup: true,
  },
  {
    id: "3",
    name: "Jordan Lee",
    avatar: "https://picsum.photos/seed/jordan/200",
    isGroup: false,
  },
  {
    id: "4",
    name: "Family",
    avatar: "https://picsum.photos/seed/family/200",
    isGroup: true,
  },
];

export default function GroupsTab() {
  const router = useRouter();
  const [query, setQuery] = useState("");

  const data = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) {
      return MOCK_ITEMS;
    }
    return MOCK_ITEMS.filter((it) => it.name.toLowerCase().includes(q));
  }, [query]);

  function openProfile(id: string) {
    // prefer explicit pathname with params (typed)
    try {
      router.push({ pathname: "/(tabs)/user/[id]", params: { id } });
      return;
    } catch {
      // fallback to app-root route
    }

    try {
      router.push({ pathname: "/user/[id]", params: { id } });
      return;
    } catch (err) {
      console.warn("Navigation to user profile failed", err);
    }
  }

  function renderItem({ item }: { item: (typeof MOCK_ITEMS)[number] }) {
    return (
      <Pressable onPress={() => openProfile(item.id)} style={styles.row}>
        <Image source={{ uri: item.avatar }} style={styles.avatar} />
        <View style={styles.content}>
          <View style={styles.titleRow}>
            <Text numberOfLines={1} style={styles.name}>
              {item.name}
            </Text>
            {item.isGroup ? <Text style={styles.groupLabel}>Group</Text> : null}
          </View>
        </View>
      </Pressable>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Messages</Text>
      </View>

      <View style={styles.searchWrap}>
        <TextInput
          clearButtonMode="while-editing"
          onChangeText={setQuery}
          placeholder="Search people or groups"
          style={styles.searchInput}
          value={query}
        />
      </View>

      <FlatList
        contentContainerStyle={{ paddingBottom: 24 }}
        data={data}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        keyExtractor={(i) => i.id}
        renderItem={renderItem}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  header: {
    height: 96,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingTop: 18,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#eee",
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "600",
  },
  searchWrap: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: "#fff",
  },
  searchInput: {
    height: 40,
    borderRadius: 10,
    backgroundColor: "#f2f2f4",
    paddingHorizontal: 12,
  },
  row: {
    flexDirection: "row",
    paddingHorizontal: 16,
    paddingVertical: 12,
    alignItems: "center",
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    marginRight: 12,
    backgroundColor: "#ddd",
  },
  content: {
    flex: 1,
    borderBottomWidth: 0,
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  name: {
    fontSize: 16,
    fontWeight: "600",
    color: "#111",
  },
  groupLabel: {
    fontSize: 12,
    color: "#666",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    backgroundColor: "#f2f2f4",
  },
  separator: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: "#eee",
    marginLeft: 84,
  },
});
