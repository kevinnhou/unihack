import { Tabs } from "expo-router";
import { Activity, BarChart2, Shield, User } from "lucide-react-native";
import { useNetworkQueue } from "@/hooks/useNetworkQueue";

function NetworkQueueFlusher() {
  useNetworkQueue();
  return null;
}

export default function TabsLayout() {
  return (
    <>
      <NetworkQueueFlusher />
      <Tabs
        screenOptions={{
          headerShown: false,
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
            tabBarIcon: ({ color, size }) => (
              <Shield color={color} size={size} />
            ),
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
          name="profile"
          options={{
            title: "Profile",
            tabBarIcon: ({ color, size }) => <User color={color} size={size} />,
          }}
        />
      </Tabs>
    </>
  );
}
