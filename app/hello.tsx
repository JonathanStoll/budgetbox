import { useEffect, useState, useCallback } from 'react';
import { Alert, FlatList, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import {
  addDoc,
  collection,
  doc,
  getDocs,
  onSnapshot,
  query,
  serverTimestamp,
  updateDoc,
  where,
} from 'firebase/firestore';

import { auth, db } from '@/firebaseconfig';
import { SummaryCard } from '@/components/general/summary-card';
import { ExpenseCard, type Expense } from '@/components/general/expense-card';
import { BottomNavBar, type NavTab } from '@/components/general/bottom-nav-bar';
import { Fab } from '@/components/general/fab';

const tabs: NavTab[] = [
  { key: 'income', label: 'Income', icon: 'arrow-down-outline' },
  { key: 'expenses', label: 'Expenses', icon: 'arrow-up-outline' },
  { key: 'home', label: 'Home', icon: 'home' },
  { key: 'preview', label: 'Preview', icon: 'trending-up-outline' },
  { key: 'settings', label: 'Settings', icon: 'settings-outline' },
];

type BudgetExpense = {
  expenseId: string;
  title: string;
  amount: number;
  icon: string;
  iconBgColor: string;
  paid: boolean;
  isPaymentPlan: boolean;
  currentPayment: number | null;
  totalPayments: number | null;
};

type BudgetDoc = {
  userId: string;
  month: number;
  year: number;
  expenses: BudgetExpense[];
  totalIncome: number;
  totalExpenses: number;
  balance: number;
};

function formatCurrency(value: number): string {
  return (
    '$' +
    value.toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })
  );
}

/** Fetch active expenses and income for the month, build/rebuild the budget doc. */
async function buildBudgetData(uid: string, month: number, year: number, existingExpenses?: BudgetExpense[]) {
  const expensesQuery = query(
    collection(db, 'expenses'),
    where('userId', '==', uid),
  );
  const incomeQuery = query(
    collection(db, 'income'),
    where('userId', '==', uid),
    where('month', '==', month),
    where('year', '==', year),
  );

  const [expensesSnap, incomeSnap] = await Promise.all([
    getDocs(expensesQuery),
    getDocs(incomeQuery),
  ]);

  // Build a map of existing paid statuses so we preserve them on refresh
  const paidMap = new Map<string, boolean>();
  if (existingExpenses) {
    for (const e of existingExpenses) {
      paidMap.set(e.expenseId, e.paid);
    }
  }

  const budgetExpenses: BudgetExpense[] = expensesSnap.docs
    .filter((d) => {
      const data = d.data();
      if (data.active === false) return false;
      // Payment plans starting at 0 don't appear until next month
      if (data.isPaymentPlan && (data.currentPayment ?? 0) === 0) return false;
      return true;
    })
    .map((d) => {
      const data = d.data();
      return {
        expenseId: d.id,
        title: data.title as string,
        amount: data.amount as number,
        icon: data.icon as string,
        iconBgColor: data.iconBgColor as string,
        paid: paidMap.get(d.id) ?? false,
        isPaymentPlan: data.isPaymentPlan ?? false,
        currentPayment: data.currentPayment ?? null,
        totalPayments: data.totalPayments ?? null,
      };
    });

  const totalIncome = incomeSnap.docs.reduce(
    (sum, d) => sum + (d.data().amount as number),
    0,
  );
  const totalExpenses = budgetExpenses.reduce((sum, e) => sum + e.amount, 0);

  return {
    expenses: budgetExpenses,
    totalIncome,
    totalExpenses,
    balance: totalIncome - totalExpenses,
  };
}

