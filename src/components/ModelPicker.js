import React, { useState } from 'react';
import { Menu, Button } from 'react-native-paper';
import { Ionicons } from '@expo/vector-icons';
import { MODELS } from '../config/models';

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
          textColor="#555"
          icon={() => <Ionicons name="chevron-down" size={14} color="#555" />}
          contentStyle={{ flexDirection: 'row-reverse' }}
        >
          {current.label}
        </Button>
      }
    >
      {MODELS.map(model => (
        <Menu.Item
          key={model.id}
          onPress={() => {
            onModelChange(model.id);
            setVisible(false);
          }}
          title={model.label}
          trailingIcon={selectedModel === model.id ? 'check' : undefined}
        />
      ))}
    </Menu>
  );
};
