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

const SidebarItem = ({ name, isActive, onPress }) => {
  const getIconColor = (iconName, active) => {
    if (active && iconName === 'Home') {
      return '#F4A460'; // Shiba Inu yellow-orange color
    }
    if (active && iconName === 'Favorites') {
      return '#E91E63'; // Red for heart
    }
    if (active && iconName === 'Game') {
      return '#000000'; // Black for game controller
    }
    return active ? '#2196F3' : '#666';
  };

  return (
    <TouchableOpacity 
      style={[styles.sidebarItem, isActive && styles.sidebarItemActive]} 
      onPress={onPress}
    >
      <Ionicons 
        name={getIconName(name, isActive)} 
        size={28} 
        color={getIconColor(name, isActive)} 
      />
    </TouchableOpacity>
  );
};

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
        <View style={styles.contentWrapper}>
          {renderScreen()}
        </View>
      </View>
    </View>
  );
};

const MobileNavigator = () => (
  <Tab.Navigator
    screenOptions={({ route }) => ({
      tabBarIcon: ({ focused, color, size }) => {
        const iconName = getIconName(route.name, focused);
        let iconColor = color;
        
        // Use custom colors for each tab when focused
        if (focused && route.name === 'Home') {
          iconColor = '#F4A460'; // Shiba Inu yellow-orange
        } else if (focused && route.name === 'Favorites') {
          iconColor = '#E91E63'; // Red for heart
        } else if (focused && route.name === 'Game') {
          iconColor = '#000000'; // Black for game controller
        } else if (focused) {
          iconColor = '#2196F3';
        }
        
        return <Ionicons name={iconName} size={size} color={iconColor} />;
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
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  contentWrapper: {
    width: '33.33%',
    minWidth: 400,
    maxWidth: 600,
    flex: 1,
    backgroundColor: '#ffffff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 5,
  },
});