export default function HomeScreen() {
  const [budgetId, setBudgetId] = useState<string | null>(null);
  const [budget, setBudget] = useState<BudgetDoc | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('home');

  const now = new Date();
  const currentMonth = now.getMonth() + 1;
  const currentYear = now.getFullYear();

  const syncBudget = useCallback(async (uid: string, month: number, year: number) => {
    // Find existing budget doc for this month
    const budgetQuery = query(
      collection(db, 'budgets'),
      where('userId', '==', uid),
      where('month', '==', month),
      where('year', '==', year),
    );
    const budgetSnap = await getDocs(budgetQuery);

    // Get existing expenses (to preserve paid status)
    const existingDoc = budgetSnap.empty ? null : budgetSnap.docs[0];
    const existingExpenses = existingDoc
      ? (existingDoc.data().expenses as BudgetExpense[] | undefined)
      : undefined;

    // Build fresh data from expenses + income collections
    const freshData = await buildBudgetData(uid, month, year, existingExpenses);

    if (existingDoc) {
      // Update existing budget doc with fresh data
      await updateDoc(doc(db, 'budgets', existingDoc.id), freshData);
      return existingDoc.id;
    }

    // Create new budget doc
    const newBudget = {
      userId: uid,
      month,
      year,
      ...freshData,
      createdAt: serverTimestamp(),
    };
    const docRef = await addDoc(collection(db, 'budgets'), newBudget);
    return docRef.id;
  }, []);

  useEffect(() => {
    const uid = auth.currentUser?.uid;
    if (!uid) return;

    let unsubscribe: (() => void) | undefined;

    (async () => {
      try {
        const id = await syncBudget(uid, currentMonth, currentYear);
        setBudgetId(id);

        unsubscribe = onSnapshot(doc(db, 'budgets', id), (snap) => {
          if (snap.exists()) {
            setBudget(snap.data() as BudgetDoc);
          }
          setLoading(false);
        });
      } catch {
        Alert.alert('Error', 'Failed to load budget.');
        setLoading(false);
      }
    })();

    return () => unsubscribe?.();
  }, [currentMonth, currentYear, syncBudget]);

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
      // Update budget doc
      await updateDoc(doc(db, 'budgets', budgetId), {
        expenses: updatedExpenses,
      });

      // If payment plan and marking as paid, advance the original expense
      if (budgetExpense.isPaymentPlan && newPaid) {
        const currentPay = (budgetExpense.currentPayment ?? 0) + 1;
        const totalPay = budgetExpense.totalPayments ?? 0;

        const expenseUpdate: Record<string, unknown> = {
          currentPayment: currentPay,
        };

        if (currentPay >= totalPay) {
          expenseUpdate.active = false;
        }

        await updateDoc(doc(db, 'expenses', budgetExpense.expenseId), expenseUpdate);

        // Also update the budget expense entry to reflect the new payment count
        updatedExpenses[idx] = {
          ...updatedExpenses[idx],
          currentPayment: currentPay,
        };
        await updateDoc(doc(db, 'budgets', budgetId), {
          expenses: updatedExpenses,
        });
      }
    } catch {
      Alert.alert('Error', 'Failed to update expense.');
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
    setActiveTab(key);
  }

  const MONTH_NAMES = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December',
  ];
  const monthYearLabel = `${MONTH_NAMES[currentMonth - 1]} ${currentYear}`;

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
          <SummaryCard label="Income" amount={formatCurrency(totalIncome)} variant="income" />
          <View style={{ width: 12 }} />
          <SummaryCard label="Expenses" amount={formatCurrency(totalExpenses)} variant="expense" />
        </View>
        <View style={styles.summaryRow}>
          <SummaryCard label="Balance" amount={formatCurrency(balance)} variant="balance" />
          <View style={{ width: 12 }} />
          <SummaryCard label="Budget" amount={monthYearLabel} variant="date" />
        </View>
      </View>

      {/* Budget expense list */}
      <View style={styles.listSection}>
        <Text style={styles.sectionTitle}>Monthly Budget</Text>

        {loading ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>Loading...</Text>
          </View>
        ) : budgetExpensesAsCards.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>No expenses in this month's budget</Text>
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
