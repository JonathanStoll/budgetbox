import { useEffect, useState } from 'react';
import {
  Alert,
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

const MONTH_NAMES = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
];

export default function EditIncomeModal() {
  const { id } = useLocalSearchParams<{ id: string }>();

  const now = new Date();
  const currentYear = now.getFullYear();
  const years = [currentYear - 2, currentYear - 1, currentYear, currentYear + 1, currentYear + 2];

  const [name, setName] = useState('');
  const [amount, setAmount] = useState('');
  const [selectedMonth, setSelectedMonth] = useState(1);
  const [selectedYear, setSelectedYear] = useState(currentYear);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!id) return;

    async function fetchIncome() {
      const snap = await getDoc(doc(db, 'income', id!));
      if (!snap.exists()) {
        Alert.alert('Error', 'Income not found.');
        router.back();
        return;
      }

      const d = snap.data();
      setName(d.name ?? '');
      setAmount(String(d.amount ?? ''));
      setSelectedMonth(d.month ?? 1);
      setSelectedYear(d.year ?? currentYear);
      setLoaded(true);
    }

    fetchIncome();
  }, [id]);

  async function handleSave() {
    const trimmedName = name.trim();
    const parsedAmount = parseFloat(amount);

    if (!trimmedName) {
      Alert.alert('Validation', 'Please enter a name.');
      return;
    }
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      Alert.alert('Validation', 'Please enter a valid amount.');
      return;
    }

    setSaving(true);
    try {
      await updateDoc(doc(db, 'income', id!), {
        name: trimmedName,
        amount: parsedAmount,
        month: selectedMonth,
        year: selectedYear,
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
      'Delete Income',
      'Are you sure you want to delete this income? This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            setDeleting(true);
            try {
              await deleteDoc(doc(db, 'income', id!));
              router.back();
            } catch {
              Alert.alert('Error', 'Failed to delete income.');
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
          <Text style={styles.headerTitle}>Edit Income</Text>
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
        <Text style={styles.headerTitle}>Edit Income</Text>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="close" size={24} color="#374151" />
        </TouchableOpacity>
      </View>

      <View style={styles.form}>
        {/* Name */}
        <View style={styles.field}>
          <Text style={styles.label}>Name</Text>
          <AppInput
            placeholder="e.g. Salary"
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

        {/* Month Picker */}
        <View style={styles.field}>
          <Text style={styles.label}>Month</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.pickerRow}
          >
            {MONTH_NAMES.map((m, i) => {
              const monthNum = i + 1;
              const isSelected = selectedMonth === monthNum;
              return (
                <TouchableOpacity
                  key={m}
                  style={[styles.pickerChip, isSelected && styles.pickerChipSelected]}
                  onPress={() => setSelectedMonth(monthNum)}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.pickerChipText, isSelected && styles.pickerChipTextSelected]}>
                    {m}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

        {/* Year Picker */}
        <View style={styles.field}>
          <Text style={styles.label}>Year</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.pickerRow}
          >
            {years.map((y) => {
              const isSelected = selectedYear === y;
              return (
                <TouchableOpacity
                  key={y}
                  style={[styles.pickerChip, isSelected && styles.pickerChipSelected]}
                  onPress={() => setSelectedYear(y)}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.pickerChipText, isSelected && styles.pickerChipTextSelected]}>
                    {y}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

        <View style={styles.spacer} />

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
            {deleting ? 'Deleting...' : 'Delete Income'}
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#fff',
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
  headerTitle: {
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
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 24,
    paddingBottom: 16,
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
  pickerRow: {
    gap: 8,
    paddingVertical: 4,
  },
  pickerChip: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    backgroundColor: '#fff',
  },
  pickerChipSelected: {
    backgroundColor: '#0066ff',
    borderColor: '#0066ff',
  },
  pickerChipText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
  },
  pickerChipTextSelected: {
    color: '#fff',
  },
  spacer: {
    flex: 1,
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
