import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

const LEVEL_KEY = 'chap_jlpt_level';
const DIFFICULTY_KEY = 'chap_jlpt_difficulty';
const DEFAULT_LEVEL = 'N5';
const MAX_WEAK_ITEMS = 40;
const MAX_SESSIONS = 20;

export const JLPT_LEVELS = ['N5', 'N4', 'N3', 'N2', 'N1'];

export const JLPT_SECTIONS = [
  { id: 'vocabulary', label: 'Vocabulary' },
  { id: 'grammar', label: 'Grammar' },
  { id: 'reading', label: 'Reading' },
];

export const JLPT_COUNTS = [10, 20, 50];

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

export const jlptService = {
  async getLevel() {
    try {
      const lvl = await storage.getItem(LEVEL_KEY);
      return JLPT_LEVELS.includes(lvl) ? lvl : DEFAULT_LEVEL;
    } catch (e) {
      return DEFAULT_LEVEL;
    }
  },

  async setLevel(level) {
    try { await storage.setItem(LEVEL_KEY, level); } catch (e) { /* ignore */ }
  },

  async getDifficulty() {
    try {
      const raw = await storage.getItem(DIFFICULTY_KEY);
      return raw ? JSON.parse(raw) : { sessions: [], weakItems: [] };
    } catch (e) {
      return { sessions: [], weakItems: [] };
    }
  },

  async recordSession({ level, section, count, score, durationMs }) {
    try {
      const data = await this.getDifficulty();
      data.sessions.unshift({
        date: new Date().toISOString(),
        level, section, count, score, durationMs,
      });
      data.sessions = data.sessions.slice(0, MAX_SESSIONS);
      await storage.setItem(DIFFICULTY_KEY, JSON.stringify(data));
    } catch (e) {
      console.error('Error recording JLPT session:', e);
    }
  },

  async recordWrongItems(level, section, results) {
    try {
      const data = await this.getDifficulty();
      for (const r of results) {
        if (r.correct || !r.question) continue;
        const q = r.question;
        const topic = (q.topic || q.prompt || 'general').toString();
        let entry = data.weakItems.find(
          w => w.level === level && w.section === section && w.topic === topic
        );
        if (!entry) {
          entry = {
            level, section, topic,
            prompt: q.prompt,
            correct: q.options[q.correctIndex],
            chosen: q.options[r.chosenIndex],
            count: 0,
            lastMissed: null,
          };
          data.weakItems.push(entry);
        }
        entry.count += 1;
        entry.lastMissed = new Date().toISOString();
        entry.prompt = q.prompt;
        entry.correct = q.options[q.correctIndex];
        entry.chosen = q.options[r.chosenIndex];
      }
      data.weakItems.sort((a, b) => b.count - a.count);
      data.weakItems = data.weakItems.slice(0, MAX_WEAK_ITEMS);
      await storage.setItem(DIFFICULTY_KEY, JSON.stringify(data));
    } catch (e) {
      console.error('Error recording JLPT weak items:', e);
    }
  },

  async getWeakSummary(level, section) {
    try {
      const data = await this.getDifficulty();
      return data.weakItems
        .filter(w => w.level === level && w.section === section)
        .slice(0, 8)
        .map(w => ({ topic: w.topic, prompt: w.prompt, count: w.count }));
    } catch (e) {
      return [];
    }
  },

  async getDifficultyForPrompt(level, section) {
    try {
      const weak = await this.getWeakSummary(level, section);
      if (weak.length === 0) return '';
      const parts = weak
        .filter(w => w.topic && w.topic !== 'general')
        .slice(0, 6)
        .map(w => `${w.topic} (x${w.count})`);
      if (parts.length === 0) return '';
      return `The test-taker previously struggled with these areas: ${parts.join(', ')}. Where natural, include at least two questions that revisit these specific weak points, and keep the rest varied.`;
    } catch (e) {
      return '';
    }
  },

  async clearDifficulty() {
    try { await storage.removeItem(DIFFICULTY_KEY); } catch (e) { /* ignore */ }
  },
};