import React from 'react';
import { View, StyleSheet } from 'react-native';
import { TextInput, Button, HelperText } from 'react-native-paper';

export const TextInputSection = ({ 
  text, 
  onTextChange, 
  onTranslate, 
  isLoading, 
  error 
}) => {
  return (
    <View style={styles.container}>
      <TextInput
        label="Paste Japanese text here"
        value={text}
        onChangeText={onTextChange}
        multiline
        numberOfLines={6}
        style={styles.textInput}
        mode="outlined"
        placeholder="日本語のテキストをここに貼り付けてください"
      />
      
      {error && (
        <HelperText type="error" visible={!!error}>
          {error}
        </HelperText>
      )}
      
      <Button
        mode="contained"
        onPress={onTranslate}
        disabled={isLoading || !text.trim()}
        loading={isLoading}
        style={styles.button}
        contentStyle={styles.buttonContent}
      >
        {isLoading ? 'Translating...' : 'Translate & Analyze'}
      </Button>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 20,
  },
  textInput: {
    marginBottom: 10,
    backgroundColor: 'white',
  },
  button: {
    marginTop: 10,
  },
  buttonContent: {
    paddingVertical: 8,
  },
});
