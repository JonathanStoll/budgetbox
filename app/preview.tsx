import { useEffect, useState, useCallback } from 'react';
import { Alert, FlatList, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { PieChart } from 'react-native-chart-kit';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';

import { auth, db } from '@/firebaseconfig';
import { SummaryCard } from '@/components/general/summary-card';
import { ExpenseCard, type Expense } from '@/components/general/expense-card';
import { BottomNavBar, type NavTab } from '@/components/general/bottom-nav-bar';

const tabs: NavTab[] = [
  { key: 'income', label: 'Income', icon: 'arrow-down-outline' },
  { key: 'expenses', label: 'Expenses', icon: 'arrow-up-outline' },
  { key: 'home', label: 'Home', icon: 'home' },
  { key: 'preview', label: 'Preview', icon: 'trending-up-outline' },
  { key: 'settings', label: 'Settings', icon: 'settings-outline' },
];

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
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

function formatCurrency(value: number): string {
  return (
    '$' +
    value.toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })
  );
}

/** Get month/year from an offset relative to current month */
function getMonthYear(offset: number): { month: number; year: number } {
  const now = new Date();
  const d = new Date(now.getFullYear(), now.getMonth() + offset, 1);
  return { month: d.getMonth() + 1, year: d.getFullYear() };
}

