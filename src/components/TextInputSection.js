import React, { useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { TextInput, Button, HelperText } from 'react-native-paper';

export const TextInputSection = ({ 
  text, 
  onTextChange, 
  onTranslate, 
  isLoading, 
  error,
  inputRef,
}) => {
  const [focused, setFocused] = useState(false);

  return (
    <View style={styles.container}>
      <View>
        <TextInput
          ref={inputRef}
          label="Paste Japanese text here"
          value={text}
          onChangeText={onTextChange}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          multiline
          numberOfLines={6}
          style={styles.textInput}
          mode="outlined"
        />
        {!text && focused && (
          <Text style={styles.floatingPlaceholder} pointerEvents="none">
            
          </Text>
        )}
      </View>
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
  floatingPlaceholder: {
    position: 'absolute',
    top: 28,
    left: 14,
    right: 14,
    fontSize: 14,
    color: '#BDBDBD',
    pointerEvents: 'none',
  },
  button: {
    marginTop: 10,
  },
  buttonContent: {
    paddingVertical: 8,
  },
});
