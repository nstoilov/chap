import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Card, Title, Paragraph } from 'react-native-paper';

export const TranslationResult = ({ result, onWordClick, isLoading }) => {
  if (!result) return null;

  return (
    <View style={styles.container}>
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
          {result.breakdown?.map((item, index) => (
            <TouchableOpacity 
              key={index} 
              style={styles.breakdownItem}
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
              <Text style={styles.clickHint}>👆 Tap to translate this word</Text>
            </TouchableOpacity>
          ))}
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
  translationText: {
    fontSize: 16,
    lineHeight: 24,
    color: '#2E7D32',
    fontWeight: '500',
  },
  breakdownItem: {
    marginBottom: 12,
    paddingBottom: 12,
    paddingTop: 8,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
    borderRadius: 8,
    backgroundColor: '#F8F9FA',
  },
  wordContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  japaneseWord: {
    fontSize: 18,
    fontWeight: 'bold',
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
