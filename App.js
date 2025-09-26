import React, { useState } from 'react';
import { StyleSheet, ScrollView } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Provider as PaperProvider, Appbar } from 'react-native-paper';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';

import { TextInputSection } from './src/components/TextInputSection';
import { TranslationResult } from './src/components/TranslationResult';
import { translateWithBreakdown } from './src/services/openaiService';

export default function App() {
  const [text, setText] = useState('');
  const [result, setResult] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleTranslate = async () => {
    if (!text.trim()) return;

    setIsLoading(true);
    setError('');
    setResult(null);

    try {
      const translationResult = await translateWithBreakdown(text);
      setResult(translationResult);
      // Clear the input box after successful translation
      setText('');
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleWordClick = async (word) => {
    // Set the clicked word in the input
    setText(word);
    setError('');
    setResult(null);
    setIsLoading(true);

    try {
      // Automatically translate the clicked word
      const translationResult = await translateWithBreakdown(word);
      setResult(translationResult);
      // Clear the input after translation
      setText('');
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
          </Appbar.Header>
          
          <ScrollView 
            style={styles.content}
            contentContainerStyle={styles.scrollContent}
          >
            <TextInputSection
              text={text}
              onTextChange={handleTextChange}
              onTranslate={handleTranslate}
              isLoading={isLoading}
              error={error}
            />
            
            <TranslationResult 
              result={result} 
              onWordClick={handleWordClick}
              isLoading={isLoading}
            />
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
