import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

const HIGH_SCORES_KEY = 'japanese_translator_high_scores';

// For web, we'll use localStorage as fallback
const storage = {
  async getItem(key) {
    if (Platform.OS === 'web') {
      try {
        return localStorage.getItem(key);
      } catch (error) {
        console.warn('localStorage not available:', error);
        return null;
      }
    }
    return AsyncStorage.getItem(key);
  },
  
  async setItem(key, value) {
    if (Platform.OS === 'web') {
      try {
        localStorage.setItem(key, value);
        return;
      } catch (error) {
        console.warn('localStorage not available:', error);
        return;
      }
    }
    return AsyncStorage.setItem(key, value);
  }
};

export const gameService = {
  async getHighScores() {
    try {
      const scoresJson = await storage.getItem(HIGH_SCORES_KEY);
      return scoresJson ? JSON.parse(scoresJson) : {
        quiz10: 0,
        quiz50: 0,
        quiz100: 0
      };
    } catch (error) {
      console.error('Error getting high scores:', error);
      return { quiz10: 0, quiz50: 0, quiz100: 0 };
    }
  },

  async updateHighScore(gameType, score) {
    try {
      const highScores = await this.getHighScores();
      if (score > highScores[gameType]) {
        highScores[gameType] = score;
        await storage.setItem(HIGH_SCORES_KEY, JSON.stringify(highScores));
        return true; // New high score
      }
      return false; // No new high score
    } catch (error) {
      console.error('Error updating high score:', error);
      return false;
    }
  },

  generateDistractors(correctAnswer, allFavorites, count = 2) {
    // Get other meanings that are different from the correct one
    const otherMeanings = allFavorites
      .filter(fav => fav.meaning.toLowerCase() !== correctAnswer.toLowerCase())
      .map(fav => fav.meaning);
    
    // Shuffle and take the required count
    const shuffled = otherMeanings.sort(() => 0.5 - Math.random());
    return shuffled.slice(0, count);
  },

  shuffleArray(array) {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  },

  generateGameData(favorites, wordCount) {
    if (favorites.length === 0) return [];
    
    // Select random words (up to the requested count or all available)
    const selectedCount = Math.min(wordCount, favorites.length);
    const shuffledFavorites = this.shuffleArray(favorites);
    const gameWords = shuffledFavorites.slice(0, selectedCount);
    
    // Generate questions for each word
    const questions = gameWords.map((word, index) => {
      const distractors = this.generateDistractors(word.meaning, favorites, 2);
      const options = this.shuffleArray([word.meaning, ...distractors]);
      
      return {
        id: index + 1,
        word: word.word,
        reading: word.reading,
        correctAnswer: word.meaning,
        options: options,
        correctIndex: options.indexOf(word.meaning)
      };
    });
    
    return questions;
  }
};
