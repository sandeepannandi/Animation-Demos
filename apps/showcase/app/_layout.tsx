import Head from 'expo-router/head';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
export default function RootLayout() {
  return <><Head><title>Preview Rail | Nativelet</title><meta name="description" content="A native Preview Rail demo with exact reusable source." /></Head><StatusBar style="dark" /><Stack screenOptions={{ headerShown: false }} /></>;
}
