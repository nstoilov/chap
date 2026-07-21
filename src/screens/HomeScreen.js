import React, { useState, useRef } from 'react';
import { StyleSheet, ScrollView, View, Text, TouchableOpacity } from 'react-native';
import { Button } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Clipboard from 'expo-clipboard';

import { TextInputSection } from '../components/TextInputSection';
import { TranslationResult } from '../components/TranslationResult';
import { QuickInputBar } from '../components/QuickInputBar';
import { PasteButton } from '../components/PasteButton';
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
  const [direction, setDirection] = useState('jp-en'); // 'jp-en' | 'en-jp'
  const [formality, setFormality] = useState('polite'); // 'polite' | 'casual' (EN→JP only)

  const scrollViewRef = useRef(null);
  const inputRef = useRef(null);


  const translateText = async (textToTranslate) => {
    if (!textToTranslate.trim()) return;

    if (textToTranslate.trim().length > MAX_INPUT_CHARS) {
      setError(`Text is too long. Please keep it under ${MAX_INPUT_CHARS} characters (2–3 sentences).`);
      return;
    }

    // Detect Japanese characters in input when direction is EN→JP
    const hasJapanese = /[\u3000-\u9fff\uff00-\uffef]/.test(textToTranslate);
    if (direction === 'en-jp' && hasJapanese) {
      setError('Japanese text detected. Switch to JP → EN mode to translate Japanese.');
      return;
    }

    const allowed = await consumeRequest(model);
    if (!allowed) {
      setError(`Daily limit of ${DAILY_LIMIT} paid translations reached. Come back tomorrow!`);
      return;
    }

    setIsLoading(true);
    setError('');
    setResult(null);
    setStreamingText('');
    setOriginalText(textToTranslate);

    try {
      const translationResult = await translateWithBreakdown(textToTranslate, (chunk) => {
        setStreamingText(prev => prev + chunk);
      }, model, direction, direction === 'en-jp' ? formality : undefined);
      setResult(translationResult);
      setStreamingText('');
      setText('');
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleTranslate = () => translateText(text);

  const handlePaste = async () => {
    const clipboardText = await Clipboard.getStringAsync();
    if (clipboardText && clipboardText.trim()) {
      setText(clipboardText);
      translateText(clipboardText);
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
      }, model, 'jp-en', undefined);
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
      <View style={styles.header}>
        <Text style={styles.headerTitle}>🇯🇵 Japanese Translator 🇬🇧</Text>
      </View>

      <View style={styles.toolbar}>
        <Button
          onPress={() => {
            setDirection(d => d === 'jp-en' ? 'en-jp' : 'jp-en');
            setText('');
            setResult(null);
            setStreamingText('');
            setError('');
          }}
          compact
          mode="outlined"
          textColor="#555"
        >
          {direction === 'jp-en' ? 'JP → EN' : 'EN → JP'}
        </Button>
        <ModelPicker selectedModel={model} onModelChange={setModel} />
      </View>

      {direction === 'en-jp' && (
        <View style={styles.formalityBar}>
          <Text
            style={[styles.formalityLabel, formality === 'polite' && styles.formalityLabelActive]}
            onPress={() => setFormality('polite')}
          >
            polite
          </Text>
          <TouchableOpacity
            style={[styles.toggleTrack, formality === 'casual' && styles.toggleTrackOn]}
            onPress={() => setFormality(f => f === 'polite' ? 'casual' : 'polite')}
            activeOpacity={0.8}
          >
            <View style={[styles.toggleThumb, formality === 'casual' && styles.toggleThumbOn]} />
          </TouchableOpacity>
          <Text
            style={[styles.formalityLabel, formality === 'casual' && styles.formalityLabelActive]}
            onPress={() => setFormality('casual')}
          >
            casual
          </Text>
        </View>
      )}

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
          direction={direction}
        />

        <TranslationResult 
          result={result} 
          originalText={originalText}
          onWordClick={handleWordClick}
          onNewTranslation={handleNewTranslation}
          isLoading={isLoading}
          streamingText={streamingText}
          direction={direction}
        />
      </ScrollView>

      <PasteButton onPress={handlePaste} disabled={isLoading} />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    position: 'relative',
  },
  header: {
    backgroundColor: '#fff',
      
    paddingTop: 24,
    paddingBottom: 8,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '300',  
    color: '#1A1A1A',
    marginBottom: 16,
    textAlign: 'center'
  },
  toolbar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#fff',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E0E0E0',
  },
  formalityBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#fff',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E0E0E0',
  },
  formalityLabel: {
    fontSize: 14,
    color: '#999',
    textTransform: 'lowercase',
  },
  formalityLabelActive: {
    color: '#555',
    fontWeight: '600',
  },
  toggleTrack: {
    width: 44,
    height: 24,
    borderRadius: 12,
    marginHorizontal: 8,
    backgroundColor: '#E0E0E0',
    justifyContent: 'center',
    padding: 2,
  },
  toggleTrackOn: {
    backgroundColor: '#555',
  },
  toggleThumb: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#fff',
    transform: [{ translateX: 0 }],
  },
  toggleThumbOn: {
    transform: [{ translateX: 20 }],
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
  },
});
