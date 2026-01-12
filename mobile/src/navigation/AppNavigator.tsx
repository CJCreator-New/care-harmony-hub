import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import Icon from 'react-native-vector-icons/MaterialIcons';

import LoginScreen from '../screens/LoginScreen';
import DashboardScreen from '../screens/DashboardScreen';
import PatientsScreen from '../screens/PatientsScreen';
import TasksScreen from '../screens/TasksScreen';

const Stack = createStackNavigator();
const Tab = createBottomTabNavigator();

const TabNavigator = () => (
  <Tab.Navigator
    screenOptions={{
      tabBarActiveTintColor: '#3B82F6',
      tabBarInactiveTintColor: '#6B7280',
      headerShown: false
    }}
  >
    <Tab.Screen 
      name="Dashboard" 
      component={DashboardScreen}
      options={{
        tabBarIcon: ({ color, size }) => (
          <Icon name="dashboard" size={size} color={color} />
        )
      }}
    />
    <Tab.Screen 
      name="Patients" 
      component={PatientsScreen}
      options={{
        tabBarIcon: ({ color, size }) => (
          <Icon name="people" size={size} color={color} />
        )
      }}
    />
    <Tab.Screen 
      name="Tasks" 
      component={TasksScreen}
      options={{
        tabBarIcon: ({ color, size }) => (
          <Icon name="assignment" size={size} color={color} />
        )
      }}
    />
  </Tab.Navigator>
);

export const AppNavigator = () => {
  const isLoggedIn = true; // Replace with actual auth logic
  
  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {isLoggedIn ? (
          <Stack.Screen name="Main" component={TabNavigator} />
        ) : (
          <Stack.Screen name="Login" component={LoginScreen} />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
};