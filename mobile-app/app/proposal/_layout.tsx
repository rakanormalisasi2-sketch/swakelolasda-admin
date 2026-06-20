import React, { useEffect, useState } from 'react';
import { Tabs, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ActivityIndicator, View } from 'react-native';

export default function ProposalLayout() {
  const [isSurveyor, setIsSurveyor] = useState<boolean | null>(null);

  useEffect(() => {
    AsyncStorage.getItem('apk_session').then(sess => {
      if (sess) {
        const { role } = JSON.parse(sess);
        setIsSurveyor(role === 'survey_normalisasi' || role === 'survey_embung');
      } else {
        setIsSurveyor(false);
      }
    });
  }, []);

  if (isSurveyor === null) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f8fafc' }}>
        <ActivityIndicator size="large" color="#16a34a" />
      </View>
    );
  }

  return (
    <Tabs
      initialRouteName={isSurveyor ? 'survey' : 'list'}
      screenOptions={{ 
        headerShown: false,
        tabBarActiveTintColor: '#16a34a',
        tabBarInactiveTintColor: '#64748b',
        tabBarStyle: { paddingBottom: 5, height: 60 }
      }}
    >
      <Tabs.Screen
        name="list"
        options={{
          title: 'Proposal',
          href: isSurveyor ? null : '/proposal/list',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="list-outline" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="index"
        options={{
          title: 'Rekapitulasi',
          href: isSurveyor ? null : '/proposal',
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
      <Tabs.Screen
        name="form"
        options={{
          href: null,
        }}
      />
      <Tabs.Screen
        name="form-rekap"
        options={{
          href: null,
        }}
      />
      <Tabs.Screen
        name="logoBase64"
        options={{
          href: null,
        }}
      />
    </Tabs>
  );
}
