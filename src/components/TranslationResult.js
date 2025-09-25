import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Card, Title, Paragraph } from 'react-native-paper';

export const TranslationResult = ({ result }) => {
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
            <View key={index} style={styles.breakdownItem}>
              <View style={styles.wordContainer}>
                <Text style={styles.japaneseWord}>{item.word}</Text>
                <Text style={styles.reading}>({item.reading})</Text>
              </View>
              <Text style={styles.meaning}>
                {item.meaning} - <Text style={styles.partOfSpeech}>{item.type}</Text>
              </Text>
            </View>
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
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
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
  },
  partOfSpeech: {
    fontStyle: 'italic',
    color: '#9E9E9E',
  },
});
