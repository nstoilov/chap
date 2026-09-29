import React, { useState, useEffect, useCallback } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, Text } from 'react-native';
import { Title, Paragraph, Card, Button, ProgressBar, Menu } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';

import { jlptService, JLPT_LEVELS, JLPT_SECTIONS, JLPT_COUNTS } from '../services/jlptService';
import { generateJlptQuestions } from '../services/jlptApiService';
import { DEFAULT_MODEL } from '../config/models';
import { N4GrammarScreen } from './N4GrammarScreen';

const TEAL = '#00897B';
const TEAL_LIGHT = '#E0F2F1';

export const JlptScreen = () => {
  const [gameState, setGameState] = useState('menu'); // 'menu', 'loading', 'playing', 'finished'
  const [level, setLevel] = useState('N5');
  const [section, setSection] = useState('vocabulary');
  const [count, setCount] = useState(10);
  const [questions, setQuestions] = useState([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState(null);
  const [showResult, setShowResult] = useState(false);
  const [weakSummary, setWeakSummary] = useState([]);
  const [sessionResults, setSessionResults] = useState([]);
  const [error, setError] = useState('');
  const [menuVisible, setMenuVisible] = useState(false);
  const [showGrammar, setShowGrammar] = useState(false);

  useFocusEffect(
    useCallback(() => {
      loadSavedLevel();
    }, [section])
  );

  const loadSavedLevel = async () => {
    try {
      const savedLevel = await jlptService.getLevel();
      setLevel(savedLevel);
      const summary = await jlptService.getWeakSummary(savedLevel, section);
      setWeakSummary(summary);
    } catch (e) {
      console.error('Error loading JLPT saved level:', e);
    }
  };

  const handleLevelChange = async (newLevel) => {
    setLevel(newLevel);
    setMenuVisible(false);
    try {
      await jlptService.setLevel(newLevel);
      const summary = await jlptService.getWeakSummary(newLevel, section);
      setWeakSummary(summary);
    } catch (e) {
      console.error('Error saving JLPT level:', e);
    }
  };

  const handleSectionChange = (newSection) => {
    setSection(newSection);
    jlptService.getWeakSummary(level, newSection).then(setWeakSummary).catch(() => {});
  };

  const startGame = async () => {
    setGameState('loading');
    setError('');
    setQuestions([]);
    setCurrentQuestionIndex(0);
    setScore(0);
    setSelectedAnswer(null);
    setShowResult(false);
    setSessionResults([]);

    try {
      const difficulty = await jlptService.getDifficultyForPrompt(level, section);
      const result = await generateJlptQuestions(
        { level, section, count, difficulty, model: DEFAULT_MODEL },
        (chunk) => {
          // Optional: could stream partial UI here
        }
      );
      setQuestions(result.questions);
      setGameState('playing');
    } catch (err) {
      setError(err.message || 'Could not generate questions, try again.');
      setGameState('menu');
    }
  };

  const handleAnswerSelect = (answerIndex) => {
    if (selectedAnswer !== null) return;

    setSelectedAnswer(answerIndex);
    const currentQuestion = questions[currentQuestionIndex];
    const isCorrect = answerIndex === currentQuestion.correctIndex;

    if (isCorrect) {
      setScore(prev => prev + 1);
    }

    setSessionResults(prev => [
      ...prev,
      {
        question: currentQuestion,
        correct: isCorrect,
        chosenIndex: answerIndex,
      },
    ]);

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
    const durationMs = 0; // Not tracking per-session timer yet
    const wrongItems = sessionResults.filter(r => !r.correct);

    try {
      await jlptService.recordSession({
        level,
        section,
        count,
        score,
        durationMs,
      });
      if (wrongItems.length > 0) {
        await jlptService.recordWrongItems(level, section, wrongItems);
      }
    } catch (e) {
      console.error('Error saving JLPT session:', e);
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
    setSessionResults([]);
    setError('');
    loadSavedLevel();
  };

  const renderMenu = () => (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <View style={styles.content}>
        <Card style={styles.headerCard}>
          <Card.Content>
            <Title style={styles.title}>📚 勉強</Title>
            <Paragraph style={styles.description}>
              Practice JLPT questions for your chosen level and section.
            </Paragraph>
          </Card.Content>
        </Card>

        <Card style={styles.optionCard}>
          <Card.Content>
            <Title style={styles.optionTitle}>Level</Title>
            <Menu
              visible={menuVisible}
              onDismiss={() => setMenuVisible(false)}
              anchorPosition="bottom"
              anchor={
                <Button
                  onPress={() => setMenuVisible(true)}
                  mode="outlined"
                  textColor="#555"
                  icon={() => <Ionicons name="chevron-down" size={14} color="#555" />}
                  contentStyle={{ flexDirection: 'row-reverse' }}
                  style={styles.dropdownButton}
                >
                  {level}
                </Button>
              }
            >
              {JLPT_LEVELS.map(lvl => (
                <Menu.Item
                  key={lvl}
                  onPress={() => handleLevelChange(lvl)}
                  title={lvl}
                  trailingIcon={level === lvl ? 'check' : undefined}
                />
              ))}
            </Menu>

            <Title style={[styles.optionTitle, { marginTop: 16 }]}>Section</Title>
            <View style={styles.sectionRow}>
              {JLPT_SECTIONS.map(sec => (
                <TouchableOpacity
                  key={sec.id}
                  style={[
                    styles.sectionButton,
                    section === sec.id && styles.sectionButtonActive,
                  ]}
                  onPress={() => handleSectionChange(sec.id)}
                >
                  <Text
                    style={[
                      styles.sectionButtonText,
                      section === sec.id && styles.sectionButtonTextActive,
                    ]}
                  >
                    {sec.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Title style={[styles.optionTitle, { marginTop: 16 }]}>Questions</Title>
            <View style={styles.countRow}>
              {JLPT_COUNTS.map(c => (
                <TouchableOpacity
                  key={c}
                  style={[
                    styles.countButton,
                    count === c && styles.countButtonActive,
                  ]}
                  onPress={() => setCount(c)}
                >
                  <Text
                    style={[
                      styles.countButtonText,
                      count === c && styles.countButtonTextActive,
                    ]}
                  >
                    {c}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </Card.Content>
        </Card>

        {weakSummary.length > 0 && (
          <Card style={styles.weakCard}>
            <Card.Content>
              <Paragraph style={styles.weakTitle}>
                Focus areas from last sessions:
              </Paragraph>
              {weakSummary.map((w, i) => (
                <Text key={i} style={styles.weakItem}>
                  • {w.topic} (x{w.count})
                </Text>
              ))}
            </Card.Content>
          </Card>
        )}

        {error ? (
          <Card style={styles.errorCard}>
            <Card.Content>
              <Text style={styles.errorText}>{error}</Text>
            </Card.Content>
          </Card>
        ) : null}

        <Button
          mode="contained"
          onPress={startGame}
          style={styles.startButton}
          labelStyle={styles.startButtonText}
        >
          Start
        </Button>

        <Button
          mode="outlined"
          onPress={() => setShowGrammar(true)}
          style={styles.grammarButton}
          textColor={TEAL}
          icon={() => <Ionicons name="book-outline" size={20} color={TEAL} />}
        >
          N4 Grammar Phrases
        </Button>
      </View>
    </ScrollView>
  );

  const renderLoading = () => (
    <View style={styles.centerContainer}>
      <Card style={styles.loadingCard}>
        <Card.Content style={styles.loadingContent}>
          <Ionicons name="book" size={48} color={TEAL} />
          <Title style={styles.loadingTitle}>Preparing Questions...</Title>
          <Paragraph style={styles.loadingText}>
            Generating {count} {section} questions for {level}
          </Paragraph>
          <ProgressBar indeterminate color={TEAL} style={styles.loadingBar} />
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
            <ProgressBar progress={progress} color={TEAL} style={styles.progressBar} />
          </Card.Content>
        </Card>

        <ScrollView style={styles.gameScroll} showsVerticalScrollIndicator={false}>
          <Card style={styles.questionCard}>
            <Card.Content>
              {currentQuestion.passage ? (
                <View style={styles.passageBlock}>
                  <Text style={styles.passageText}>{currentQuestion.passage}</Text>
                </View>
              ) : null}
              <Text style={styles.questionPrompt}>{currentQuestion.prompt}</Text>
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
                <View style={styles.resultContent}>
                  <Text style={styles.resultEmoji}>
                    {selectedAnswer === currentQuestion.correctIndex ? '✅' : '❌'}
                  </Text>
                  <Text style={styles.resultText}>
                    {selectedAnswer === currentQuestion.correctIndex
                      ? 'Correct!'
                      : `Correct answer: ${currentQuestion.options[currentQuestion.correctIndex]}`}
                  </Text>
                  {currentQuestion.explanation ? (
                    <Text style={styles.explanationText}>{currentQuestion.explanation}</Text>
                  ) : null}
                </View>
                <Button
                  mode="contained"
                  onPress={nextQuestion}
                  style={styles.nextButton}
                >
                  {currentQuestionIndex < questions.length - 1 ? 'Next Question' : 'Finish'}
                </Button>
              </Card.Content>
            </Card>
          )}

          <Button
            mode="outlined"
            onPress={resetGame}
            style={styles.cancelButton}
            textColor="#999"
          >
            Cancel
          </Button>
        </ScrollView>
      </View>
    );
  };

  const renderFinished = () => {
    const percentage = questions.length > 0 ? Math.round((score / questions.length) * 100) : 0;
    const wrongAnswers = sessionResults.filter(r => !r.correct);

    return (
      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        <View style={styles.content}>
          <Card style={styles.finishedCard}>
            <Card.Content style={styles.finishedContent}>
              <Text style={styles.finishedEmoji}>
                {percentage >= 90 ? '🏆' : percentage >= 70 ? '🎉' : percentage >= 50 ? '👍' : '💪'}
              </Text>
              <Title style={styles.finishedTitle}>Session Complete!</Title>

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
                  labelStyle={styles.playAgainButtonText}
                >
                  Play Again
                </Button>
              </View>
            </Card.Content>
          </Card>

          {wrongAnswers.length > 0 && (
            <Card style={styles.reviewCard}>
              <Card.Content>
                <Title style={styles.reviewTitle}>Review Wrong Answers</Title>
                {wrongAnswers.map((r, i) => (
                  <View key={i} style={styles.reviewItem}>
                    <Text style={styles.reviewQuestion}>{i + 1}. {r.question.prompt}</Text>
                    <Text style={styles.reviewCorrect}>
                      Correct: {r.question.options[r.question.correctIndex]}
                    </Text>
                    <Text style={styles.reviewChosen}>
                      Your answer: {r.question.options[r.chosenIndex]}
                    </Text>
                    {r.question.explanation ? (
                      <Text style={styles.reviewExplanation}>{r.question.explanation}</Text>
                    ) : null}
                  </View>
                ))}
              </Card.Content>
            </Card>
          )}
        </View>
      </ScrollView>
    );
  };

  if (showGrammar) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <N4GrammarScreen onBack={() => setShowGrammar(false)} />
      </SafeAreaView>
    );
  }

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
    gap: 12,
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
    color: TEAL,
    fontSize: 24,
    fontFamily: 'System',
    fontWeight: '600',
    letterSpacing: -0.5,
  },
  description: {
    textAlign: 'center',
    color: '#666',
    marginTop: 8,
  },
  optionCard: {
    marginBottom: 16,
    elevation: 2,
  },
  optionTitle: {
    textAlign: 'center',
    color: TEAL,
    fontSize: 18,
    marginBottom: 12,
    fontFamily: 'System',
    fontWeight: '600',
    letterSpacing: -0.3,
  },
  dropdownButton: {
    alignSelf: 'center',
    minWidth: 120,
  },
  sectionRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
  },
  sectionButton: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  sectionButtonActive: {
    backgroundColor: TEAL_LIGHT,
    borderColor: TEAL,
  },
  sectionButtonText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  sectionButtonTextActive: {
    color: TEAL,
    fontWeight: 'bold',
  },
  countRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
  },
  countButton: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  countButtonActive: {
    backgroundColor: TEAL_LIGHT,
    borderColor: TEAL,
  },
  countButtonText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  countButtonTextActive: {
    color: TEAL,
    fontWeight: 'bold',
  },
  weakCard: {
    backgroundColor: '#FFF8E1',
    marginBottom: 12,
    elevation: 1,
  },
  weakTitle: {
    fontWeight: 'bold',
    color: '#F57C00',
    marginBottom: 6,
  },
  weakItem: {
    color: '#666',
    fontSize: 13,
    lineHeight: 20,
  },
  errorCard: {
    backgroundColor: '#FFEBEE',
    marginBottom: 12,
    elevation: 1,
  },
  errorText: {
    color: '#C62828',
    textAlign: 'center',
  },
  startButton: {
    backgroundColor: TEAL,
    paddingVertical: 8,
    marginTop: 4,
  },
  startButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  grammarButton: {
    borderColor: TEAL,
    marginTop: 12,
    paddingVertical: 6,
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
    color: TEAL,
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
  gameScroll: {
    flex: 1,
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
    color: TEAL,
  },
  progressBar: {
    height: 6,
    borderRadius: 3,
  },
  questionCard: {
    marginBottom: 24,
    elevation: 4,
    backgroundColor: '#fff',
  },
  passageBlock: {
    backgroundColor: '#FAFAFA',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
    borderLeftWidth: 3,
    borderLeftColor: TEAL,
  },
  passageText: {
    fontSize: 16,
    color: '#424242',
    lineHeight: 24,
  },
  questionPrompt: {
    fontSize: 16,
    color: '#212121',
    lineHeight: 22,
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
    marginBottom: 24,
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
    marginBottom: 8,
  },
  explanationText: {
    fontSize: 14,
    textAlign: 'center',
    color: '#666',
    fontStyle: 'italic',
    lineHeight: 20,
  },
  nextButton: {
    backgroundColor: TEAL,
  },
  cancelButton: {
    marginVertical: 24,
    borderColor: '#E0E0E0',
    alignSelf: 'center',
    minWidth: 120,
  },

  // Finished styles
  finishedCard: {
    elevation: 4,
    marginBottom: 16,
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
    color: TEAL,
    textAlign: 'center',
    fontSize: 24,
    marginBottom: 8,
    fontFamily: 'System',
    fontWeight: '600',
    letterSpacing: -0.5,
  },
  finalStats: {
    alignItems: 'center',
    marginVertical: 20,
  },
  finalScore: {
    fontSize: 24,
    fontWeight: 'bold',
    color: TEAL,
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
    backgroundColor: TEAL,
    paddingVertical: 8,
  },
  playAgainButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  reviewCard: {
    elevation: 2,
    marginBottom: 16,
  },
  reviewTitle: {
    color: TEAL,
    fontSize: 18,
    marginBottom: 12,
    fontFamily: 'System',
    fontWeight: '600',
  },
  reviewItem: {
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  reviewQuestion: {
    fontSize: 15,
    color: '#212121',
    marginBottom: 6,
  },
  reviewCorrect: {
    fontSize: 14,
    color: '#2E7D32',
  },
  reviewChosen: {
    fontSize: 14,
    color: '#C62828',
  },
  reviewExplanation: {
    fontSize: 13,
    color: '#666',
    fontStyle: 'italic',
    marginTop: 4,
  },
});
