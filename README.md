# Japanese Translator App

A React Native Expo app that uses ChatGPT to translate Japanese text to English with detailed word breakdowns and furigana readings.

## Features

- 🎌 **Japanese Text Translation**: Paste Japanese text and get accurate English translations
- 📖 **Word-by-Word Breakdown**: Each word is broken down with:
  - Furigana readings (hiragana)
  - English meanings
  - Parts of speech
- 📚 **Grammar Explanations**: Complex grammar structures are explained
- 🔐 **Secure API Key Storage**: OpenAI API keys are stored securely on device
- 📱 **Mobile-First Design**: Optimized for mobile devices with clean UI

## Setup

1. **Install Dependencies**
   ```bash
   npm install
   ```

2. **Configure OpenAI API Key**
   - Get your API key from [OpenAI Platform](https://platform.openai.com/api-keys)
   - Add it to the `.env` file:
     ```
     OPENAI_API_KEY=your_api_key_here
     ```

3. **Run the App**
   ```bash
   npx expo start
   ```
   - Scan the QR code with Expo Go app
   - Or run on simulator: `npx expo start --ios` or `npx expo start --android`

## How to Use

1. **Start the App**: Run `npx expo start` and scan the QR code
2. **Enter Japanese Text**: Paste or type Japanese text in the input field
3. **Translate**: Tap "Translate & Analyze" button
4. **View Results**: See translation, word breakdown with furigana, and grammar explanations

## Example

**Input:** `今日は天気がいいですね。`

**Output:**
- **Translation**: "The weather is nice today, isn't it?"
- **Breakdown**:
  - 今日 (きょう) - today - noun
  - は (wa) - topic marker - particle
  - 天気 (てんき) - weather - noun
  - が (ga) - subject marker - particle
  - いい (ii) - good/nice - adjective
  - です (desu) - polite copula - auxiliary verb
  - ね (ne) - sentence-ending particle - particle

## Tech Stack

- **React Native** with **Expo**
- **OpenAI GPT-4** API
- **React Native Paper** for UI components
- **AsyncStorage** for secure local storage

## Requirements

- Node.js 18+
- Expo CLI
- OpenAI API key
- iOS/Android device or simulator

## License

MIT License

export build
npx expo export --platform web   
npx vercel --prod --archive=tgz  
