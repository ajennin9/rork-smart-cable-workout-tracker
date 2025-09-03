import { Tabs } from "expo-router";
import { Home, History, User } from "lucide-react-native";
import React, { useEffect } from "react";
import { TouchableOpacity } from "react-native";
import Colors from "@/constants/colors";
import { useAuth } from "@/hooks/auth-context";
import { router } from "expo-router";

export default function TabLayout() {
  const { isAuthenticated, isLoading } = useAuth();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.replace('/(auth)/login');
    }
  }, [isAuthenticated, isLoading]);

  if (!isAuthenticated) {
    return null;
  }

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: Colors.tabIconSelected,
        tabBarInactiveTintColor: Colors.tabIconDefault,
        tabBarStyle: {
          backgroundColor: Colors.tabBarBackground,
          borderTopColor: Colors.border,
          paddingVertical: 8,
          height: 70,
        },
        headerShown: true,
        headerStyle: {
          backgroundColor: Colors.surface,
        },
        headerTitleStyle: {
          color: Colors.text,
          fontSize: 18,
          fontWeight: '600',
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "ironIQ",
          tabBarIcon: ({ color }) => <Home size={24} color={color} />,
          headerRight: () => (
            <TouchableOpacity
              onPress={() => router.push('/profile')}
              style={{ marginRight: 16 }}
            >
              <User size={24} color={Colors.text} />
            </TouchableOpacity>
          ),
        }}
      />
      <Tabs.Screen
        name="workouts"
        options={{
          title: "Workout History",
          tabBarIcon: ({ color }) => <History size={24} color={color} />,
          headerRight: () => (
            <TouchableOpacity
              onPress={() => router.push('/profile')}
              style={{ marginRight: 16 }}
            >
              <User size={24} color={Colors.text} />
            </TouchableOpacity>
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          href: null,
        }}
      />
    </Tabs>
  );
}