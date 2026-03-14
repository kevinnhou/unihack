// import { NativeTabs } from "expo-router/unstable-native-tabs";

// export default function TabLayout() {
//   return (
//     <NativeTabs>
//       <NativeTabs.Trigger name="index">
//         <NativeTabs.Trigger.Label>Home</NativeTabs.Trigger.Label>
//         <NativeTabs.Trigger.Icon md="home" sf="house.fill" />
//       </NativeTabs.Trigger>
//       <NativeTabs.Trigger name="groups">
//         <NativeTabs.Trigger.Icon md="groups" sf="gear" />
//         <NativeTabs.Trigger.Label>Groups</NativeTabs.Trigger.Label>
//       </NativeTabs.Trigger>
//       <NativeTabs.Trigger name="settings">
//         <NativeTabs.Trigger.Icon md="settings" sf="gear" />
//         <NativeTabs.Trigger.Label>Settings</NativeTabs.Trigger.Label>
//       </NativeTabs.Trigger>
//     </NativeTabs>
//   );
// }

import { Tabs } from "expo-router";
import { Activity, BarChart2, Shield, User, Users } from "lucide-react-native";

export default function TabsLayout() {
  return (
    <>
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
          name="friends"
          options={{
            title: "Friends",
            tabBarIcon: ({ color, size }) => (
              <Users color={color} size={size} />
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
