import { useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { EmailAuthProvider, reauthenticateWithCredential, signOut } from 'firebase/auth';
import { collection, deleteDoc, doc, getDocs, query, where } from 'firebase/firestore';
import { Ionicons } from '@expo/vector-icons';

import { auth, db } from '@/firebaseconfig';
import { AppButton } from '@/components/general/app-button';
import { AppInput } from '@/components/general/app-input';
import { BottomNavBar, type NavTab } from '@/components/general/bottom-nav-bar';
import { useLanguage, type Language } from '@/context/language-context';

type DangerAction = 'expenses' | 'income' | 'budget';

export default function SettingsScreen() {
  const [activeTab] = useState('settings');
  const { lang, language, setLanguage } = useLanguage();

  const [pendingAction, setPendingAction] = useState<DangerAction | null>(null);
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [passwordError, setPasswordError] = useState('');
  const [deleting, setDeleting] = useState(false);

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
          try { await signOut(auth); } catch (_) {}
          router.replace('/login');
        },
      },
    ]);
  }

  function requestAction(action: DangerAction) {
    const titles: Record<DangerAction, string> = {
      expenses: lang.settings.deleteAllExpenses,
      income: lang.settings.deleteAllIncome,
      budget: lang.settings.clearBudget,
    };
    const messages: Record<DangerAction, string> = {
      expenses: lang.settings.deleteAllExpensesMsg,
      income: lang.settings.deleteAllIncomeMsg,
      budget: lang.settings.clearBudgetMsg,
    };
    Alert.alert(titles[action], messages[action], [
      { text: lang.common.cancel, style: 'cancel' },
      {
        text: lang.settings.deleteBtn,
        style: 'destructive',
        onPress: () => {
          setPassword('');
          setPasswordError('');
          setShowPassword(false);
          setPendingAction(action);
        },
      },
    ]);
  }

  async function handleConfirmDelete() {
    const user = auth.currentUser;
    if (!user || !user.email) return;

    setDeleting(true);
    setPasswordError('');

    // Step 1: re-authenticate
    try {
      const credential = EmailAuthProvider.credential(user.email, password);
      await reauthenticateWithCredential(user, credential);
    } catch {
      setPasswordError(lang.settings.wrongPassword);
      setDeleting(false);
      return;
    }

    // Step 2: delete
    try {
      const uid = user.uid;
      if (pendingAction === 'expenses') {
        const snap = await getDocs(query(collection(db, 'expenses'), where('userId', '==', uid)));
        await Promise.all(snap.docs.map((d) => deleteDoc(doc(db, 'expenses', d.id))));
      } else if (pendingAction === 'income') {
        const snap = await getDocs(query(collection(db, 'income'), where('userId', '==', uid)));
        await Promise.all(snap.docs.map((d) => deleteDoc(doc(db, 'income', d.id))));
      } else if (pendingAction === 'budget') {
        const now = new Date();
        const snap = await getDocs(
          query(
            collection(db, 'budgets'),
            where('userId', '==', uid),
            where('month', '==', now.getMonth() + 1),
            where('year', '==', now.getFullYear()),
          ),
        );
        await Promise.all(snap.docs.map((d) => deleteDoc(doc(db, 'budgets', d.id))));
      }

      setPendingAction(null);
      Alert.alert(lang.common.ok, lang.settings.deletedSuccessfully);
    } catch {
      setPasswordError(lang.settings.deleteFailed);
    } finally {
      setDeleting(false);
    }
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

        {/* Data management */}
        <View style={[styles.section, { marginTop: 24 }]}>
          <Text style={styles.sectionTitle}>{lang.settings.dangerZone}</Text>
          <View style={styles.dangerCard}>
            <TouchableOpacity
              style={styles.dangerRow}
              onPress={() => requestAction('expenses')}
              activeOpacity={0.7}
            >
              <Ionicons name="trash-outline" size={20} color="#dc2626" />
              <Text style={styles.dangerText}>{lang.settings.deleteAllExpenses}</Text>
              <Ionicons name="chevron-forward" size={16} color="#dc2626" />
            </TouchableOpacity>

            <View style={styles.dangerDivider} />

            <TouchableOpacity
              style={styles.dangerRow}
              onPress={() => requestAction('income')}
              activeOpacity={0.7}
            >
              <Ionicons name="trash-outline" size={20} color="#dc2626" />
              <Text style={styles.dangerText}>{lang.settings.deleteAllIncome}</Text>
              <Ionicons name="chevron-forward" size={16} color="#dc2626" />
            </TouchableOpacity>

            <View style={styles.dangerDivider} />

            <TouchableOpacity
              style={styles.dangerRow}
              onPress={() => requestAction('budget')}
              activeOpacity={0.7}
            >
              <Ionicons name="refresh-outline" size={20} color="#dc2626" />
              <Text style={styles.dangerText}>{lang.settings.clearBudget}</Text>
              <Ionicons name="chevron-forward" size={16} color="#dc2626" />
            </TouchableOpacity>
          </View>
        </View>

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

      {/* Password confirmation modal */}
      <Modal
        visible={pendingAction !== null}
        transparent
        animationType="fade"
        onRequestClose={() => !deleting && setPendingAction(null)}
      >
        <KeyboardAvoidingView
          style={styles.modalBackdrop}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Ionicons name="lock-closed-outline" size={24} color="#dc2626" />
              <Text style={styles.modalTitle}>{lang.settings.deleteBtn}</Text>
            </View>

            <Text style={styles.modalSubtitle}>{lang.settings.enterPasswordToConfirm}</Text>

            <AppInput
              icon="lock-closed-outline"
              rightIcon={showPassword ? 'eye-off-outline' : 'eye-outline'}
              onRightIconPress={() => setShowPassword((v) => !v)}
              placeholder={lang.settings.passwordPlaceholder}
              secureTextEntry={!showPassword}
              value={password}
              onChangeText={(t) => { setPassword(t); setPasswordError(''); }}
              autoCapitalize="none"
              autoCorrect={false}
              editable={!deleting}
            />

            {passwordError ? (
              <Text style={styles.errorText}>{passwordError}</Text>
            ) : null}

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={() => setPendingAction(null)}
                disabled={deleting}
                activeOpacity={0.7}
              >
                <Text style={styles.cancelBtnText}>{lang.common.cancel}</Text>
              </TouchableOpacity>

              <AppButton
                title={deleting ? `${lang.settings.deleteBtn}...` : lang.settings.deleteBtn}
                variant="primary"
                style={[styles.confirmBtn, { opacity: deleting ? 0.6 : 1 }]}
                onPress={handleConfirmDelete}
                disabled={deleting}
              />
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
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
  dangerCard: {
    borderWidth: 1,
    borderColor: '#fecaca',
    borderRadius: 12,
    backgroundColor: '#fff5f5',
    overflow: 'hidden',
  },
  dangerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  dangerText: {
    flex: 1,
    fontSize: 15,
    fontWeight: '500',
    color: '#dc2626',
  },
  dangerDivider: {
    height: 1,
    backgroundColor: '#fecaca',
    marginHorizontal: 16,
  },
  spacer: {
    flex: 1,
  },
  logoutButton: {
    borderColor: '#dc2626',
    backgroundColor: '#dc2626',
  },
  // Modal
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  modalCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 24,
    gap: 16,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#dc2626',
    letterSpacing: -0.5,
  },
  modalSubtitle: {
    fontSize: 14,
    color: '#6b7280',
    lineHeight: 20,
  },
  errorText: {
    fontSize: 13,
    color: '#dc2626',
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 4,
  },
  cancelBtn: {
    flex: 1,
    height: 48,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f9fafb',
  },
  cancelBtnText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#374151',
  },
  confirmBtn: {
    flex: 1,
    backgroundColor: '#dc2626',
  },
});