export default function PreviewScreen() {
  const [monthOffset, setMonthOffset] = useState(1); // start at next month
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [totalIncome, setTotalIncome] = useState(0);
  const [totalExpenses, setTotalExpenses] = useState(0);
  const [balance, setBalance] = useState(0);
  const [loading, setLoading] = useState(true);

  const { month, year } = getMonthYear(monthOffset);
  const monthYearLabel = `${MONTH_NAMES[month - 1]} ${year}`;

  const loadData = useCallback(async () => {
    const uid = auth.currentUser?.uid;
    if (!uid) return;

    setLoading(true);

    try {
      if (monthOffset === 0) {
        // Current month: load actual budget from Firestore
        const budgetSnap = await getDocs(
          query(
            collection(db, 'budgets'),
            where('userId', '==', uid),
            where('month', '==', month),
            where('year', '==', year),
          ),
        );

        if (!budgetSnap.empty) {
          const data = budgetSnap.docs[0].data();
          const budgetExpenses = (data.expenses as BudgetExpense[]) ?? [];

          setExpenses(
            budgetExpenses.map((e) => ({
              id: e.expenseId,
              title: e.title,
              category: '',
              amount: e.amount,
              icon: e.icon as Expense['icon'],
              iconBgColor: e.iconBgColor,
              isPaymentPlan: e.isPaymentPlan,
              currentPayment: e.currentPayment ?? undefined,
              totalPayments: e.totalPayments ?? undefined,
            })),
          );
          setTotalIncome(data.totalIncome as number);
          setTotalExpenses(data.totalExpenses as number);
          setBalance(data.balance as number);
        } else {
          setExpenses([]);
          setTotalIncome(0);
          setTotalExpenses(0);
          setBalance(0);
        }
      } else {
        // Future month: build predictive data
        const [expensesSnap, incomeSnap] = await Promise.all([
          getDocs(
            query(collection(db, 'expenses'), where('userId', '==', uid)),
          ),
          getDocs(
            query(
              collection(db, 'income'),
              where('userId', '==', uid),
              where('month', '==', getMonthYear(0).month),
              where('year', '==', getMonthYear(0).year),
            ),
          ),
        ]);

        const predictedExpenses: Expense[] = [];

        for (const doc of expensesSnap.docs) {
          const d = doc.data();

          // Skip inactive expenses
          if (d.active === false) continue;

          if (d.isPaymentPlan) {
            const current = (d.currentPayment ?? 0) as number;
            const total = (d.totalPayments ?? 0) as number;
            const predicted = current + monthOffset;

            // Skip if predicted payment exceeds total (would be done by then)
            if (predicted > total) continue;

            // For offset 1, skip payment plans at currentPayment == 0
            // (they start at offset 1 as payment 1)
            if (monthOffset === 1 && current === 0) {
              predictedExpenses.push({
                id: doc.id,
                title: d.title as string,
                category: '',
                amount: d.amount as number,
                icon: d.icon as Expense['icon'],
                iconBgColor: d.iconBgColor as string,
                isPaymentPlan: true,
                currentPayment: 1,
                totalPayments: total,
              });
              continue;
            }

            predictedExpenses.push({
              id: doc.id,
              title: d.title as string,
              category: '',
              amount: d.amount as number,
              icon: d.icon as Expense['icon'],
              iconBgColor: d.iconBgColor as string,
              isPaymentPlan: true,
              currentPayment: predicted,
              totalPayments: total,
            });
          } else {
            // Regular expense — always included if active
            // Skip payment plans at currentPayment == 0 for non-payment-plan check
            if ((d.currentPayment ?? 0) === 0 && d.isPaymentPlan) continue;

            predictedExpenses.push({
              id: doc.id,
              title: d.title as string,
              category: '',
              amount: d.amount as number,
              icon: d.icon as Expense['icon'],
              iconBgColor: d.iconBgColor as string,
            });
          }
        }

        const incomeTotal = incomeSnap.docs.reduce(
          (sum, d) => sum + (d.data().amount as number),
          0,
        );
        const expenseTotal = predictedExpenses.reduce((sum, e) => sum + e.amount, 0);

        setExpenses(predictedExpenses);
        setTotalIncome(incomeTotal);
        setTotalExpenses(expenseTotal);
        setBalance(incomeTotal - expenseTotal);
      }
    } catch {
      Alert.alert('Error', 'Failed to load preview data.');
    } finally {
      setLoading(false);
    }
  }, [monthOffset, month, year]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  function handleTabPress(key: string) {
    if (key === 'preview') return;
    if (key === 'home') {
      router.replace('/hello');
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
    if (key === 'settings') {
      router.replace('/settings');
      return;
    }
  }

  // Pie chart data
  const pieData = expenses
    .filter((e) => e.amount > 0)
    .map((e, i) => ({
      name: e.title,
      amount: e.amount,
      color: e.iconBgColor || CHART_COLORS[i % CHART_COLORS.length],
      legendFontColor: '#374151',
      legendFontSize: 12,
    }));

  async function handleExportPdf() {
    const expenseRows = expenses
      .map(
        (e) =>
          `<tr>
            <td style="padding:8px;border-bottom:1px solid #e5e7eb">${e.title}</td>
            <td style="padding:8px;border-bottom:1px solid #e5e7eb;text-align:right">${formatCurrency(e.amount)}</td>
            ${e.isPaymentPlan ? `<td style="padding:8px;border-bottom:1px solid #e5e7eb;text-align:center">${e.currentPayment}/${e.totalPayments}</td>` : `<td style="padding:8px;border-bottom:1px solid #e5e7eb;text-align:center">-</td>`}
          </tr>`,
      )
      .join('');

    const html = `
      <html>
        <body style="font-family:system-ui,sans-serif;padding:32px;color:#1f2937">
          <h1 style="color:#6366f1;margin-bottom:4px">Budget Preview</h1>
          <h2 style="color:#6b7280;font-weight:400;margin-top:0">${monthYearLabel}</h2>

          <div style="display:flex;gap:16px;margin:24px 0">
            <div style="flex:1;background:#f0fdf4;padding:16px;border-radius:8px;text-align:center">
              <div style="color:#16a34a;font-size:12px">Income</div>
              <div style="color:#15803d;font-size:20px;font-weight:700">${formatCurrency(totalIncome)}</div>
            </div>
            <div style="flex:1;background:#fef2f2;padding:16px;border-radius:8px;text-align:center">
              <div style="color:#dc2626;font-size:12px">Expenses</div>
              <div style="color:#b91c1c;font-size:20px;font-weight:700">${formatCurrency(totalExpenses)}</div>
            </div>
            <div style="flex:1;background:#eff6ff;padding:16px;border-radius:8px;text-align:center">
              <div style="color:#2563eb;font-size:12px">Balance</div>
              <div style="color:#1d4ed8;font-size:20px;font-weight:700">${formatCurrency(balance)}</div>
            </div>
          </div>

          <h3>Expense Breakdown</h3>
          <table style="width:100%;border-collapse:collapse">
            <thead>
              <tr style="background:#f9fafb">
                <th style="padding:8px;text-align:left;border-bottom:2px solid #e5e7eb">Expense</th>
                <th style="padding:8px;text-align:right;border-bottom:2px solid #e5e7eb">Amount</th>
                <th style="padding:8px;text-align:center;border-bottom:2px solid #e5e7eb">Payment</th>
              </tr>
            </thead>
            <tbody>${expenseRows}</tbody>
            <tfoot>
              <tr style="font-weight:700">
                <td style="padding:8px;border-top:2px solid #e5e7eb">Total</td>
                <td style="padding:8px;border-top:2px solid #e5e7eb;text-align:right">${formatCurrency(totalExpenses)}</td>
                <td style="padding:8px;border-top:2px solid #e5e7eb"></td>
              </tr>
            </tfoot>
          </table>
        </body>
      </html>
    `;

    try {
      const { uri } = await Print.printToFileAsync({ html });
      await Sharing.shareAsync(uri, {
        mimeType: 'application/pdf',
        dialogTitle: `Budget Preview - ${monthYearLabel}`,
      });
    } catch {
      Alert.alert('Error', 'Failed to generate PDF.');
    }
  }

  const screenWidth = 320; // chart width

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      {/* Header with month nav */}
      <View style={styles.header}>
        <View style={styles.navRow}>
          <TouchableOpacity
            onPress={() => setMonthOffset((o) => Math.max(0, o - 1))}
            disabled={monthOffset === 0}
            activeOpacity={0.7}
          >
            <Ionicons
              name="chevron-back"
              size={24}
              color={monthOffset === 0 ? '#d1d5db' : '#1f2937'}
            />
          </TouchableOpacity>

          <View style={styles.monthLabel}>
            <Text style={styles.monthText}>{monthYearLabel}</Text>
            {monthOffset === 0 && (
              <Text style={styles.currentTag}>Current</Text>
            )}
            {monthOffset >= 1 && (
              <Text style={styles.predictedTag}>Predicted</Text>
            )}
          </View>

          <TouchableOpacity
            onPress={() => setMonthOffset((o) => o + 1)}
            activeOpacity={0.7}
          >
            <Ionicons name="chevron-forward" size={24} color="#1f2937" />
          </TouchableOpacity>

          <TouchableOpacity
            onPress={handleExportPdf}
            activeOpacity={0.7}
            style={styles.pdfButton}
          >
            <Ionicons name="download-outline" size={22} color="#6366f1" />
          </TouchableOpacity>
        </View>

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

      {/* Scrollable content: chart + expense list */}
      <ScrollView style={styles.scrollArea} contentContainerStyle={styles.scrollContent}>
        {/* Pie chart */}
        {pieData.length > 0 && (
          <View style={styles.chartContainer}>
            <Text style={styles.sectionTitle}>Expense Breakdown</Text>
            <PieChart
              data={pieData}
              width={screenWidth}
              height={200}
              chartConfig={{
                color: (opacity = 1) => `rgba(99, 102, 241, ${opacity})`,
              }}
              accessor="amount"
              backgroundColor="transparent"
              paddingLeft="0"
              absolute={false}
            />
          </View>
        )}

        {/* Expense list */}
        <Text style={styles.sectionTitle}>
          {monthOffset === 0 ? 'Monthly Budget' : 'Predicted Expenses'}
        </Text>

        {loading ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>Loading...</Text>
          </View>
        ) : expenses.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>No expenses for this month</Text>
          </View>
        ) : (
          <View style={styles.expenseList}>
            {expenses.map((item, index) => (
              <View key={item.id} style={index > 0 ? { marginTop: 12 } : undefined}>
                <ExpenseCard expense={item} />
              </View>
            ))}
          </View>
        )}
      </ScrollView>

      {/* Bottom Nav */}
      <BottomNavBar tabs={tabs} activeTab="preview" onTabPress={handleTabPress} />
    </SafeAreaView>
  );
}

