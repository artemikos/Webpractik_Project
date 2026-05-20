import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { ActivityIndicator, View } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';

import { useAuth } from '../context/AuthContext';
import LoginScreen from '../screens/LoginScreen';
import ReportsScreen from '../screens/ReportsScreen';
import UploadScreen from '../screens/UploadScreen';
import ReportDetailScreen from '../screens/ReportDetailScreen';
import CandidateDetailScreen from '../screens/CandidateDetailScreen';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

// src/navigation/index.jsx — заменить Tab.Navigator
const Tabs = () => (
  <Tab.Navigator
    screenOptions={{
      headerShown: false,
      tabBarActiveTintColor: '#667eea',
      tabBarInactiveTintColor: '#999',
      tabBarLabelStyle: {
        fontSize: 11,
        fontWeight: '600',
      },
      tabBarStyle: {
        height: 60,
        paddingBottom: 6,
        paddingTop: 6,
        backgroundColor: '#fff',
        borderTopWidth: 0,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -4 },
        shadowOpacity: 0.05,
        shadowRadius: 10,
        elevation: 10,
      },
    }}>
    <Tab.Screen
      name="Reports"
      component={ReportsScreen}
      options={{
        tabBarLabel: 'Вакансии',
        tabBarIcon: ({ color, size }) => (
          <MaterialIcons name="work-outline" size={22} color={color} />
        ),
      }}
    />
    <Tab.Screen
      name="Upload"
      component={UploadScreen}
      options={{
        tabBarLabel: 'Загрузка',
        tabBarIcon: ({ color, size }) => (
          <MaterialIcons name="cloud-upload" size={22} color={color} />
        ),
      }}
    />
  </Tab.Navigator>
);

export const AppNavigator = () => {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {!isAuthenticated ? (
          <Stack.Screen name="Login" component={LoginScreen} />
        ) : (
          <>
            <Stack.Screen name="Main" component={Tabs} />
            <Stack.Screen name="ReportDetail" component={ReportDetailScreen} />
            <Stack.Screen name="CandidateDetail" component={CandidateDetailScreen} />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
};