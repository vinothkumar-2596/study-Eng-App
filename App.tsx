import { NavigationContainer, type Theme } from '@react-navigation/native'
import { createNativeStackNavigator } from '@react-navigation/native-stack'
import { StatusBar } from 'expo-status-bar'
import { useFonts } from 'expo-font'
import * as SplashScreen from 'expo-splash-screen'
import { useEffect, useState } from 'react'
import { ActivityIndicator, StyleSheet, View } from 'react-native'
import { SafeAreaProvider } from 'react-native-safe-area-context'
import { loadSettings } from './src/lib/settings'
import type { RootStackParamList } from './src/navigation'
import { HomeScreen } from './src/screens/HomeScreen'
import { LibraryScreen } from './src/screens/LibraryScreen'
import { ReaderScreen } from './src/screens/ReaderScreen'
import { SettingsScreen } from './src/screens/SettingsScreen'
import { color, fontAssets, fonts } from './src/theme/tokens'

void SplashScreen.preventAutoHideAsync()

const Stack = createNativeStackNavigator<RootStackParamList>()

const navigationTheme: Theme = {
  dark: false,
  colors: {
    primary: color.accent,
    background: color.canvas,
    card: color.surface,
    text: color.ink,
    border: color.hairline,
    notification: color.warn,
  },
  fonts: {
    regular: { fontFamily: fonts.regular, fontWeight: '400' },
    medium: { fontFamily: fonts.medium, fontWeight: '500' },
    bold: { fontFamily: fonts.semibold, fontWeight: '600' },
    heavy: { fontFamily: fonts.bold, fontWeight: '700' },
  },
}

export default function App() {
  const [ready, setReady] = useState(false)
  const [fontsLoaded, fontError] = useFonts(fontAssets)

  useEffect(() => {
    // Settings gate the first API call, so they are read before any screen mounts.
    loadSettings().finally(() => setReady(true))
  }, [])

  useEffect(() => {
    if ((fontsLoaded || fontError) && ready) void SplashScreen.hideAsync()
  }, [fontError, fontsLoaded, ready])

  if (!ready || (!fontsLoaded && !fontError)) {
    return (
      <View style={styles.boot}>
        <ActivityIndicator color={color.accent} />
      </View>
    )
  }

  return (
    <SafeAreaProvider>
      <StatusBar style="dark" />
      <NavigationContainer theme={navigationTheme}>
        <Stack.Navigator screenOptions={{ headerShown: false, contentStyle: styles.screen }}>
          <Stack.Screen name="Home" component={HomeScreen} />
          <Stack.Screen name="Reader" component={ReaderScreen} />
          <Stack.Screen name="Library" component={LibraryScreen} />
          <Stack.Screen name="Settings" component={SettingsScreen} />
        </Stack.Navigator>
      </NavigationContainer>
    </SafeAreaProvider>
  )
}

const styles = StyleSheet.create({
  boot: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: color.canvas },
  screen: { backgroundColor: color.canvas },
})
