import React, { useState, useRef } from 'react';
import { StyleSheet, ScrollView } from 'react-native';
import { Appbar } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';

import { TextInputSection } from '../components/TextInputSection';
import { TranslationResult } from '../components/TranslationResult';
import { QuickInputBar } from '../components/QuickInputBar';
import { ModelPicker } from '../components/ModelPicker';
import { translateWithBreakdown } from '../services/openaiService';
import { DEFAULT_MODEL } from '../config/models';
import { consumeRequest, DAILY_LIMIT } from '../services/rateLimiter';

// ~2-3 Japanese sentences (Japanese is dense, ~50 chars/sentence)
const MAX_INPUT_CHARS = 150;

export const HomeScreen = () => {
  const [text, setText] = useState('');
  const [originalText, setOriginalText] = useState('');
  const [result, setResult] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [streamingText, setStreamingText] = useState('');
  const [model, setModel] = useState(DEFAULT_MODEL);

  const scrollViewRef = useRef(null);
  const inputRef = useRef(null);

  const focusTopInput = () => {
    scrollViewRef.current?.scrollTo({ y: 0, animated: true });
    // Small delay to let scroll finish before focusing
    setTimeout(() => inputRef.current?.focus(), 300);
  };

  const handleTranslate = async () => {
    if (!text.trim()) return;

    if (text.trim().length > MAX_INPUT_CHARS) {
      setError(`Text is too long. Please keep it under ${MAX_INPUT_CHARS} characters (2–3 sentences).`);
      return;
    }

    const allowed = await consumeRequest();
    if (!allowed) {
      setError(`Daily limit of ${DAILY_LIMIT} translations reached. Come back tomorrow!`);
      return;
    }

    setIsLoading(true);
    setError('');
    setResult(null);
    setStreamingText('');
    setOriginalText(text);

    try {
      const translationResult = await translateWithBreakdown(text, (chunk) => {
        setStreamingText(prev => prev + chunk);
      }, model);
      setResult(translationResult);
      setStreamingText('');
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
    setStreamingText('');
    setIsLoading(true);
    setOriginalText(word);

    try {
      const translationResult = await translateWithBreakdown(word, (chunk) => {
        setStreamingText(prev => prev + chunk);
      }, model);
      setResult(translationResult);
      setStreamingText('');
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
        <ModelPicker selectedModel={model} onModelChange={setModel} />
      </Appbar.Header>
      
      <ScrollView 
        ref={scrollViewRef}
        style={styles.content}
        contentContainerStyle={styles.scrollContent}
      >
        <TextInputSection
          text={text}
          onTextChange={handleTextChange}
          onTranslate={handleTranslate}
          isLoading={isLoading}
          error={error}
          inputRef={inputRef}
          maxChars={MAX_INPUT_CHARS}
        />
        
        <TranslationResult 
          result={result} 
          originalText={originalText}
          onWordClick={handleWordClick}
          onNewTranslation={handleNewTranslation}
          isLoading={isLoading}
          streamingText={streamingText}
        />

        {result && !isLoading && (
          <QuickInputBar onPress={focusTopInput} />
        )}
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
