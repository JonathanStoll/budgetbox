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
import { Calendar } from 'react-native-calendars';

import { db } from '@/firebaseconfig';
import { AppInput } from '@/components/general/app-input';
import { AppButton } from '@/components/general/app-button';

function toDateString(year: number, month: number, day: number): string {
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

export default function EditIncomeModal() {
  const { id } = useLocalSearchParams<{ id: string }>();

  const [name, setName] = useState('');
  const [amount, setAmount] = useState('');
  const [selectedDate, setSelectedDate] = useState('');
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
      const month = d.month ?? 1;
      const year = d.year ?? new Date().getFullYear();
      const day = d.day ?? 1;
      setSelectedDate(toDateString(year, month, day));
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

    const [yearStr, monthStr, dayStr] = selectedDate.split('-');

    setSaving(true);
    try {
      await updateDoc(doc(db, 'income', id!), {
        name: trimmedName,
        amount: parsedAmount,
        month: parseInt(monthStr, 10),
        year: parseInt(yearStr, 10),
        day: parseInt(dayStr, 10),
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

          {/* Date Picker */}
          <View style={styles.field}>
            <Text style={styles.label}>Date</Text>
            <Calendar
              current={selectedDate}
              onDayPress={(day: { dateString: string }) => setSelectedDate(day.dateString)}
              markedDates={{
                [selectedDate]: { selected: true, selectedColor: '#0066ff' },
              }}
              theme={{
                todayTextColor: '#0066ff',
                arrowColor: '#0066ff',
                textDayFontSize: 14,
                textMonthFontSize: 16,
                textDayHeaderFontSize: 12,
              }}
              style={styles.calendar}
            />
          </View>

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
  calendar: {
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e5e7eb',
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
