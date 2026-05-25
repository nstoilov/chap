export const ENABLE_PAID_MODELS = false;

export const MODELS = [
  { id: 'gemini-2.5-flash', label: 'Gemini 2.5 Flash', provider: 'google', paid: false },
  { id: 'gemini-2.5-pro', label: 'Gemini 2.5 Pro', provider: 'google', paid: true },
  { id: 'gpt-4.1-mini', label: 'GPT-4.1 Mini', provider: 'openai', paid: true },
];

export const DEFAULT_MODEL = 'gemini-2.5-flash';
