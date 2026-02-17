import { useEffect, useState } from 'react';
import { FlatList, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { collection, onSnapshot, orderBy, query, where, limit } from 'firebase/firestore';

import { auth, db } from '@/firebaseconfig';
import { SummaryCard } from '@/components/general/summary-card';
import { ExpenseCard, type Expense } from '@/components/general/expense-card';
import type { Income } from '@/components/general/income-card';
import { BottomNavBar, type NavTab } from '@/components/general/bottom-nav-bar';
import { Fab } from '@/components/general/fab';

const tabs: NavTab[] = [
  { key: 'income', label: 'Income', icon: 'arrow-down-outline' },
  { key: 'expenses', label: 'Expenses', icon: 'arrow-up-outline' },
  { key: 'home', label: 'Home', icon: 'home' },
  { key: 'preview', label: 'Preview', icon: 'trending-up-outline' },
  { key: 'settings', label: 'Settings', icon: 'settings-outline' },
];

function formatCurrency(value: number): string {
  return '$' + value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export default function HomeScreen() {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [incomeItems, setIncomeItems] = useState<Income[]>([]);
  const [activeTab, setActiveTab] = useState('home');

  const today = new Date();
  const currentMonth = today.getMonth() + 1;
  const currentYear = today.getFullYear();

  useEffect(() => {
    const uid = auth.currentUser?.uid;
    if (!uid) return;

    const q = query(
      collection(db, 'expenses'),
      where('userId', '==', uid),
      orderBy('createdAt', 'desc'),
      limit(10),
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map((doc) => ({
        id: doc.id,
        title: doc.data().title as string,
        category: '',
        amount: doc.data().amount as number,
        checked: false,
        icon: doc.data().icon as Expense['icon'],
        iconBgColor: doc.data().iconBgColor as string,
      }));
      setExpenses(data);
    });

    return unsubscribe;
  }, []);

  useEffect(() => {
    const uid = auth.currentUser?.uid;
    if (!uid) return;

    const q = query(
      collection(db, 'income'),
      where('userId', '==', uid),
      where('month', '==', currentMonth),
      where('year', '==', currentYear),
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map((doc) => {
        const d = doc.data();
        return {
          id: doc.id,
          name: d.name as string,
          amount: d.amount as number,
          month: d.month as number,
          year: d.year as number,
        };
      });
      setIncomeItems(data);
    });

    return unsubscribe;
  }, [currentMonth, currentYear]);

  const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);
  const totalIncome = incomeItems.reduce((sum, i) => sum + i.amount, 0);

  function handleTabPress(key: string) {
    if (key === 'settings') {
      router.push('/settings');
      return;
    }
    if (key === 'expenses') {
      router.push('/expenses');
      return;
    }
    if (key === 'income') {
      router.push('/income');
      return;
    }
    setActiveTab(key);
  }

  function handleToggle(id: string) {
    setExpenses((prev) =>
      prev.map((e) => (e.id === id ? { ...e, checked: !e.checked } : e)),
    );
  }

  const dateString = today.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.dateSection}>
          <Text style={styles.todayLabel}>Today</Text>
          <Text style={styles.dateText}>{dateString}</Text>
        </View>

        <View style={styles.summaryRow}>
          <SummaryCard label="Income" amount={formatCurrency(totalIncome)} variant="income" />
          <View style={{ width: 12 }} />
          <SummaryCard label="Expenses" amount={formatCurrency(totalExpenses)} variant="expense" />
          <View style={{ width: 12 }} />
          <SummaryCard label="Balance" amount={formatCurrency(totalIncome - totalExpenses)} variant="balance" />
        </View>
      </View>

      {/* Expense list */}
      <View style={styles.listSection}>
        <Text style={styles.sectionTitle}>Recent Expenses</Text>

        {expenses.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>No expenses yet</Text>
          </View>
        ) : (
          <FlatList
            data={expenses}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <ExpenseCard expense={item} onToggle={handleToggle} />
            )}
            contentContainerStyle={styles.listContent}
            ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
            showsVerticalScrollIndicator={false}
          />
        )}
      </View>

      {/* FAB */}
      <Fab onPress={() => router.push('/add-expense-modal')} />

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
    backgroundColor: '#fff',
    paddingTop: 16,
    paddingHorizontal: 16,
    paddingBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  dateSection: {
    alignItems: 'center',
    marginBottom: 16,
  },
  todayLabel: {
    fontSize: 14,
    color: '#6b7280',
    lineHeight: 20,
    letterSpacing: -0.5,
  },
  dateText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1f2937',
    lineHeight: 28,
    letterSpacing: -0.5,
    marginTop: 2,
  },
  summaryRow: {
    flexDirection: 'row',
  },
  listSection: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1f2937',
    letterSpacing: -0.5,
    marginBottom: 16,
  },
  listContent: {
    paddingBottom: 16,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: '#6b7280',
  },
});
