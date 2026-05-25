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
  maxChars,
}) => {
  const [focused, setFocused] = useState(false);
  const charCount = text.length;
  const isOverLimit = maxChars && charCount > maxChars;

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
          outlineColor={isOverLimit ? '#E53935' : undefined}
          activeOutlineColor={isOverLimit ? '#E53935' : undefined}
        />
        {!text && focused && (
          <Text style={styles.floatingPlaceholder} pointerEvents="none">
            
          </Text>
        )}
        {text.length > 0 && (
          <Text style={[styles.charCount, isOverLimit && styles.charCountOver]}>
            {charCount}{maxChars ? `/${maxChars}` : ''}
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
        disabled={isLoading || !text.trim() || isOverLimit}
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
  charCount: {
    position: 'absolute',
    bottom: 18,
    right: 12,
    fontSize: 12,
    color: '#BDBDBD',
  },
  charCountOver: {
    color: '#E53935',
    fontWeight: '600',
  },
  button: {
    marginTop: 10,
  },
  buttonContent: {
    paddingVertical: 8,
  },
});
