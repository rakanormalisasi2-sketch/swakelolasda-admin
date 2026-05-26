import React from 'react';
import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

export default function ProposalLayout() {
  return (
    <Tabs screenOptions={{ 
      headerShown: false,
      tabBarActiveTintColor: '#16a34a',
      tabBarInactiveTintColor: '#64748b',
      tabBarStyle: { paddingBottom: 5, height: 60 }
    }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Rekapitulasi',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="document-text-outline" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="survey"
        options={{
          title: 'Survei',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="map-outline" size={size} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}
