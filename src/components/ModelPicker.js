import React, { useState } from 'react';
import { StyleSheet } from 'react-native';
import { Menu, Button } from 'react-native-paper';
import { Ionicons } from '@expo/vector-icons';
import { MODELS, ENABLE_PAID_MODELS } from '../config/models';

export const ModelPicker = ({ selectedModel, onModelChange }) => {
  const [visible, setVisible] = useState(false);

  const current = MODELS.find(m => m.id === selectedModel) ?? MODELS[0];

  return (
    <Menu
      visible={visible}
      onDismiss={() => setVisible(false)}
      anchor={
        <Button
          onPress={() => setVisible(true)}
          compact
          mode="outlined"
          textColor="#555"
          icon={() => <Ionicons name="chevron-down" size={14} color="#555" />}
          contentStyle={{ flexDirection: 'row-reverse' }}
        >
          {current.label}
        </Button>
      }
    >
      {MODELS.map(model => {
        const disabled = model.paid && !ENABLE_PAID_MODELS;
        return (
          <Menu.Item
            key={model.id}
            onPress={() => {
              if (disabled) return;
              onModelChange(model.id);
              setVisible(false);
            }}
            title={disabled ? `${model.label} (unavailable)` : model.label}
            titleStyle={disabled ? styles.disabledLabel : undefined}
            trailingIcon={selectedModel === model.id ? 'check' : undefined}
          />
        );
      })}
    </Menu>
  );
};

const styles = StyleSheet.create({
  disabledLabel: {
    color: '#BDBDBD',
  },
});
