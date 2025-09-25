import React, { useState, useEffect } from 'react';
import { View, StyleSheet, Alert } from 'react-native';
import { TextInput, Button, Card, Title, Paragraph } from 'react-native-paper';
import AsyncStorage from '@react-native-async-storage/async-storage';

const API_KEY_STORAGE = 'openai_api_key';

export const ApiKeyConfig = ({ onApiKeySet }) => {
  const [apiKey, setApiKey] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    loadApiKey();
  }, []);

  const loadApiKey = async () => {
    try {
      const storedKey = await AsyncStorage.getItem(API_KEY_STORAGE);
      if (storedKey) {
        setApiKey(storedKey);
        onApiKeySet(storedKey);
      }
    } catch (error) {
      console.error('Error loading API key:', error);
    }
  };

  const saveApiKey = async () => {
    if (!apiKey.trim()) {
      Alert.alert('Error', 'Please enter a valid API key');
      return;
    }

    setIsLoading(true);
    try {
      await AsyncStorage.setItem(API_KEY_STORAGE, apiKey.trim());
      onApiKeySet(apiKey.trim());
      Alert.alert('Success', 'API key saved successfully!');
    } catch (error) {
      Alert.alert('Error', 'Failed to save API key');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card style={styles.card}>
      <Card.Content>
        <Title>OpenAI API Configuration</Title>
        <Paragraph style={styles.description}>
          To use this app, you need to provide your OpenAI API key. 
          You can get one from https://platform.openai.com/api-keys
        </Paragraph>
        
        <TextInput
          label="OpenAI API Key"
          value={apiKey}
          onChangeText={setApiKey}
          secureTextEntry
          mode="outlined"
          style={styles.input}
          placeholder="sk-..."
        />
        
        <Button
          mode="contained"
          onPress={saveApiKey}
          loading={isLoading}
          disabled={isLoading}
          style={styles.button}
        >
          Save API Key
        </Button>
      </Card.Content>
    </Card>
  );
};

const styles = StyleSheet.create({
  card: {
    margin: 16,
  },
  description: {
    marginBottom: 16,
    color: '#666',
  },
  input: {
    marginBottom: 16,
  },
  button: {
    marginTop: 8,
  },
});
