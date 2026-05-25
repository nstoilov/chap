import AsyncStorage from '@react-native-async-storage/async-storage';
import { MODELS } from '../config/models';

const STORAGE_KEY = '@chap_paid_rate_limit';
export const DAILY_LIMIT = 50;

const today = () => new Date().toISOString().slice(0, 10); // "YYYY-MM-DD"

const isPaidModel = (modelId) => {
  const model = MODELS.find(m => m.id === modelId);
  return model?.paid === true;
};

const loadState = async () => {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) return { date: today(), count: 0 };
    return JSON.parse(raw);
  } catch {
    return { date: today(), count: 0 };
  }
};

const saveState = async (state) => {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(state));
};

// Returns the number of paid requests used today
export const getUsageToday = async () => {
  const state = await loadState();
  if (state.date !== today()) return 0;
  return state.count;
};

// Returns true if the request is allowed, false if daily limit is reached.
// Free models always return true without incrementing the counter.
export const consumeRequest = async (modelId) => {
  if (!isPaidModel(modelId)) return true;

  let state = await loadState();

  if (state.date !== today()) {
    state = { date: today(), count: 0 };
  }

  if (state.count >= DAILY_LIMIT) return false;

  state.count += 1;
  await saveState(state);
  return true;
};
