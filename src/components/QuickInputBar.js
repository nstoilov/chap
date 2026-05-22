import React from 'react';
import { TouchableOpacity, StyleSheet } from 'react-native';
import { TextInput } from 'react-native-paper';

export const QuickInputBar = ({ onPress }) => {
  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.7} style={styles.container}>
      <TextInput
        label="Paste Japanese text here"
        value=""
        multiline
        numberOfLines={6}
        style={styles.textInput}
        mode="outlined"
        placeholder=""
        editable={false}
        pointerEvents="none"
      />
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    marginTop: 24,
    marginBottom: 20,
  },
  textInput: {
    backgroundColor: 'white',
  },
});
