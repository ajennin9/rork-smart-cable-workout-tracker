import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import React, { useEffect } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { AuthProvider } from "@/hooks/auth-context";
import { WorkoutProvider } from "@/hooks/workout-context";
import { NotificationProvider, useNotification } from "@/hooks/notification-context";
import { NFCProvider } from "@/hooks/nfc-context";

SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient();

function RootLayoutNav() {
  return (
    <Stack screenOptions={{ headerBackTitle: "Back" }}>
      <Stack.Screen name="(auth)" options={{ headerShown: false }} />
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
    </Stack>
  );
}

function AppWithNotifications() {
  const { NotificationOverlay } = useNotification();
  
  return (
    <>
      <RootLayoutNav />
      <NotificationOverlay />
    </>
  );
}

export default function RootLayout() {
  useEffect(() => {
    SplashScreen.hideAsync();
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <AuthProvider>
          <WorkoutProvider>
            <NFCProvider>
              <NotificationProvider>
                <AppWithNotifications />
              </NotificationProvider>
            </NFCProvider>
          </WorkoutProvider>
        </AuthProvider>
      </GestureHandlerRootView>
    </QueryClientProvider>
  );
}