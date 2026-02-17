import { useState } from 'react';
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
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { Calendar } from 'react-native-calendars';

import { auth, db } from '@/firebaseconfig';
import { AppInput } from '@/components/general/app-input';
import { AppButton } from '@/components/general/app-button';

function toDateString(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export default function AddIncomeModal() {
  const now = new Date();
  const [name, setName] = useState('');
  const [amount, setAmount] = useState('');
  const [selectedDate, setSelectedDate] = useState(toDateString(now));
  const [loading, setLoading] = useState(false);

  async function handleCreate() {
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

    const uid = auth.currentUser?.uid;
    if (!uid) {
      Alert.alert('Error', 'You must be logged in.');
      return;
    }

    const [yearStr, monthStr, dayStr] = selectedDate.split('-');

    setLoading(true);
    try {
      await addDoc(collection(db, 'income'), {
        name: trimmedName,
        amount: parsedAmount,
        month: parseInt(monthStr, 10),
        year: parseInt(yearStr, 10),
        day: parseInt(dayStr, 10),
        userId: uid,
        createdAt: serverTimestamp(),
      });
      router.back();
    } catch {
      Alert.alert('Error', 'Failed to create income. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Add Income</Text>
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

          {/* Submit */}
          <AppButton
            title={loading ? 'Creating...' : 'Create Income'}
            variant="primary"
            onPress={handleCreate}
            disabled={loading}
          />
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
});
