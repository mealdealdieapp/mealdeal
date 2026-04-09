import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Text, View, StyleSheet } from 'react-native';
import { useAppStore } from '../store/useAppStore';

// Screens
import OnboardingScreen from '../screens/OnboardingScreen';
import DiscoveryScreen from '../screens/DiscoveryScreen';
import AngeboteScreen from '../screens/AngeboteScreen';
import WochenplanScreen from '../screens/WochenplanScreen';
import EinkaufslisteScreen from '../screens/EinkaufslisteScreen';
import ProfilScreen from '../screens/ProfilScreen';
import RecipeDetailScreen from '../screens/RecipeDetailScreen';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

// Tab Icon Component
function TabIcon({ label, focused }: { label: string; focused: boolean }) {
  const icons: Record<string, string> = {
    DiscoveryTab: '🍳',
    AngeboteTab: '🏷️',
    WochenplanTab: '📅',
    EinkaufslisteTab: '🛒',
    ProfilTab: '👤',
  };

  return (
    <View style={styles.iconContainer}>
      <Text style={[styles.icon, focused && styles.iconFocused]}>
        {icons[label] || '•'}
      </Text>
    </View>
  );
}

// Tab Navigator (die 5 Hauptseiten)
function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused }) => (
          <TabIcon label={route.name} focused={focused} />
        ),
        tabBarActiveTintColor: '#FF6B35',
        tabBarInactiveTintColor: '#9CA3AF',
        tabBarStyle: styles.tabBar,
        tabBarLabelStyle: styles.tabBarLabel,
        headerStyle: styles.header,
        headerTintColor: '#1A1A2E',
        headerTitleStyle: styles.headerTitle,
      })}
    >
      <Tab.Screen
        name="DiscoveryTab"
        component={DiscoveryScreen}
        options={{ title: 'Entdecken' }}
      />
      <Tab.Screen
        name="AngeboteTab"
        component={AngeboteScreen}
        options={{ title: 'Angebote' }}
      />
      <Tab.Screen
        name="WochenplanTab"
        component={WochenplanScreen}
        options={{ title: 'Wochenplan' }}
      />
      <Tab.Screen
        name="EinkaufslisteTab"
        component={EinkaufslisteScreen}
        options={{ title: 'Einkaufsliste' }}
      />
      <Tab.Screen
        name="ProfilTab"
        component={ProfilScreen}
        options={{ title: 'Profil' }}
      />
    </Tab.Navigator>
  );
}

// Root Navigator (Onboarding + Tabs + Detail-Screens)
export default function TabNavigator() {
  const onboardingComplete = useAppStore((s) => s.onboardingComplete);

  return (
    <Stack.Navigator>
      {!onboardingComplete ? (
        <Stack.Screen
          name="Onboarding"
          component={OnboardingScreen}
          options={{ headerShown: false }}
        />
      ) : (
        <>
          <Stack.Screen
            name="Main"
            component={MainTabs}
            options={{ headerShown: false }}
          />
          <Stack.Group screenOptions={{ presentation: 'modal' }}>
            <Stack.Screen
              name="RecipeDetail"
              component={RecipeDetailScreen}
              options={{
                title: 'Rezept',
                headerStyle: styles.header,
                headerTintColor: '#1A1A2E',
                headerTitleStyle: styles.headerTitle,
              }}
            />
          </Stack.Group>
        </>
      )}
    </Stack.Navigator>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: '#FFFFFF',
    borderTopColor: '#E5E7EB',
    borderTopWidth: 1,
    paddingBottom: 5,
    height: 60,
  },
  tabBarLabel: {
    fontSize: 11,
    fontWeight: '600',
  },
  iconContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
  },
  icon: {
    fontSize: 22,
    opacity: 0.6,
  },
  iconFocused: {
    opacity: 1,
  },
  header: {
    backgroundColor: '#FFFFFF',
    elevation: 0,
    shadowOpacity: 0,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  headerTitle: {
    fontWeight: '700',
    fontSize: 18,
    color: '#1A1A2E',
  },
});
