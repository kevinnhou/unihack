import { Tabs, useRouter } from "expo-router";
import { Activity, BarChart2, Shield, User, Users } from "lucide-react-native";
import { useEffect } from "react";
import { useAuthStore } from "@/stores/auth-store";

export default function TabsLayout() {
  const { userId } = useAuthStore();
  const router = useRouter();

  useEffect(() => {
    if (!userId) {
      router.replace("/(auth)/signin");
    }
  }, [userId, router]);

  return (
    <Tabs
      initialRouteName="index"
      screenOptions={{
        headerShown: false,
        sceneStyle: {
          backgroundColor: "#000000",
        },
        tabBarStyle: {
          backgroundColor: "#0a0a0a",
          borderTopColor: "#1f1f1f",
        },
        tabBarActiveTintColor: "#FF4500",
        tabBarInactiveTintColor: "#6b7280",
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Home",
          tabBarIcon: ({ color, size }) => (
            <Activity color={color} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="squads"
        options={{
          title: "Squads",
          tabBarIcon: ({ color, size }) => <Shield color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="leaderboards"
        options={{
          title: "Rankings",
          tabBarIcon: ({ color, size }) => (
            <BarChart2 color={color} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="friends"
        options={{
          title: "Friends",
          tabBarIcon: ({ color, size }) => <Users color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: "Profile",
          tabBarIcon: ({ color, size }) => <User color={color} size={size} />,
        }}
      />
    </Tabs>
  );
}
