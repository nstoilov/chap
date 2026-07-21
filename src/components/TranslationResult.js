import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Card, Paragraph, Button, ActivityIndicator } from 'react-native-paper';
import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import { favoritesService } from '../services/favoritesService';

// Parse as much as possible from a partial/streaming JSON string
function parseStreamingResult(text) {
  const parsed = { translation: null, breakdown: [] };
  if (!text) return parsed;

  // Extract translation value (complete string only)
  const transMatch = text.match(/"translation"\s*:\s*"((?:[^"\\]|\\.)*)"/);
  if (transMatch) parsed.translation = transMatch[1];

  // Extract complete breakdown items
  const breakdownStart = text.indexOf('"breakdown"');
  if (breakdownStart !== -1) {
    const afterBreakdown = text.slice(breakdownStart);
    const itemRegex = /\{[^{}]*\}/g;
    let m;
    while ((m = itemRegex.exec(afterBreakdown)) !== null) {
      try {
        const item = JSON.parse(m[0]);
        if (item.word) parsed.breakdown.push(item);
      } catch {}
    }
  }

  return parsed;
}

export const TranslationResult = ({ result, originalText, onWordClick, onNewTranslation, isLoading, streamingText, direction }) => {
  const [favoriteStates, setFavoriteStates] = useState({});
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (result?.breakdown) {
      checkFavoriteStates();
    }
  }, [result]);

  const checkFavoriteStates = async () => {
    if (!result?.breakdown) return;
    
    const states = {};
    for (const item of result.breakdown) {
      states[`${item.word}-${item.reading}`] = await favoritesService.isFavorite(item.word, item.reading);
    }
    setFavoriteStates(states);
  };

  const handleFavoriteToggle = async (item) => {
    const key = `${item.word}-${item.reading}`;
    const isFavorited = favoriteStates[key];
    
    if (isFavorited) {
      // Find the favorite by word and reading to get its ID
      const favorites = await favoritesService.getFavorites();
      const favorite = favorites.find(fav => fav.word === item.word && fav.reading === item.reading);
      if (favorite) {
        await favoritesService.removeFavorite(favorite.id);
      }
    } else {
      await favoritesService.addFavorite(item);
    }
    
    // Update local state
    setFavoriteStates(prev => ({
      ...prev,
      [key]: !isFavorited
    }));
  };

  const handleCopyTranslation = async () => {
    if (!result?.translation) return;
    await Clipboard.setStringAsync(result.translation);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (!result && !streamingText) return null;

  // While streaming, parse partial JSON and show cards progressively
  if (!result && streamingText) {
    const partial = parseStreamingResult(streamingText);
    return (
      <View style={styles.container}>
        {/* Streaming Translation Card */}
        <Card style={styles.card}>
          <Card.Content>
            <View style={styles.streamingHeader}>
              <ActivityIndicator size="small" style={styles.streamingSpinner} />
              <Text style={styles.sectionLabel}>Translation</Text>
            </View>
            {partial.translation ? (
              <Paragraph style={styles.translationText}>{partial.translation}</Paragraph>
            ) : (
              <Paragraph style={styles.streamingPlaceholder}>…</Paragraph>
            )}
          </Card.Content>
        </Card>

        {/* Streaming Breakdown Card */}
        {partial.breakdown.length > 0 && (
          <Card style={styles.card}>
            <Card.Content>
              <Text style={styles.sectionLabel}>Word Breakdown</Text>
              {partial.breakdown.map((item, index) => (
                <View key={index} style={styles.breakdownItem}>
                  <View style={styles.wordClickArea}>
                    <View style={styles.wordContainer}>
                      <Text style={styles.japaneseWord}>{item.word}</Text>
                      {item.reading ? (
                        <Text style={styles.reading}>({item.reading})</Text>
                      ) : null}
                    </View>
                    {item.meaning ? (
                      <Text style={styles.meaning}>
                        {item.meaning}
                        {item.type ? <Text style={styles.partOfSpeech}> - {item.type}</Text> : null}
                      </Text>
                    ) : null}
                  </View>
                  <View style={styles.favoriteButton}>
                    <Ionicons name="heart-outline" size={20} color="#999" />
                  </View>
                </View>
              ))}
            </Card.Content>
          </Card>
        )}
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Original Text Card */}
      {originalText && (
        <Card style={styles.card}>
          <Card.Content>
            <Text style={styles.sectionLabel}>Original Text</Text>
            <Paragraph style={styles.originalText}>
              {originalText}
            </Paragraph>
          </Card.Content>
        </Card>
      )}

      {/* Translation Card */}
      <Card style={styles.card} onPress={handleCopyTranslation} accessible>
        <Card.Content>
          <View style={styles.translationHeader}>
            <Text style={styles.sectionLabel}>{direction === 'en-jp' ? 'Japanese Translation' : 'Translation'}</Text>
            {copied ? (
              <Text style={styles.copiedHint}>Copied!</Text>
            ) : (
              <Ionicons name="copy-outline" size={18} color="#999" />
            )}
          </View>
          <Paragraph style={styles.translationText}>
            {result.translation}
          </Paragraph>
        </Card.Content>
      </Card>

      {/* Breakdown Card */}
      <Card style={styles.card}>
        <Card.Content>
          <Text style={styles.sectionLabel}>Word Breakdown</Text>
          {result.breakdown?.map((item, index) => {
            const favoriteKey = `${item.word}-${item.reading}`;
            const isFavorited = favoriteStates[favoriteKey];
            
            return (
              <View key={index} style={styles.breakdownItem}>
                <TouchableOpacity 
                  style={styles.wordClickArea}
                  onPress={() => onWordClick(item.word)}
                  disabled={isLoading}
                >
                  <View style={styles.wordContainer}>
                    <Text style={[
                      styles.japaneseWord,
                      isLoading && styles.disabled
                    ]}>
                      {item.word}
                    </Text>
                    <Text style={[
                      styles.reading,
                      isLoading && styles.disabled
                    ]}>
                      ({item.reading})
                    </Text>
                  </View>
                  <Text style={[
                    styles.meaning,
                    isLoading && styles.disabled
                  ]}>
                    {item.meaning} - <Text style={styles.partOfSpeech}>{item.type}</Text>
                  </Text>
                </TouchableOpacity>
                
                <TouchableOpacity 
                  style={styles.favoriteButton}
                  onPress={() => handleFavoriteToggle(item)}
                  disabled={isLoading}
                >
                  <Ionicons 
                    name={isFavorited ? "heart" : "heart-outline"} 
                    size={20} 
                    color={isFavorited ? "#E91E63" : "#999"} 
                  />
                </TouchableOpacity>
              </View>
            );
          })}
        </Card.Content>
      </Card>

      {/* Grammar Card */}
      {result.grammar && (
        <Card style={styles.card}>
          <Card.Content>
            <Text style={styles.sectionLabel}>Grammar Notes</Text>
            <Paragraph>{result.grammar}</Paragraph>
          </Card.Content>
        </Card>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginTop: 20,
  },
  card: {
    marginBottom: 36,
    elevation: 3,
  },
  originalText: {
    fontSize: 18,
    lineHeight: 28,
    color: '#1A1A1A',
    fontWeight: '600',
    backgroundColor: '#F5F5F5',
   // padding: 12,
    borderRadius: 8,
  },
  originalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  newButton: {
    borderColor: '#666',
  },
  newButtonText: {
    fontSize: 12,
    color: '#666',
  },
  translationText: {
    fontSize: 16,
    lineHeight: 24,
    color: '#2E7D32',
    fontWeight: '500',
  },
  sectionLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#757575',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  translationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  copiedHint: {
    fontSize: 12,
    color: '#2E7D32',
    fontWeight: '600',
  },
  furiganaText: {
    fontSize: 16,
    lineHeight: 28,
    color: '#1565C0',
  },
  breakdownItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 12,
    paddingBottom: 12,
    paddingTop: 8,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
    borderRadius: 8,
  },
  wordClickArea: {
    flex: 1,
    paddingRight: 8,
  },
  favoriteButton: {
    padding: 4,
    marginTop: 2,
  },
  wordContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  japaneseWord: {
    fontSize: 18,
    color: '#1565C0',
  },
  reading: {
    fontSize: 14,
    color: '#757575',
    marginLeft: 8,
  },
  meaning: {
    fontSize: 14,
    color: '#424242',
    marginBottom: 4,
  },
  partOfSpeech: {
    fontStyle: 'italic',
    color: '#9E9E9E',
  },
  clickHint: {
    fontSize: 12,
    color: '#666',
    fontStyle: 'italic',
  },
  disabled: {
    opacity: 0.5,
  },
  streamingHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  streamingSpinner: {
    marginRight: 8,
  },
  streamingPlaceholder: {
    color: '#BDBDBD',
    fontSize: 16,
  },
});
