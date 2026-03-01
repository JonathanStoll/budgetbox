import { useState } from 'react';
import { Alert, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { signOut } from 'firebase/auth';
import { Ionicons } from '@expo/vector-icons';

import { auth } from '@/firebaseconfig';
import { AppButton } from '@/components/general/app-button';
import { BottomNavBar, type NavTab } from '@/components/general/bottom-nav-bar';
import { useLanguage, type Language } from '@/context/language-context';

export default function SettingsScreen() {
  const [activeTab] = useState('settings');
  const { lang, language, setLanguage } = useLanguage();

  const tabs: NavTab[] = [
    { key: 'income', label: lang.nav.income, icon: 'arrow-down-outline' },
    { key: 'expenses', label: lang.nav.expenses, icon: 'arrow-up-outline' },
    { key: 'home', label: lang.nav.home, icon: 'home' },
    { key: 'preview', label: lang.nav.preview, icon: 'trending-up-outline' },
    { key: 'settings', label: lang.nav.settings, icon: 'settings-outline' },
  ];

  function handleTabPress(key: string) {
    if (key === 'settings') return;
    if (key === 'home') { router.replace('/hello'); return; }
    if (key === 'expenses') { router.replace('/expenses'); return; }
    if (key === 'income') { router.replace('/income'); return; }
    if (key === 'preview') { router.replace('/preview'); return; }
  }

  function handleLogout() {
    Alert.alert(lang.settings.logOut, lang.settings.logOutConfirm, [
      { text: lang.common.cancel, style: 'cancel' },
      {
        text: lang.settings.logOut,
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
        <Text style={styles.title}>{lang.settings.title}</Text>
      </View>

      <View style={styles.content}>
        {/* Account info */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{lang.settings.account}</Text>
          <View style={styles.infoRow}>
            <Ionicons name="mail-outline" size={20} color="#6b7280" />
            <Text style={styles.infoText}>
              {auth.currentUser?.email ?? lang.common.notSignedIn}
            </Text>
          </View>
        </View>

        {/* Language selector */}
        <View style={[styles.section, { marginTop: 24 }]}>
          <Text style={styles.sectionTitle}>{lang.settings.language}</Text>
          <View style={styles.languageRow}>
            {(['en', 'es'] as Language[]).map((l) => (
              <TouchableOpacity
                key={l}
                style={[styles.langBtn, language === l && styles.langBtnActive]}
                onPress={() => setLanguage(l)}
                activeOpacity={0.7}
              >
                <Text style={[styles.langBtnText, language === l && styles.langBtnTextActive]}>
                  {l === 'en' ? lang.settings.english : lang.settings.spanish}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Spacer pushes logout to bottom */}
        <View style={styles.spacer} />

        {/* Logout */}
        <AppButton
          title={lang.settings.logOut}
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
  languageRow: {
    flexDirection: 'row',
    gap: 12,
  },
  langBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: '#e5e7eb',
    alignItems: 'center',
    backgroundColor: '#f9fafb',
  },
  langBtnActive: {
    borderColor: '#0066ff',
    backgroundColor: '#eff6ff',
  },
  langBtnText: {
    fontSize: 15,
    fontWeight: '500',
    color: '#6b7280',
  },
  langBtnTextActive: {
    color: '#0066ff',
    fontWeight: '600',
  },
  spacer: {
    flex: 1,
  },
  logoutButton: {
    borderColor: '#dc2626',
    backgroundColor: '#dc2626',
  },
});
