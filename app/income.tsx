import { useEffect, useState } from 'react';
import { FlatList, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { collection, onSnapshot, orderBy, query, where } from 'firebase/firestore';

import { auth, db } from '@/firebaseconfig';
import { IncomeCard, type Income } from '@/components/general/income-card';
import { AppButton } from '@/components/general/app-button';
import { BottomNavBar, type NavTab } from '@/components/general/bottom-nav-bar';

const tabs: NavTab[] = [
  { key: 'income', label: 'Income', icon: 'arrow-down-outline' },
  { key: 'expenses', label: 'Expenses', icon: 'arrow-up-outline' },
  { key: 'home', label: 'Home', icon: 'home' },
  { key: 'preview', label: 'Preview', icon: 'trending-up-outline' },
  { key: 'settings', label: 'Settings', icon: 'settings-outline' },
];

export default function IncomeScreen() {
  const [incomeItems, setIncomeItems] = useState<Income[]>([]);

  useEffect(() => {
    const uid = auth.currentUser?.uid;
    if (!uid) return;

    const q = query(
      collection(db, 'income'),
      where('userId', '==', uid),
      orderBy('createdAt', 'desc'),
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
  }, []);

  function handleTabPress(key: string) {
    if (key === 'income') return;
    if (key === 'expenses') {
      router.push('/expenses');
      return;
    }
    if (key === 'settings') {
      router.push('/settings');
      return;
    }
    if (key === 'home') {
      router.back();
      return;
    }
  }

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Income</Text>
      </View>

      {/* Content */}
      <View style={styles.content}>
        {incomeItems.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>No income yet</Text>
          </View>
        ) : (
          <FlatList
            data={incomeItems}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <IncomeCard
                income={item}
                onPress={() => router.push({ pathname: '/edit-income-modal', params: { id: item.id } })}
              />
            )}
            contentContainerStyle={styles.listContent}
            ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
            showsVerticalScrollIndicator={false}
          />
        )}
      </View>

      {/* Add Income button */}
      <View style={styles.buttonContainer}>
        <AppButton
          title="Add Income"
          variant="primary"
          onPress={() => router.push('/add-income-modal')}
        />
      </View>

      {/* Bottom Nav */}
      <BottomNavBar tabs={tabs} activeTab="income" onTabPress={handleTabPress} />
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
