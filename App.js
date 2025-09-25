import React, { useState, useEffect } from 'react';
import { StyleSheet, ScrollView, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Provider as PaperProvider, Appbar, FAB } from 'react-native-paper';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { TextInputSection } from './src/components/TextInputSection';
import { TranslationResult } from './src/components/TranslationResult';
import { ApiKeyConfig } from './src/components/ApiKeyConfig';
import { translateWithBreakdown } from './src/services/openaiService';

const API_KEY_STORAGE = 'openai_api_key';

export default function App() {
  const [text, setText] = useState('');
  const [result, setResult] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [hasApiKey, setHasApiKey] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  useEffect(() => {
    checkApiKey();
  }, []);

  const checkApiKey = async () => {
    try {
      const apiKey = await AsyncStorage.getItem(API_KEY_STORAGE);
      setHasApiKey(!!apiKey);
      if (!apiKey) {
        setShowSettings(true);
      }
    } catch (error) {
      console.error('Error checking API key:', error);
      setShowSettings(true);
    }
  };

  const handleApiKeySet = (apiKey) => {
    setHasApiKey(!!apiKey);
    setShowSettings(false);
  };

  const handleTranslate = async () => {
    if (!text.trim()) return;

    setIsLoading(true);
    setError('');
    setResult(null);

    try {
      const translationResult = await translateWithBreakdown(text);
      setResult(translationResult);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleTextChange = (newText) => {
    setText(newText);
    if (error) setError('');
  };

  return (
    <SafeAreaProvider>
      <PaperProvider>
        <SafeAreaView style={styles.container}>
          <Appbar.Header>
            <Appbar.Content title="Japanese Translator" />
            <Appbar.Action 
              icon="cog" 
              onPress={() => setShowSettings(!showSettings)} 
            />
          </Appbar.Header>
          
          <ScrollView 
            style={styles.content}
            contentContainerStyle={styles.scrollContent}
          >
            {showSettings || !hasApiKey ? (
              <ApiKeyConfig onApiKeySet={handleApiKeySet} />
            ) : (
              <>
                <TextInputSection
                  text={text}
                  onTextChange={handleTextChange}
                  onTranslate={handleTranslate}
                  isLoading={isLoading}
                  error={error}
                />
                
                <TranslationResult result={result} />
              </>
            )}
          </ScrollView>
          
          <StatusBar style="auto" />
        </SafeAreaView>
      </PaperProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
  },
});
