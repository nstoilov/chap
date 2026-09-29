import React, { useState, useEffect, useCallback } from 'react';
import { View, ScrollView, StyleSheet, TouchableOpacity, Text } from 'react-native';
import { Title, Card, Button, ProgressBar } from 'react-native-paper';
import { Ionicons } from '@expo/vector-icons';

import grammarData from '../data/n4GrammarPhrases';
import { grammarService } from '../services/grammarService';

const TEAL = '#00897B';

const shuffle = (array) => {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
};

const buildQuestions = (hiddenIds = []) => {
  const phrases = grammarData
    .map((p, i) => ({ ...p, id: i }))
    .filter((p) => !hiddenIds.includes(p.id));
  return shuffle(phrases).map((phrase) => {
    const wrongPool = shuffle(phrases.filter((p) => p.id !== phrase.id)).slice(0, 3);
    const options = shuffle([phrase, ...wrongPool]).map((o) => ({
      id: o.id,
      meaning: o.meaning,
      phrase: o.phrase,
    }));
    const correctIndex = options.findIndex((o) => o.id === phrase.id);
    return {
      id: phrase.id,
      phrase: phrase.phrase,
      example: phrase.example,
      options,
      correctIndex,
    };
  });
};

export const N4GrammarScreen = ({ onBack }) => {
  const [gameState, setGameState] = useState('playing');
  const [hiddenIds, setHiddenIds] = useState([]);
  const [questions, setQuestions] = useState([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState(null);
  const [showResult, setShowResult] = useState(false);

  useEffect(() => {
    grammarService.getHiddenIds().then((ids) => {
      setHiddenIds(ids);
      setQuestions(buildQuestions(ids));
    });
  }, []);

  const handleAnswerSelect = (answerIndex) => {
    if (selectedAnswer !== null) return;
    setSelectedAnswer(answerIndex);
    if (answerIndex === questions[currentQuestionIndex].correctIndex) {
      setScore((prev) => prev + 1);
    }
    setShowResult(true);
  };

  const advance = (newQuestions, fromIndex) => {
    if (fromIndex < newQuestions.length) {
      setCurrentQuestionIndex(fromIndex);
    } else if (newQuestions.length > 0) {
      setCurrentQuestionIndex(0);
    } else {
      setGameState('finished');
    }
    setSelectedAnswer(null);
    setShowResult(false);
  };

  const nextQuestion = () => {
    const nextIndex = currentQuestionIndex + 1;
    if (nextIndex < questions.length) {
      setCurrentQuestionIndex(nextIndex);
    } else {
      setGameState('finished');
    }
    setSelectedAnswer(null);
    setShowResult(false);
  };

  const handleRemoveAndContinue = useCallback(() => {
    const current = questions[currentQuestionIndex];
    if (!current) return;
    grammarService.hidePhrase(current.id);
    const newQuestions = questions.filter((_, i) => i !== currentQuestionIndex);
    setQuestions(newQuestions);
    setHiddenIds((prev) => [...prev, current.id]);
    advance(newQuestions, currentQuestionIndex);
  }, [questions, currentQuestionIndex]);

  const resetGame = useCallback(() => {
    setQuestions(buildQuestions(hiddenIds));
    setCurrentQuestionIndex(0);
    setScore(0);
    setSelectedAnswer(null);
    setShowResult(false);
    setGameState('playing');
  }, [hiddenIds]);

  const handleResetHidden = useCallback(async () => {
    await grammarService.clearHidden();
    setHiddenIds([]);
    const fresh = buildQuestions();
    setQuestions(fresh);
    setCurrentQuestionIndex(0);
    setScore(0);
    setSelectedAnswer(null);
    setShowResult(false);
    setGameState('playing');
  }, []);

  const renderGame = () => {
    const currentQuestion = questions[currentQuestionIndex];
    if (!currentQuestion) {
      return (
        <View style={styles.centerContainer}>
          <Card style={styles.finishedCard}>
            <Card.Content style={styles.finishedContent}>
              <Text style={styles.finishedEmoji}>{'\uD83C\uDF89'}</Text>
              <Title style={styles.finishedTitle}>All Phrases Done!</Title>
              <View style={styles.finishedButtons}>
                <Button
                  mode="contained"
                  onPress={handleResetHidden}
                  style={styles.playAgainButton}
                >
                  Reset Hidden
                </Button>
                <Button
                  mode="outlined"
                  onPress={onBack}
                  style={styles.backMenuButton}
                  textColor={TEAL}
                >
                  Back to Menu
                </Button>
              </View>
            </Card.Content>
          </Card>
        </View>
      );
    }
    const progress = (currentQuestionIndex + 1) / questions.length;

    return (
      <View style={styles.gameContainer}>
        <Card style={styles.gameHeader}>
          <Card.Content>
            <View style={styles.gameHeaderContent}>
              <TouchableOpacity onPress={onBack} style={styles.backButton}>
                <Ionicons name="arrow-back" size={22} color={TEAL} />
                <Text style={styles.backText}>Back</Text>
              </TouchableOpacity>
              <Text style={styles.questionCounter}>
                {currentQuestionIndex + 1} / {questions.length}{'  '}<Text style={styles.gameScore}>Score: {score}</Text>
              </Text>
              <TouchableOpacity onPress={handleResetHidden} style={styles.resetButton}>
                <Ionicons name="refresh" size={20} color="#666" />
                <Text style={styles.resetText}>Reset</Text>
              </TouchableOpacity>
            </View>
            <ProgressBar progress={progress} color={TEAL} style={styles.progressBar} />
          </Card.Content>
        </Card>

        <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
          <Card style={styles.questionCard}>
            <Card.Content style={styles.questionCardContent}>
              <Text style={styles.questionPrompt}>In the sentence:</Text>
              <Text style={styles.exampleInline}>{currentQuestion.example}</Text>
              <Text style={styles.questionPrompt}>what does</Text>
              <Text style={styles.phraseInline}>{currentQuestion.phrase}</Text>
              <Text style={styles.questionPrompt}>mean?</Text>
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
                <Text style={styles.optionText}>
                  {option.meaning}
                </Text>
                {selectedAnswer !== null && (
                  <Text style={styles.optionPhrase}>{option.phrase}</Text>
                )}
                {selectedAnswer !== null && (index === currentQuestion.correctIndex || selectedAnswer === index) && (
                  <View style={styles.optionMark}>
                    {index === currentQuestion.correctIndex ? (
                      <View style={styles.optionMarkCircle} />
                    ) : (
                      <Ionicons name="close" size={16} color="#F44336" />
                    )}
                  </View>
                )}
              </TouchableOpacity>
            ))}
          </View>

          {showResult && (
            <Card style={styles.resultCard}>
              <Card.Content>
                <View style={styles.resultButtons}>
                  <Button
                    mode="contained"
                    onPress={nextQuestion}
                    style={styles.nextButton}
                  >
                    {currentQuestionIndex < questions.length - 1 ? 'Next Question' : 'Finish'}
                  </Button>
                  <Button
                    mode="outlined"
                    onPress={handleRemoveAndContinue}
                    style={styles.removeButton}
                    textColor={TEAL}
                  >
                    Remove & Next
                  </Button>
                </View>
              </Card.Content>
            </Card>
          )}

          <View style={{ height: 40 }} />
        </ScrollView>
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
              {percentage >= 90 ? '🏆' : percentage >= 70 ? '🎉' : percentage >= 50 ? '👍' : '📚'}
            </Text>
            <Title style={styles.finishedTitle}>All Phrases Done!</Title>

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
              <Button
                mode="outlined"
                onPress={onBack}
                style={styles.backMenuButton}
                textColor={TEAL}
              >
                Back to Menu
              </Button>
            </View>
          </Card.Content>
        </Card>
      </View>
    );
  };

  switch (gameState) {
    case 'finished':
      return <View style={styles.safeArea}>{renderFinished()}</View>;
    default:
      return <View style={styles.safeArea}>{renderGame()}</View>;
  }
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
  },

  // Game styles
  gameContainer: {
    flex: 1,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  scroll: {
    flex: 1,
  },
  gameHeader: {
    marginBottom: 8,
    elevation: 2,
  },
  gameHeaderContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  backText: {
    color: TEAL,
    fontSize: 15,
    fontWeight: '600',
  },
  questionCounter: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#666',
  },
  gameScore: {
    fontSize: 16,
    fontWeight: 'bold',
    color: TEAL,
  },
  progressBar: {
    height: 6,
    borderRadius: 3,
  },

  questionCard: {
    marginBottom: 12,
    elevation: 4,
    backgroundColor: '#E0F2F1',
  },
  questionCardContent: {
    paddingVertical: 8,
  },
  questionPrompt: {
    fontSize: 17,
    lineHeight: 26,
    color: '#424242',
    textAlign: 'center',
  },
  exampleInline: {
    fontSize: 24,
    color: TEAL,
    marginVertical: 4,
    textAlign: 'center',
  },
  phraseInline: {
    fontSize: 24,
    color: TEAL,
    marginVertical: 4,
    textAlign: 'center',
  },

  optionsContainer: {
    gap: 6,
    marginBottom: 10,
  },
  optionButton: {
    backgroundColor: 'white',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    elevation: 2,
    borderWidth: 2,
    borderColor: '#E0E0E0',
  },
  correctOption: {
    borderColor: '#4CAF50',
  },
  wrongOption: {
    borderColor: '#F44336',
  },
  optionText: {
    textAlign: 'center',
    fontSize: 16,
    color: '#424242',
    fontWeight: '500',
  },
  optionPhrase: {
    textAlign: 'center',
    fontSize: 13,
    color: '#888',
    marginTop: 2,
  },
  optionMark: {
    position: 'absolute',
    top: 6,
    right: 6,
  },
  optionMarkCircle: {
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#4CAF50',
  },

  resultCard: {
    elevation: 4,
  },
  nextButton: {
    backgroundColor: TEAL,
    flex: 1,
  },
  resultButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  removeButton: {
    borderColor: TEAL,
    flex: 1,
  },
  resetButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  resetText: {
    color: '#666',
    fontSize: 14,
  },

  // Finished styles
  finishedCard: {
    elevation: 4,
  },
  finishedContent: {
    alignItems: 'center',
    paddingVertical: 10,
  },
  finishedEmoji: {
    fontSize: 64,
    marginBottom: 8,
  },
  finishedTitle: {
    color: TEAL,
    textAlign: 'center',
    fontSize: 24,
    marginBottom: 4,
    fontFamily: 'System',
    fontWeight: '600',
    letterSpacing: -0.5,
  },
  finalStats: {
    alignItems: 'center',
    marginVertical: 10,
  },
  finalScore: {
    fontSize: 24,
    fontWeight: 'bold',
    color: TEAL,
    marginBottom: 4,
  },
  finalPercentage: {
    fontSize: 18,
    color: '#666',
  },
  finishedButtons: {
    marginTop: 10,
    width: '100%',
    gap: 4,
  },
  playAgainButton: {
    backgroundColor: TEAL,
    paddingVertical: 4,
  },
  backMenuButton: {
    borderColor: TEAL,
    paddingVertical: 3,
  },
});
