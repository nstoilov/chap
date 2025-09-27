import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Card, Title, Paragraph, Button } from 'react-native-paper';
import { Ionicons } from '@expo/vector-icons';
import { favoritesService } from '../services/favoritesService';

export const TranslationResult = ({ result, originalText, onWordClick, onNewTranslation, isLoading }) => {
  const [favoriteStates, setFavoriteStates] = useState({});

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

  if (!result) return null;

  return (
    <View style={styles.container}>
      {/* Original Text Card */}
      {originalText && (
        <Card style={styles.card}>
          <Card.Content>

        
            <Paragraph style={styles.originalText}>
              {originalText}
            </Paragraph>
          </Card.Content>
        </Card>
      )}

      {/* Translation Card */}
      <Card style={styles.card}>
        <Card.Content>
          <Title>Translation</Title>
          <Paragraph style={styles.translationText}>
            {result.translation}
          </Paragraph>
        </Card.Content>
      </Card>

      {/* Breakdown Card */}
      <Card style={styles.card}>
        <Card.Content>
          <Title>Word Breakdown</Title>
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
            <Title>Grammar Notes</Title>
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
    marginBottom: 15,
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
    backgroundColor: '#F8F9FA',
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
});
