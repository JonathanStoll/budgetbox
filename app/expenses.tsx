import { useEffect, useState } from 'react';
import { FlatList, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { collection, onSnapshot, orderBy, query, where } from 'firebase/firestore';

import { auth, db } from '@/firebaseconfig';
import { ExpenseCard, type Expense } from '@/components/general/expense-card';
import { AppButton } from '@/components/general/app-button';
import { BottomNavBar, type NavTab } from '@/components/general/bottom-nav-bar';
import { useLanguage } from '@/context/language-context';

export default function ExpensesScreen() {
  const { lang } = useLanguage();
  const [expenses, setExpenses] = useState<Expense[]>([]);

  const tabs: NavTab[] = [
    { key: 'income', label: lang.nav.income, icon: 'arrow-down-outline' },
    { key: 'expenses', label: lang.nav.expenses, icon: 'arrow-up-outline' },
    { key: 'home', label: lang.nav.home, icon: 'home' },
    { key: 'preview', label: lang.nav.preview, icon: 'trending-up-outline' },
    { key: 'settings', label: lang.nav.settings, icon: 'settings-outline' },
  ];

  useEffect(() => {
    const uid = auth.currentUser?.uid;
    if (!uid) return;

    const q = query(
      collection(db, 'expenses'),
      where('userId', '==', uid),
      orderBy('createdAt', 'desc'),
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map((doc) => {
        const d = doc.data();
        return {
          id: doc.id,
          title: d.title as string,
          category: '',
          amount: d.amount as number,
          icon: d.icon as Expense['icon'],
          iconBgColor: d.iconBgColor as string,
          isPaymentPlan: d.isPaymentPlan as boolean | undefined,
          totalPayments: d.totalPayments as number | undefined,
          currentPayment: d.currentPayment as number | undefined,
          active: (d.active ?? true) as boolean,
        };
      });
      setExpenses(data);
    });

    return unsubscribe;
  }, []);

  function handleTabPress(key: string) {
    if (key === 'expenses') return;
    if (key === 'home') {
      router.replace('/hello');
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
    if (key === 'preview') {
      router.replace('/preview');
      return;
    }
  }

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>{lang.expenses.title}</Text>
      </View>

      {/* Content */}
      <View style={styles.content}>
        {expenses.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>{lang.expenses.noExpenses}</Text>
          </View>
        ) : (
          <FlatList
            data={expenses}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <ExpenseCard
                expense={item}
                onPress={() => router.push({ pathname: '/edit-expense-modal', params: { id: item.id } })}
              />
            )}
            contentContainerStyle={styles.listContent}
            ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
            showsVerticalScrollIndicator={false}
          />
        )}
      </View>

      {/* Add Expense button */}
      <View style={styles.buttonContainer}>
        <AppButton
          title={lang.expenses.addExpense}
          variant="primary"
          onPress={() => router.push('/add-expense-modal')}
        />
      </View>

      {/* Bottom Nav */}
      <BottomNavBar tabs={tabs} activeTab="expenses" onTabPress={handleTabPress} />
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
    paddingTop: 16,
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
  listContent: {
    paddingBottom: 16,
  },
  buttonContainer: {
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
});
