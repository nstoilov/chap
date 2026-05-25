import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = '@chap_rate_limit';
export const DAILY_LIMIT = 50;

const today = () => new Date().toISOString().slice(0, 10); // "YYYY-MM-DD"

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

// Returns the number of requests used today
export const getUsageToday = async () => {
  const state = await loadState();
  if (state.date !== today()) return 0;
  return state.count;
};

// Returns true if the request is allowed, false if limit is reached.
// Increments the counter on success.
export const consumeRequest = async () => {
  let state = await loadState();

  if (state.date !== today()) {
    state = { date: today(), count: 0 };
  }

  if (state.count >= DAILY_LIMIT) return false;

  state.count += 1;
  await saveState(state);
  return true;
};
