import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, Text } from 'react-native';
import { Title, Paragraph, Card, Button, ProgressBar } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { favoritesService } from '../services/favoritesService';
import { gameService } from '../services/gameService';

export const GameScreen = () => {
  const [gameState, setGameState] = useState('menu'); // 'menu', 'loading', 'playing', 'finished'
  const [favorites, setFavorites] = useState([]);
  const [questions, setQuestions] = useState([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState(null);
  const [showResult, setShowResult] = useState(false);
  const [highScores, setHighScores] = useState({ quiz10: 0, quiz50: 0, quiz100: 0 });
  const [gameMode, setGameMode] = useState(null);
  const [isNewHighScore, setIsNewHighScore] = useState(false);

  useFocusEffect(
    React.useCallback(() => {
      loadFavorites();
      loadHighScores();
    }, [])
  );

  const loadFavorites = async () => {
    try {
      const favs = await favoritesService.getFavorites();
      setFavorites(favs);
    } catch (error) {
      console.error('Error loading favorites:', error);
    }
  };

  const loadHighScores = async () => {
    try {
      const scores = await gameService.getHighScores();
      setHighScores(scores);
    } catch (error) {
      console.error('Error loading high scores:', error);
    }
  };

  const startGame = async (wordCount) => {
    if (favorites.length === 0) {
      return;
    }

    setGameState('loading');
    setGameMode(`quiz${wordCount}`);
    
    // Simulate loading delay for better UX
    setTimeout(() => {
      const gameQuestions = gameService.generateGameData(favorites, wordCount);
      setQuestions(gameQuestions);
      setCurrentQuestionIndex(0);
      setScore(0);
      setSelectedAnswer(null);
      setShowResult(false);
      setGameState('playing');
    }, 1500);
  };

  const handleAnswerSelect = (answerIndex) => {
    if (selectedAnswer !== null) return; // Already answered
    
    setSelectedAnswer(answerIndex);
    const currentQuestion = questions[currentQuestionIndex];
    const isCorrect = answerIndex === currentQuestion.correctIndex;
    
    if (isCorrect) {
      setScore(prev => prev + 1);
    }
    
    setShowResult(true);
  };

  const nextQuestion = () => {
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(prev => prev + 1);
      setSelectedAnswer(null);
      setShowResult(false);
    } else {
      finishGame();
    }
  };

  const finishGame = async () => {
    const newHighScore = await gameService.updateHighScore(gameMode, score);
    setIsNewHighScore(newHighScore);
    if (newHighScore) {
      await loadHighScores();
    }
    setGameState('finished');
  };

  const resetGame = () => {
    setGameState('menu');
    setQuestions([]);
    setCurrentQuestionIndex(0);
    setScore(0);
    setSelectedAnswer(null);
    setShowResult(false);
    setGameMode(null);
    setIsNewHighScore(false);
  };

  const renderMenu = () => (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <View style={styles.content}>
        <Card style={styles.headerCard}>
          <Card.Content>
            <Title style={styles.title}>🎮 Translation Quiz</Title>
            <Paragraph style={styles.description}>
              Test your knowledge with your saved favorites!
            </Paragraph>
          </Card.Content>
        </Card>

        <Card style={styles.statsCard}>
          <Card.Content>
            <Title style={styles.statsTitle}>🏆 High Scores</Title>
            <View style={styles.scoresContainer}>
              <View style={styles.scoreItem}>
                <Text style={styles.scoreLabel}>10 Words</Text>
                <Text style={styles.scoreValue}>{highScores.quiz10}</Text>
              </View>
              <View style={styles.scoreItem}>
                <Text style={styles.scoreLabel}>50 Words</Text>
                <Text style={styles.scoreValue}>{highScores.quiz50}</Text>
              </View>
              <View style={styles.scoreItem}>
                <Text style={styles.scoreLabel}>100 Words</Text>
                <Text style={styles.scoreValue}>{highScores.quiz100}</Text>
              </View>
            </View>
          </Card.Content>
        </Card>

        {favorites.length === 0 ? (
          <Card style={styles.noFavoritesCard}>
            <Card.Content>
              <Title style={styles.noFavoritesTitle}>No Favorites Yet!</Title>
              <Paragraph style={styles.noFavoritesText}>
                Add some words to your favorites by translating text and clicking the heart icons. 
                Then come back to play!
              </Paragraph>
            </Card.Content>
          </Card>
        ) : (
          <View style={styles.gameOptions}>
            <Card style={styles.optionCard}>
              <Card.Content>
                <Title style={styles.optionTitle}>Choose Game Size</Title>
                <Paragraph style={styles.availableWords}>
                  Available words: {favorites.length}
                </Paragraph>
              </Card.Content>
            </Card>

            <Button
              mode="contained"
              onPress={() => startGame(10)}
              style={[styles.gameButton, styles.easyButton]}
              labelStyle={styles.gameButtonText}
              disabled={favorites.length === 0}
            >
              🎯 Quick Game (10 words)
            </Button>

            <Button
              mode="contained"
              onPress={() => startGame(50)}
              style={[styles.gameButton, styles.mediumButton]}
              labelStyle={styles.gameButtonText}
              disabled={favorites.length === 0}
            >
              🔥 Medium Game (50 words)
            </Button>

            <Button
              mode="contained"
              onPress={() => startGame(100)}
              style={[styles.gameButton, styles.hardButton]}
              labelStyle={styles.gameButtonText}
              disabled={favorites.length === 0}
            >
              🏆 Challenge (100 words)
            </Button>
          </View>
        )}
      </View>
    </ScrollView>
  );

  const renderLoading = () => (
    <View style={styles.centerContainer}>
      <Card style={styles.loadingCard}>
        <Card.Content style={styles.loadingContent}>
          <Ionicons name="game-controller" size={48} color="#9C27B0" />
          <Title style={styles.loadingTitle}>Preparing Game...</Title>
          <Paragraph style={styles.loadingText}>
            Generating questions from your favorites
          </Paragraph>
          <ProgressBar indeterminate color="#9C27B0" style={styles.loadingBar} />
        </Card.Content>
      </Card>
    </View>
  );

  const renderGame = () => {
    const currentQuestion = questions[currentQuestionIndex];
    const progress = (currentQuestionIndex + 1) / questions.length;

    return (
      <View style={styles.gameContainer}>
        <Card style={styles.gameHeader}>
          <Card.Content>
            <View style={styles.gameHeaderContent}>
              <Text style={styles.questionCounter}>
                {currentQuestionIndex + 1} / {questions.length}
              </Text>
              <Text style={styles.gameScore}>Score: {score}</Text>
            </View>
            <ProgressBar progress={progress} color="#9C27B0" style={styles.progressBar} />
          </Card.Content>
        </Card>

        <Card style={styles.questionCard}>
          <Card.Content>
            <Title style={styles.questionTitle}>What does this mean?</Title>
            <Text style={styles.japaneseWord}>{currentQuestion.word}</Text>
            <Text style={styles.reading}>({currentQuestion.reading})</Text>
          </Card.Content>
        </Card>

        <View style={styles.optionsContainer}>
          {currentQuestion.options.map((option, index) => (
            <TouchableOpacity
              key={index}
              style={[
                styles.optionButton,
                selectedAnswer === index && index === currentQuestion.correctIndex && styles.correctOption,
                selectedAnswer === index && index !== currentQuestion.correctIndex && styles.wrongOption,
                selectedAnswer !== null && index === currentQuestion.correctIndex && styles.correctOption,
              ]}
              onPress={() => handleAnswerSelect(index)}
              disabled={selectedAnswer !== null}
            >
              <Text style={[
                styles.optionText,
                selectedAnswer === index && index === currentQuestion.correctIndex && styles.correctText,
                selectedAnswer === index && index !== currentQuestion.correctIndex && styles.wrongText,
                selectedAnswer !== null && index === currentQuestion.correctIndex && styles.correctText,
              ]}>
                {option}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {showResult && (
          <Card style={styles.resultCard}>
            <Card.Content>
              {selectedAnswer === currentQuestion.correctIndex ? (
                <View style={styles.resultContent}>
                  <Text style={styles.resultEmoji}>✅</Text>
                  <Text style={styles.resultText}>Correct!</Text>
                </View>
              ) : (
                <View style={styles.resultContent}>
                  <Text style={styles.resultEmoji}>❌</Text>
                  <Text style={styles.resultText}>
                    Correct answer: {currentQuestion.correctAnswer}
                  </Text>
                </View>
              )}
              <Button
                mode="contained"
                onPress={nextQuestion}
                style={styles.nextButton}
              >
                {currentQuestionIndex < questions.length - 1 ? 'Next Question' : 'Finish Game'}
              </Button>
            </Card.Content>
          </Card>
        )}
      </View>
    );
  };

  const renderFinished = () => {
    const percentage = Math.round((score / questions.length) * 100);
    
    return (
      <View style={styles.centerContainer}>
        <Card style={styles.finishedCard}>
          <Card.Content style={styles.finishedContent}>
            <Text style={styles.finishedEmoji}>
              {percentage >= 90 ? '🏆' : percentage >= 70 ? '🎉' : percentage >= 50 ? '👍' : '�'}
            </Text>
            <Title style={styles.finishedTitle}>Game Complete!</Title>
            
            {isNewHighScore && (
              <Text style={styles.newHighScore}>🎊 NEW HIGH SCORE! 🎊</Text>
            )}
            
            <View style={styles.finalStats}>
              <Text style={styles.finalScore}>
                Score: {score} / {questions.length}
              </Text>
              <Text style={styles.finalPercentage}>
                {percentage}% Correct
              </Text>
            </View>

            <View style={styles.finishedButtons}>
              <Button
                mode="contained"
                onPress={resetGame}
                style={styles.playAgainButton}
              >
                Play Again
              </Button>
            </View>
          </Card.Content>
        </Card>
      </View>
    );
  };

  switch (gameState) {
    case 'loading':
      return <SafeAreaView style={styles.safeArea}>{renderLoading()}</SafeAreaView>;
    case 'playing':
      return <SafeAreaView style={styles.safeArea}>{renderGame()}</SafeAreaView>;
    case 'finished':
      return <SafeAreaView style={styles.safeArea}>{renderFinished()}</SafeAreaView>;
    default:
      return <SafeAreaView style={styles.safeArea}>{renderMenu()}</SafeAreaView>;
  }
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  container: {
    flex: 1,
  },
  content: {
    padding: 16,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    padding: 16,
  },
  
  // Menu styles
  headerCard: {
    marginBottom: 16,
    elevation: 3,
  },
  title: {
    textAlign: 'center',
    color: '#9C27B0',
    fontSize: 24,
  },
  description: {
    textAlign: 'center',
    color: '#666',
    marginTop: 8,
  },
  
  statsCard: {
    marginBottom: 16,
    elevation: 2,
  },
  statsTitle: {
    textAlign: 'center',
    color: '#FF9800',
    fontSize: 18,
    marginBottom: 12,
  },
  scoresContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  scoreItem: {
    alignItems: 'center',
  },
  scoreLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
  },
  scoreValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2196F3',
  },
  
  noFavoritesCard: {
    backgroundColor: '#FFF3E0',
    elevation: 2,
  },
  noFavoritesTitle: {
    textAlign: 'center',
    color: '#F57C00',
  },
  noFavoritesText: {
    textAlign: 'center',
    color: '#666',
    lineHeight: 22,
  },
  
  gameOptions: {
    gap: 12,
  },
  optionCard: {
    marginBottom: 16,
    elevation: 2,
  },
  optionTitle: {
    textAlign: 'center',
    color: '#4CAF50',
    fontSize: 18,
  },
  availableWords: {
    textAlign: 'center',
    color: '#666',
    fontStyle: 'italic',
  },
  
  gameButton: {
    marginVertical: 6,
    paddingVertical: 8,
  },
  gameButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  easyButton: {
    backgroundColor: '#4CAF50',
  },
  mediumButton: {
    backgroundColor: '#FF9800',
  },
  hardButton: {
    backgroundColor: '#F44336',
  },
  
  // Loading styles
  loadingCard: {
    elevation: 4,
  },
  loadingContent: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  loadingTitle: {
    marginTop: 16,
    color: '#9C27B0',
    textAlign: 'center',
  },
  loadingText: {
    textAlign: 'center',
    color: '#666',
    marginBottom: 20,
  },
  loadingBar: {
    width: '100%',
    height: 4,
  },
  
  // Game styles
  gameContainer: {
    flex: 1,
    padding: 16,
  },
  gameHeader: {
    marginBottom: 16,
    elevation: 2,
  },
  gameHeaderContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  questionCounter: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#666',
  },
  gameScore: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2196F3',
  },
  progressBar: {
    height: 6,
    borderRadius: 3,
  },
  
  questionCard: {
    marginBottom: 24,
    elevation: 4,
    backgroundColor: '#E8F5E8',
  },
  questionTitle: {
    textAlign: 'center',
    color: '#2E7D32',
    fontSize: 18,
    marginBottom: 16,
  },
  japaneseWord: {
    textAlign: 'center',
    fontSize: 36,
    fontWeight: 'bold',
    color: '#1565C0',
    marginBottom: 8,
  },
  reading: {
    textAlign: 'center',
    fontSize: 18,
    color: '#757575',
  },
  
  optionsContainer: {
    gap: 12,
    marginBottom: 20,
  },
  optionButton: {
    backgroundColor: 'white',
    padding: 16,
    borderRadius: 8,
    elevation: 2,
    borderWidth: 2,
    borderColor: '#E0E0E0',
  },
  correctOption: {
    backgroundColor: '#E8F5E8',
    borderColor: '#4CAF50',
  },
  wrongOption: {
    backgroundColor: '#FFEBEE',
    borderColor: '#F44336',
  },
  optionText: {
    textAlign: 'center',
    fontSize: 16,
    color: '#424242',
    fontWeight: '500',
  },
  correctText: {
    color: '#2E7D32',
    fontWeight: 'bold',
  },
  wrongText: {
    color: '#C62828',
    fontWeight: 'bold',
  },
  
  resultCard: {
    elevation: 4,
  },
  resultContent: {
    alignItems: 'center',
    marginBottom: 16,
  },
  resultEmoji: {
    fontSize: 32,
    marginBottom: 8,
  },
  resultText: {
    fontSize: 16,
    textAlign: 'center',
    color: '#424242',
    marginBottom: 16,
  },
  nextButton: {
    backgroundColor: '#9C27B0',
  },
  
  // Finished styles
  finishedCard: {
    elevation: 4,
  },
  finishedContent: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  finishedEmoji: {
    fontSize: 64,
    marginBottom: 16,
  },
  finishedTitle: {
    color: '#9C27B0',
    textAlign: 'center',
    fontSize: 24,
    marginBottom: 8,
  },
  newHighScore: {
    fontSize: 16,
    color: '#FF9800',
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 16,
  },
  finalStats: {
    alignItems: 'center',
    marginVertical: 20,
  },
  finalScore: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2196F3',
    marginBottom: 8,
  },
  finalPercentage: {
    fontSize: 18,
    color: '#666',
  },
  finishedButtons: {
    marginTop: 20,
    width: '100%',
  },
  playAgainButton: {
    backgroundColor: '#4CAF50',
    paddingVertical: 8,
  },
});
