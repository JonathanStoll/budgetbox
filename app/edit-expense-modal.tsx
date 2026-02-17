import { useEffect, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { deleteDoc, doc, getDoc, updateDoc } from 'firebase/firestore';

import { db } from '@/firebaseconfig';
import { AppInput } from '@/components/general/app-input';
import { AppButton } from '@/components/general/app-button';

const ICON_OPTIONS: { name: keyof typeof Ionicons.glyphMap; color: string }[] = [
  { name: 'restaurant', color: '#ffedd5' },
  { name: 'car', color: '#dbeafe' },
  { name: 'flash', color: '#fef9c3' },
  { name: 'home', color: '#f3e8ff' },
  { name: 'fitness', color: '#dcfce7' },
  { name: 'speedometer', color: '#fee2e2' },
  { name: 'wifi', color: '#e0e7ff' },
  { name: 'cart', color: '#fce7f3' },
  { name: 'medical', color: '#ccfbf1' },
  { name: 'school', color: '#fef3c7' },
  { name: 'airplane', color: '#dbeafe' },
];

export default function EditExpenseModal() {
  const { id } = useLocalSearchParams<{ id: string }>();

  const [name, setName] = useState('');
  const [amount, setAmount] = useState('');
  const [selectedIcon, setSelectedIcon] = useState(0);
  const [isPaymentPlan, setIsPaymentPlan] = useState(false);
  const [totalPayments, setTotalPayments] = useState('');
  const [currentPayment, setCurrentPayment] = useState('');
  const [active, setActive] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!id) return;

    async function fetchExpense() {
      const snap = await getDoc(doc(db, 'expenses', id!));
      if (!snap.exists()) {
        Alert.alert('Error', 'Expense not found.');
        router.back();
        return;
      }

      const d = snap.data();
      setName(d.title ?? '');
      setAmount(String(d.amount ?? ''));

      const iconIdx = ICON_OPTIONS.findIndex((o) => o.name === d.icon);
      setSelectedIcon(iconIdx >= 0 ? iconIdx : 0);

      setIsPaymentPlan(d.isPaymentPlan ?? false);
      setTotalPayments(d.totalPayments != null ? String(d.totalPayments) : '');
      setCurrentPayment(d.currentPayment != null ? String(d.currentPayment) : '');
      setActive(d.active ?? true);
      setLoaded(true);
    }

    fetchExpense();
  }, [id]);

  async function handleSave() {
    const trimmedName = name.trim();
    const parsedAmount = parseFloat(amount);

    if (!trimmedName) {
      Alert.alert('Validation', 'Please enter an expense name.');
      return;
    }
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      Alert.alert('Validation', 'Please enter a valid amount.');
      return;
    }

    setSaving(true);
    try {
      const icon = ICON_OPTIONS[selectedIcon];
      await updateDoc(doc(db, 'expenses', id!), {
        title: trimmedName,
        icon: icon.name,
        iconBgColor: icon.color,
        amount: parsedAmount,
        active,
        isPaymentPlan,
        ...(isPaymentPlan
          ? {
              totalPayments: parseInt(totalPayments, 10) || 0,
              currentPayment: parseInt(currentPayment, 10) || 0,
            }
          : {
              totalPayments: null,
              currentPayment: null,
            }),
      });
      router.back();
    } catch {
      Alert.alert('Error', 'Failed to save changes. Please try again.');
    } finally {
      setSaving(false);
    }
  }

  function handleDelete() {
    Alert.alert(
      'Delete Expense',
      'Are you sure you want to delete this expense? This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            setDeleting(true);
            try {
              await deleteDoc(doc(db, 'expenses', id!));
              router.back();
            } catch {
              Alert.alert('Error', 'Failed to delete expense.');
              setDeleting(false);
            }
          },
        },
      ],
    );
  }

  if (!loaded) {
    return (
      <SafeAreaView style={styles.root} edges={['top']}>
        <View style={styles.header}>
          <Text style={styles.title}>Edit Expense</Text>
          <TouchableOpacity onPress={() => router.back()}>
            <Ionicons name="close" size={24} color="#374151" />
          </TouchableOpacity>
        </View>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Loading...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Edit Expense</Text>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="close" size={24} color="#374151" />
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.form}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Name */}
          <View style={styles.field}>
            <Text style={styles.label}>Name</Text>
            <AppInput
              placeholder="e.g. Grocery Shopping"
              value={name}
              onChangeText={setName}
            />
          </View>

          {/* Amount */}
          <View style={styles.field}>
            <Text style={styles.label}>Amount</Text>
            <AppInput
              placeholder="0.00"
              value={amount}
              onChangeText={setAmount}
              keyboardType="numeric"
            />
          </View>

          {/* Icon Picker */}
          <View style={styles.field}>
            <Text style={styles.label}>Icon</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.iconRow}
            >
              {ICON_OPTIONS.map((opt, i) => (
                <TouchableOpacity
                  key={opt.name}
                  style={[
                    styles.iconCircle,
                    { backgroundColor: opt.color },
                    selectedIcon === i && styles.iconSelected,
                  ]}
                  onPress={() => setSelectedIcon(i)}
                  activeOpacity={0.7}
                >
                  <Ionicons name={opt.name} size={22} color="#374151" />
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>

          {/* Payment Plan Toggle */}
          <TouchableOpacity
            style={styles.toggleRow}
            onPress={() => setIsPaymentPlan(!isPaymentPlan)}
            activeOpacity={0.7}
          >
            <View style={[styles.checkbox, isPaymentPlan && styles.checkboxChecked]}>
              {isPaymentPlan && <Ionicons name="checkmark" size={14} color="#fff" />}
            </View>
            <Text style={styles.toggleLabel}>Payment plan</Text>
          </TouchableOpacity>

          {isPaymentPlan && (
            <>
              <View style={styles.field}>
                <Text style={styles.label}>Number of payments</Text>
                <AppInput
                  placeholder="e.g. 12"
                  value={totalPayments}
                  onChangeText={setTotalPayments}
                  keyboardType="numeric"
                />
              </View>
              <View style={styles.field}>
                <Text style={styles.label}>Current payment</Text>
                <AppInput
                  placeholder="e.g. 1"
                  value={currentPayment}
                  onChangeText={setCurrentPayment}
                  keyboardType="numeric"
                />
              </View>
            </>
          )}

          {/* Active Toggle */}
          <TouchableOpacity
            style={styles.toggleRow}
            onPress={() => setActive(!active)}
            activeOpacity={0.7}
          >
            <View style={[styles.checkbox, active && styles.checkboxChecked]}>
              {active && <Ionicons name="checkmark" size={14} color="#fff" />}
            </View>
            <Text style={styles.toggleLabel}>Active</Text>
          </TouchableOpacity>

          {/* Save */}
          <AppButton
            title={saving ? 'Saving...' : 'Save Changes'}
            variant="primary"
            onPress={handleSave}
            disabled={saving || deleting}
          />

          {/* Delete */}
          <TouchableOpacity
            style={styles.deleteButton}
            onPress={handleDelete}
            disabled={saving || deleting}
            activeOpacity={0.7}
          >
            <Text style={styles.deleteText}>
              {deleting ? 'Deleting...' : 'Delete Expense'}
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#fff',
  },
  flex: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1f2937',
    letterSpacing: -0.5,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: '#6b7280',
  },
  form: {
    paddingHorizontal: 16,
    paddingTop: 24,
    paddingBottom: 32,
  },
  field: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
    marginBottom: 8,
  },
  iconRow: {
    gap: 12,
    paddingVertical: 4,
  },
  iconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconSelected: {
    borderWidth: 2,
    borderColor: '#0066ff',
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 4,
    borderWidth: 1.5,
    borderColor: '#d1d5db',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
  },
  checkboxChecked: {
    backgroundColor: '#0066ff',
    borderColor: '#0066ff',
  },
  toggleLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
    marginLeft: 10,
  },
  deleteButton: {
    alignItems: 'center',
    paddingVertical: 14,
    marginTop: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ef4444',
  },
  deleteText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ef4444',
  },
});
