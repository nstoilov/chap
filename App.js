import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { Provider as PaperProvider } from 'react-native-paper';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { ResponsiveNavigation } from './src/navigation/ResponsiveNavigation';

export default function App() {
  return (
    <SafeAreaProvider>
      <PaperProvider>
        <ResponsiveNavigation />
        <StatusBar style="auto" />
      </PaperProvider>
    </SafeAreaProvider>
  );
}
