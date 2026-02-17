import { useState } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { signOut } from 'firebase/auth';
import { Ionicons } from '@expo/vector-icons';

import { auth } from '@/firebaseconfig';
import { AppButton } from '@/components/general/app-button';
import { BottomNavBar, type NavTab } from '@/components/general/bottom-nav-bar';

const tabs: NavTab[] = [
  { key: 'income', label: 'Income', icon: 'arrow-down-outline' },
  { key: 'expenses', label: 'Expenses', icon: 'arrow-up-outline' },
  { key: 'home', label: 'Home', icon: 'home' },
  { key: 'preview', label: 'Preview', icon: 'trending-up-outline' },
  { key: 'settings', label: 'Settings', icon: 'settings-outline' },
];

export default function SettingsScreen() {
  const [activeTab] = useState('settings');

  function handleTabPress(key: string) {
    if (key === 'expenses') {
      router.push('/expenses');
      return;
    }
    if (key !== 'settings') {
      router.back();
    }
  }

  function handleLogout() {
    Alert.alert('Log Out', 'Are you sure you want to log out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Log Out',
        style: 'destructive',
        onPress: async () => {
          try {
            await signOut(auth);
          } catch (_) {
            // sign out locally even if Firebase call fails
          }
          router.replace('/login');
        },
      },
    ]);
  }

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Settings</Text>
      </View>

      <View style={styles.content}>
        {/* Account info */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Account</Text>
          <View style={styles.infoRow}>
            <Ionicons name="mail-outline" size={20} color="#6b7280" />
            <Text style={styles.infoText}>
              {auth.currentUser?.email ?? 'Not signed in'}
            </Text>
          </View>
        </View>

        {/* Spacer pushes logout to bottom */}
        <View style={styles.spacer} />

        {/* Logout */}
        <AppButton
          title="Log Out"
          variant="primary"
          style={styles.logoutButton}
          onPress={handleLogout}
        />
      </View>

      {/* Bottom Nav */}
      <BottomNavBar tabs={tabs} activeTab={activeTab} onTabPress={handleTabPress} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    paddingBottom: 16,
    paddingHorizontal: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1f2937',
    letterSpacing: -0.5,
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 24,
    paddingBottom: 16,
  },
  section: {
    gap: 12,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6b7280',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#f9fafb',
    padding: 16,
    borderRadius: 12,
  },
  infoText: {
    fontSize: 16,
    color: '#1f2937',
  },
  spacer: {
    flex: 1,
  },
  logoutButton: {
    borderColor: '#dc2626',
    backgroundColor: '#dc2626',
  },
});
