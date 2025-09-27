import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Dimensions } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import { Ionicons } from '@expo/vector-icons';

import { HomeScreen } from '../screens/HomeScreen';
import { FavoritesScreen } from '../screens/FavoritesScreen';
import { GameScreen } from '../screens/GameScreen';

const Tab = createBottomTabNavigator();
const Stack = createStackNavigator();

const getIconName = (routeName, focused) => {
  switch (routeName) {
    case 'Home':
      return focused ? 'home' : 'home-outline';
    case 'Favorites':
      return focused ? 'heart' : 'heart-outline';
    case 'Game':
      return focused ? 'game-controller' : 'game-controller-outline';
    default:
      return 'home';
  }
};

const SidebarItem = ({ name, isActive, onPress }) => (
  <TouchableOpacity 
    style={[styles.sidebarItem, isActive && styles.sidebarItemActive]} 
    onPress={onPress}
  >
    <Ionicons 
      name={getIconName(name, isActive)} 
      size={28} 
      color={isActive ? '#2196F3' : '#666'} 
    />
  </TouchableOpacity>
);

const Sidebar = ({ activeScreen, onScreenChange }) => (
  <View style={styles.sidebar}>
    <View style={styles.sidebarNav}>
      <SidebarItem 
        name="Home" 
        isActive={activeScreen === 'Home'}
        onPress={() => onScreenChange('Home')}
      />
      <SidebarItem 
        name="Favorites" 
        isActive={activeScreen === 'Favorites'}
        onPress={() => onScreenChange('Favorites')}
      />
      <SidebarItem 
        name="Game" 
        isActive={activeScreen === 'Game'}
        onPress={() => onScreenChange('Game')}
      />
    </View>
  </View>
);

const DesktopLayout = () => {
  const [activeScreen, setActiveScreen] = useState('Home');

  const renderScreen = () => {
    switch (activeScreen) {
      case 'Home':
        return <HomeScreen />;
      case 'Favorites':
        return <FavoritesScreen />;
      case 'Game':
        return <GameScreen />;
      default:
        return <HomeScreen />;
    }
  };

  return (
    <View style={styles.container}>
      <Sidebar activeScreen={activeScreen} onScreenChange={setActiveScreen} />
      <View style={styles.content}>
        {renderScreen()}
      </View>
    </View>
  );
};

const MobileNavigator = () => (
  <Tab.Navigator
    screenOptions={({ route }) => ({
      tabBarIcon: ({ focused, color, size }) => {
        const iconName = getIconName(route.name, focused);
        return <Ionicons name={iconName} size={size} color={color} />;
      },
      tabBarActiveTintColor: '#2196F3',
      tabBarInactiveTintColor: 'gray',
      tabBarShowLabel: false,
      headerShown: false,
    })}
  >
    <Tab.Screen name="Home" component={HomeScreen} />
    <Tab.Screen name="Favorites" component={FavoritesScreen} />
    <Tab.Screen name="Game" component={GameScreen} />
  </Tab.Navigator>
);

export const ResponsiveNavigation = () => {
  const [screenData, setScreenData] = useState(Dimensions.get('window'));

  useEffect(() => {
    const onChange = (result) => {
      setScreenData(result.window);
    };

    const subscription = Dimensions.addEventListener('change', onChange);
    return () => subscription?.remove();
  }, []);

  // Determine if we should use mobile layout
  const isMobile = screenData.width < 768 || screenData.height > screenData.width;

  return (
    <NavigationContainer>
      {isMobile ? <MobileNavigator /> : <DesktopLayout />}
    </NavigationContainer>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    flexDirection: 'row',
  },
  sidebar: {
    width: 80,
    backgroundColor: '#f8f9fa',
    borderRightWidth: 1,
    borderRightColor: '#e0e0e0',
  },
  sidebarNav: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 20,
  },
  sidebarItem: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 15,
    marginVertical: 10,
    borderRadius: 12,
    width: 50,
    height: 50,
  },
  sidebarItemActive: {
    backgroundColor: '#e3f2fd',
  },
  content: {
    flex: 1,
  },
});