const CHART_COLORS = [
  '#6366f1', '#f59e0b', '#10b981', '#ef4444', '#8b5cf6',
  '#ec4899', '#14b8a6', '#f97316', '#06b6d4', '#84cc16',
];

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    backgroundColor: '#fff',
    paddingTop: 8,
    paddingHorizontal: 16,
    paddingBottom: 16,
    gap: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  navRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
    marginBottom: 4,
  },
  monthLabel: {
    alignItems: 'center',
    minWidth: 160,
  },
  monthText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1f2937',
    letterSpacing: -0.5,
  },
  currentTag: {
    fontSize: 11,
    color: '#16a34a',
    fontWeight: '500',
    marginTop: 2,
  },
  predictedTag: {
    fontSize: 11,
    color: '#6366f1',
    fontWeight: '500',
    marginTop: 2,
  },
  pdfButton: {
    marginLeft: 8,
    padding: 4,
  },
  summaryRow: {
    flexDirection: 'row',
  },
  scrollArea: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 24,
  },
  chartContainer: {
    alignItems: 'center',
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1f2937',
    letterSpacing: -0.5,
    marginBottom: 16,
  },
  expenseList: {
    paddingBottom: 16,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 48,
  },
  emptyText: {
    fontSize: 16,
    color: '#6b7280',
  },
});
