import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, Text, Alert } from 'react-native';
import { Title, Paragraph, Card, Button, Portal, Dialog, TextInput } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { favoritesService } from '../services/favoritesService';

export const FavoritesScreen = () => {
  const [favorites, setFavorites] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showClearDialog, setShowClearDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [editingFavorite, setEditingFavorite] = useState(null);
  const [editForm, setEditForm] = useState({
    word: '',
    reading: '',
    meaning: ''
  });

  useEffect(() => {
    loadFavorites();
  }, []);

  // Refresh favorites when screen comes into focus
  useFocusEffect(
    React.useCallback(() => {
      loadFavorites();
    }, [])
  );

  const loadFavorites = async () => {
    try {
      setLoading(true);
      const favs = await favoritesService.getFavorites();
      setFavorites(favs);
    } catch (error) {
      console.error('Error loading favorites:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveFavorite = async (favoriteId) => {
    try {
      const updatedFavorites = await favoritesService.removeFavorite(favoriteId);
      setFavorites(updatedFavorites);
    } catch (error) {
      console.error('Error removing favorite:', error);
    }
  };

  const handleClearAll = async () => {
    try {
      await favoritesService.clearAllFavorites();
      setFavorites([]);
      setShowClearDialog(false);
    } catch (error) {
      console.error('Error clearing favorites:', error);
    }
  };

  const showClearConfirmation = () => {
    setShowClearDialog(true);
  };

  const handleEditFavorite = (favorite) => {
    setEditingFavorite(favorite);
    setEditForm({
      word: favorite.word,
      reading: favorite.reading,
      meaning: favorite.meaning
    });
    setShowEditDialog(true);
  };

  const handleSaveEdit = async () => {
    if (!editingFavorite || !editForm.word.trim() || !editForm.reading.trim() || !editForm.meaning.trim()) {
      return;
    }

    try {
      // Update the favorite with new values
      const updatedData = {
        word: editForm.word.trim(),
        reading: editForm.reading.trim(),
        meaning: editForm.meaning.trim()
      };

      await favoritesService.updateFavorite(editingFavorite.id, updatedData);

      // Refresh the favorites list
      await loadFavorites();
      
      setShowEditDialog(false);
      setEditingFavorite(null);
      setEditForm({ word: '', reading: '', meaning: '' });
    } catch (error) {
      console.error('Error updating favorite:', error);
    }
  };

  const handleCancelEdit = () => {
    setShowEditDialog(false);
    setEditingFavorite(null);
    setEditForm({ word: '', reading: '', meaning: '' });
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centerContent}>
          <Paragraph>Loading favorites...</Paragraph>
        </View>
      </SafeAreaView>
    );
  }

  if (favorites.length === 0) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centerContent}>
          <Card style={styles.card}>
            <Card.Content>
              <Title style={styles.title}>❤️ Favorites</Title>
              <Paragraph style={styles.description}>
                Save your favorite translations and words here for quick access.
              </Paragraph>
              <Paragraph style={styles.emptyMessage}>
                No favorites yet! Start adding words by clicking the heart icon next to any word in your translations.
              </Paragraph>
            </Card.Content>
          </Card>
        </View>
      </SafeAreaView>
    );
  }
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Title style={styles.title}>❤️ Favorites ({favorites.length})</Title>
        {favorites.length > 0 && (
          <Button 
            mode="outlined" 
            onPress={showClearConfirmation}
            style={styles.clearButton}
            labelStyle={styles.clearButtonText}
          >
            Clear All
          </Button>
        )}
      </View>
      
      <ScrollView style={styles.scrollContainer} showsVerticalScrollIndicator={false}>
        {favorites.map((favorite) => (
          <Card key={favorite.id} style={styles.favoriteCard}>
            <Card.Content>
              <View style={styles.favoriteItem}>
                <View style={styles.favoriteContent}>
                  <View style={styles.wordContainer}>
                    <Text style={styles.japaneseWord}>{favorite.word}</Text>
                    <Text style={styles.reading}>({favorite.reading})</Text>
                  </View>
                  <Text style={styles.meaning}>
                    {favorite.meaning} - <Text style={styles.partOfSpeech}>{favorite.type}</Text>
                  </Text>
                  <Text style={styles.dateAdded}>
                    Added {new Date(favorite.dateAdded).toLocaleDateString()}
                  </Text>
                </View>
                
                <View style={styles.actionButtons}>
                  <TouchableOpacity 
                    style={styles.editButton}
                    onPress={() => handleEditFavorite(favorite)}
                  >
                    <Text style={styles.editIcon}>✏️</Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity 
                    style={styles.removeButton}
                    onPress={() => handleRemoveFavorite(favorite.id)}
                  >
                    <Ionicons 
                      name="heart" 
                      size={24} 
                      color="#E91E63" 
                    />
                  </TouchableOpacity>
                </View>
              </View>
            </Card.Content>
          </Card>
        ))}
        <View style={styles.bottomPadding} />
      </ScrollView>

      <Portal>
        <Dialog visible={showClearDialog} onDismiss={() => setShowClearDialog(false)}>
          <Dialog.Title>Clear All Favorites</Dialog.Title>
          <Dialog.Content>
            <Paragraph>
              Are you sure you want to clear all {favorites.length} favorites? This action cannot be undone.
            </Paragraph>
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setShowClearDialog(false)}>Cancel</Button>
            <Button 
              onPress={handleClearAll}
              labelStyle={{ color: '#E91E63' }}
            >
              Clear All
            </Button>
          </Dialog.Actions>
        </Dialog>

        <Dialog visible={showEditDialog} onDismiss={handleCancelEdit}>
          <Dialog.Title>Edit Favorite</Dialog.Title>
          <Dialog.Content>
            <TextInput
              label="Japanese Word"
              value={editForm.word}
              onChangeText={(text) => setEditForm(prev => ({ ...prev, word: text }))}
              style={styles.editInput}
              mode="outlined"
            />
            <TextInput
              label="Furigana/Reading"
              value={editForm.reading}
              onChangeText={(text) => setEditForm(prev => ({ ...prev, reading: text }))}
              style={styles.editInput}
              mode="outlined"
            />
            <TextInput
              label="Translation/Meaning"
              value={editForm.meaning}
              onChangeText={(text) => setEditForm(prev => ({ ...prev, meaning: text }))}
              style={styles.editInput}
              mode="outlined"
              multiline
            />
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={handleCancelEdit}>Cancel</Button>
            <Button 
              onPress={handleSaveEdit}
              labelStyle={{ color: '#2196F3' }}
            >
              Save
            </Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  centerContent: {
    flex: 1,
    padding: 16,
    justifyContent: 'center',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
  },
  scrollContainer: {
    flex: 1,
    paddingHorizontal: 16,
  },
  card: {
    padding: 20,
  },
  favoriteCard: {
    marginBottom: 12,
    elevation: 2,
  },
  favoriteItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  favoriteContent: {
    flex: 1,
    paddingRight: 12,
  },
  wordContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  japaneseWord: {
    fontSize: 18,
    color: '#1565C0',
    fontWeight: '500',
  },
  reading: {
    fontSize: 14,
    color: '#757575',
    marginLeft: 8,
  },
  meaning: {
    fontSize: 14,
    color: '#424242',
    marginBottom: 4,
  },
  partOfSpeech: {
    fontStyle: 'italic',
    color: '#9E9E9E',
  },
  dateAdded: {
    fontSize: 12,
    color: '#999',
    fontStyle: 'italic',
  },
  actionButtons: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  editButton: {
    padding: 8,
    marginRight: 4,
  },
  editIcon: {
    fontSize: 18,
  },
  removeButton: {
    padding: 8,
  },
  editInput: {
    marginBottom: 12,
  },
  title: {
    color: '#E91E63',
    fontSize: 20,
  },
  description: {
    textAlign: 'center',
    marginBottom: 20,
    color: '#666',
  },
  emptyMessage: {
    textAlign: 'center',
    fontWeight: 'bold',
    fontSize: 16,
    color: '#999',
  },
  clearButton: {
    borderColor: '#E91E63',
  },
  clearButtonText: {
    color: '#E91E63',
    fontSize: 12,
  },
  bottomPadding: {
    height: 20,
  },
});
