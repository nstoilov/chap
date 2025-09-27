import React, { useState } from 'react';
import { StyleSheet, ScrollView } from 'react-native';
import { Appbar } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';

import { TextInputSection } from '../components/TextInputSection';
import { TranslationResult } from '../components/TranslationResult';
import { translateWithBreakdown } from '../services/openaiService';

export const HomeScreen = () => {
  const [text, setText] = useState('');
  const [originalText, setOriginalText] = useState('');
  const [result, setResult] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleTranslate = async () => {
    if (!text.trim()) return;

    setIsLoading(true);
    setError('');
    setResult(null);
    setOriginalText(text);

    try {
      const translationResult = await translateWithBreakdown(text);
      setResult(translationResult);
      setText('');
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleWordClick = async (word) => {
    setText(word);
    setError('');
    setResult(null);
    setIsLoading(true);
    setOriginalText(word);

    try {
      const translationResult = await translateWithBreakdown(word);
      setResult(translationResult);
      setText('');
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleNewTranslation = () => {
    setText('');
    setOriginalText('');
    setResult(null);
    setError('');
  };

  const handleTextChange = (newText) => {
    setText(newText);
    if (error) setError('');
  };

  return (
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
          originalText={originalText}
          onWordClick={handleWordClick}
          onNewTranslation={handleNewTranslation}
          isLoading={isLoading}
        />
      </ScrollView>
    </SafeAreaView>
  );
};

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
