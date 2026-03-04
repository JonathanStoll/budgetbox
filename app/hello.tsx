import { useState } from 'react';
import { Alert, FlatList, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { doc, updateDoc } from 'firebase/firestore';

import { db } from '@/firebaseconfig';
import { SummaryCard } from '@/components/general/summary-card';
import { ExpenseCard, type Expense } from '@/components/general/expense-card';
import { BottomNavBar, type NavTab } from '@/components/general/bottom-nav-bar';
import { Fab } from '@/components/general/fab';
import { useLanguage } from '@/context/language-context';
import { useAppData } from '@/context/app-data-context';

function formatCurrency(value: number): string {
  return (
    '$' +
    value.toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })
  );
}

export default function HomeScreen() {
  const { lang } = useLanguage();
  const { budget, budgetId, loadingBudget } = useAppData();
  const [activeTab, setActiveTab] = useState('home');

  const tabs: NavTab[] = [
    { key: 'income', label: lang.nav.income, icon: 'arrow-down-outline' },
    { key: 'expenses', label: lang.nav.expenses, icon: 'arrow-up-outline' },
    { key: 'home', label: lang.nav.home, icon: 'home' },
    { key: 'preview', label: lang.nav.preview, icon: 'trending-up-outline' },
    { key: 'settings', label: lang.nav.settings, icon: 'settings-outline' },
  ];

  const now = new Date();
  const currentMonth = now.getMonth() + 1;
  const currentYear = now.getFullYear();

  async function handleTogglePaid(expenseId: string) {
    if (!budgetId || !budget) return;

    const idx = budget.expenses.findIndex((e) => e.expenseId === expenseId);
    if (idx === -1) return;

    const budgetExpense = budget.expenses[idx];
    const newPaid = !budgetExpense.paid;

    // Build updated expenses array
    const updatedExpenses = [...budget.expenses];
    updatedExpenses[idx] = { ...budgetExpense, paid: newPaid };

    try {
      await updateDoc(doc(db, 'budgets', budgetId), {
        expenses: updatedExpenses,
      });
    } catch {
      Alert.alert(lang.common.error, lang.home.failedToUpdate);
    }
  }

  function handleTabPress(key: string) {
    if (key === 'home') return;
    if (key === 'settings') {
      router.replace('/settings');
      return;
    }
    if (key === 'expenses') {
      router.replace('/expenses');
      return;
    }
    if (key === 'income') {
      router.replace('/income');
      return;
    }
    if (key === 'preview') {
      router.replace('/preview');
      return;
    }
    setActiveTab(key);
  }

  const monthYearLabel = `${lang.months[currentMonth - 1]} ${currentYear}`;

  const budgetExpensesAsCards: Expense[] = (budget?.expenses ?? []).map((e) => ({
    id: e.expenseId,
    title: e.title,
    category: '',
    amount: e.amount,
    checked: e.paid,
    icon: e.icon as Expense['icon'],
    iconBgColor: e.iconBgColor,
    isPaymentPlan: e.isPaymentPlan,
    currentPayment: e.currentPayment ?? undefined,
    totalPayments: e.totalPayments ?? undefined,
  }));

  const totalIncome = budget?.totalIncome ?? 0;
  const totalExpenses = budget?.totalExpenses ?? 0;
  const balance = budget?.balance ?? 0;

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.summaryRow}>
          <SummaryCard label={lang.preview.income} amount={formatCurrency(totalIncome)} variant="income" />
          <View style={{ width: 12 }} />
          <SummaryCard label={lang.preview.expenses} amount={formatCurrency(totalExpenses)} variant="expense" />
        </View>
        <View style={styles.summaryRow}>
          <SummaryCard label={lang.preview.balance} amount={formatCurrency(balance)} variant="balance" />
          <View style={{ width: 12 }} />
          <SummaryCard label={lang.preview.budget} amount={monthYearLabel} variant="date" />
        </View>
      </View>

      {/* Budget expense list */}
      <View style={styles.listSection}>
        <Text style={styles.sectionTitle}>{lang.home.monthlyBudget}</Text>

        {loadingBudget ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>{lang.common.loading}</Text>
          </View>
        ) : budgetExpensesAsCards.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>{lang.home.noExpenses}</Text>
          </View>
        ) : (
          <FlatList
            data={budgetExpensesAsCards}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <ExpenseCard expense={item} onToggle={handleTogglePaid} />
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
    gap: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
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
