import Head from 'expo-router/head';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useFonts } from 'expo-font';
import { fontSources } from '../src/fonts';
export default function RootLayout() {
  const [loaded, error] = useFonts(fontSources);
  if (!loaded && !error) return null;
  return <><Head><title>Preview Rail | Nativelet</title><meta name="description" content="A native Preview Rail demo with exact reusable source." /></Head><StatusBar style="dark" /><Stack screenOptions={{ headerShown: false }} /></>;
}
