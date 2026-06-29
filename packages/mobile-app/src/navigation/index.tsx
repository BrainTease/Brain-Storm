import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { DiscoveryScreen } from '../screens/DiscoveryScreen';
import { CourseDetailScreen } from '../screens/CourseDetailScreen';
import { ProfileScreen } from '../screens/ProfileScreen';

export type RootStackParamList = {
  Main: undefined;
  CourseDetail: { courseId: string };
};

export type MainTabParamList = {
  Discovery: undefined;
  Profile: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator<MainTabParamList>();

function MainTabs() {
  return (
    <Tab.Navigator>
      <Tab.Screen name="Discovery" component={DiscoveryScreen} />
      <Tab.Screen name="Profile" component={ProfileScreen} />
    </Tab.Navigator>
  );
}

export function Navigation() {
  return (
    <NavigationContainer>
      <Stack.Navigator>
        <Stack.Screen
          name="Main"
          component={MainTabs}
          options={{ headerShown: false }}
        />
        <Stack.Screen name="CourseDetail" component={CourseDetailScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
