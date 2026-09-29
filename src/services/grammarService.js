import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

const HIDDEN_KEY = 'chap_n4_grammar_hidden';

const storage = {
  async getItem(key) {
    if (Platform.OS === 'web') {
      try { return localStorage.getItem(key); } catch { return null; }
    }
    return AsyncStorage.getItem(key);
  },
  async setItem(key, value) {
    if (Platform.OS === 'web') {
      try { localStorage.setItem(key, value); } catch { return; }
    }
    return AsyncStorage.setItem(key, value);
  },
  async removeItem(key) {
    if (Platform.OS === 'web') {
      try { localStorage.removeItem(key); } catch { return; }
    }
    return AsyncStorage.removeItem(key);
  },
};

export const grammarService = {
  async getHiddenIds() {
    try {
      const raw = await storage.getItem(HIDDEN_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch (e) {
      return [];
    }
  },

  async hidePhrase(id) {
    try {
      const ids = await this.getHiddenIds();
      if (!ids.includes(id)) {
        ids.push(id);
        await storage.setItem(HIDDEN_KEY, JSON.stringify(ids));
      }
    } catch (e) {
      console.error('Error hiding grammar phrase:', e);
    }
  },

  async clearHidden() {
    try { await storage.removeItem(HIDDEN_KEY); } catch (e) { /* ignore */ }
  },
};
