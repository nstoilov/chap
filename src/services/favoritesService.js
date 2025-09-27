import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

const FAVORITES_KEY = 'japanese_translator_favorites';

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
  },
  
  async removeItem(key) {
    if (Platform.OS === 'web') {
      try {
        localStorage.removeItem(key);
        return;
      } catch (error) {
        console.warn('localStorage not available:', error);
        return;
      }
    }
    return AsyncStorage.removeItem(key);
  }
};

export const favoritesService = {
  async getFavorites() {
    try {
      const favoritesJson = await storage.getItem(FAVORITES_KEY);
      return favoritesJson ? JSON.parse(favoritesJson) : [];
    } catch (error) {
      console.error('Error getting favorites:', error);
      return [];
    }
  },

  async addFavorite(word) {
    try {
      const favorites = await this.getFavorites();
      const exists = favorites.find(fav => fav.word === word.word && fav.reading === word.reading);
      
      if (!exists) {
        const newFavorite = {
          ...word,
          id: Date.now().toString(),
          dateAdded: new Date().toISOString(),
        };
        favorites.unshift(newFavorite); // Add to beginning
        await storage.setItem(FAVORITES_KEY, JSON.stringify(favorites));
      }
      
      return favorites;
    } catch (error) {
      console.error('Error adding favorite:', error);
      return await this.getFavorites();
    }
  },

  async removeFavorite(wordId) {
    try {
      const favorites = await this.getFavorites();
      const updatedFavorites = favorites.filter(fav => fav.id !== wordId);
      await storage.setItem(FAVORITES_KEY, JSON.stringify(updatedFavorites));
      return updatedFavorites;
    } catch (error) {
      console.error('Error removing favorite:', error);
      return await this.getFavorites();
    }
  },

  async isFavorite(word, reading) {
    try {
      const favorites = await this.getFavorites();
      return favorites.some(fav => fav.word === word && fav.reading === reading);
    } catch (error) {
      console.error('Error checking if favorite:', error);
      return false;
    }
  },

  async clearAllFavorites() {
    try {
      await storage.removeItem(FAVORITES_KEY);
      return [];
    } catch (error) {
      console.error('Error clearing favorites:', error);
      return [];
    }
  },

  async updateFavorite(favoriteId, updatedData) {
    try {
      const favorites = await this.getFavorites();
      const updatedFavorites = favorites.map(fav => 
        fav.id === favoriteId ? { ...fav, ...updatedData } : fav
      );
      await storage.setItem(FAVORITES_KEY, JSON.stringify(updatedFavorites));
      return updatedFavorites;
    } catch (error) {
      console.error('Error updating favorite:', error);
      return await this.getFavorites();
    }
  }
};
