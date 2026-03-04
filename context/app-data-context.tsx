import AsyncStorage from '@react-native-async-storage/async-storage';
import { onAuthStateChanged } from 'firebase/auth';
import {
  addDoc,
  collection,
  doc,
  getDocs,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
  where,
} from 'firebase/firestore';
import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react';

import { auth, db } from '@/firebaseconfig';
import type { Expense } from '@/components/general/expense-card';
import type { Income } from '@/components/general/income-card';

// ─── Types ───────────────────────────────────────────────────────────────────

export type BudgetExpense = {
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

export type BudgetDoc = {
  userId: string;
  month: number;
  year: number;
  expenses: BudgetExpense[];
  totalIncome: number;
  totalExpenses: number;
  balance: number;
};

// ─── AsyncStorage keys ───────────────────────────────────────────────────────

const CACHE = {
  expenses: 'cache_v1_expenses',
  income: 'cache_v1_income',
  budget: 'cache_v1_budget',
  budgetId: 'cache_v1_budget_id',
};

// ─── Budget helpers (moved from hello.tsx) ───────────────────────────────────

async function buildBudgetData(
  uid: string,
  month: number,
  year: number,
  existingExpenses?: BudgetExpense[],
) {
  const [expensesSnap, incomeSnap] = await Promise.all([
    getDocs(query(collection(db, 'expenses'), where('userId', '==', uid))),
    getDocs(
      query(
        collection(db, 'income'),
        where('userId', '==', uid),
        where('month', '==', month),
        where('year', '==', year),
      ),
    ),
  ]);

  const paidMap = new Map<string, boolean>();
  if (existingExpenses) {
    for (const e of existingExpenses) paidMap.set(e.expenseId, e.paid);
  }

  const toDeactivate: string[] = [];

  const budgetExpenses: BudgetExpense[] = expensesSnap.docs
    .filter((d) => {
      const data = d.data();
      if (data.active === false) return false;
      if (data.isPaymentPlan && (data.currentPayment ?? 0) === 0) return false;
      if (
        data.isPaymentPlan &&
        (data.totalPayments ?? 0) > 0 &&
        (data.currentPayment ?? 0) > (data.totalPayments ?? 0)
      ) {
        toDeactivate.push(d.id);
        return false;
      }
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

  if (toDeactivate.length > 0) {
    await Promise.all(
      toDeactivate.map((id) => updateDoc(doc(db, 'expenses', id), { active: false })),
    );
  }

  const totalIncome = incomeSnap.docs.reduce((sum, d) => sum + (d.data().amount as number), 0);
  const totalExpenses = budgetExpenses.reduce((sum, e) => sum + e.amount, 0);

  return {
    expenses: budgetExpenses,
    totalIncome,
    totalExpenses,
    balance: totalIncome - totalExpenses,
  };
}

async function syncBudget(uid: string, month: number, year: number): Promise<string> {
  const budgetQuery = query(
    collection(db, 'budgets'),
    where('userId', '==', uid),
    where('month', '==', month),
    where('year', '==', year),
  );
  const budgetSnap = await getDocs(budgetQuery);
  const existingDoc = budgetSnap.empty ? null : budgetSnap.docs[0];
  const existingExpenses = existingDoc
    ? (existingDoc.data().expenses as BudgetExpense[] | undefined)
    : undefined;

  // First time opening a new month: advance payment plans paid last month
  if (budgetSnap.empty) {
    const prevDate = new Date(year, month - 2, 1);
    const prevMonth = prevDate.getMonth() + 1;
    const prevYear = prevDate.getFullYear();

    const prevBudgetSnap = await getDocs(
      query(
        collection(db, 'budgets'),
        where('userId', '==', uid),
        where('month', '==', prevMonth),
        where('year', '==', prevYear),
      ),
    );

    if (!prevBudgetSnap.empty) {
      const prevExpenses = (prevBudgetSnap.docs[0].data().expenses as BudgetExpense[]) ?? [];
      const paidPlans = prevExpenses.filter((e) => e.isPaymentPlan && e.paid);

      if (paidPlans.length > 0) {
        await Promise.all(
          paidPlans.map((e) => {
            const newCurrent = (e.currentPayment ?? 0) + 1;
            const update: Record<string, unknown> = { currentPayment: newCurrent };
            if (newCurrent > (e.totalPayments ?? 0)) update.active = false;
            return updateDoc(doc(db, 'expenses', e.expenseId), update);
          }),
        );
      }
    }
  }

  const freshData = await buildBudgetData(uid, month, year, existingExpenses);

  if (existingDoc) {
    await updateDoc(doc(db, 'budgets', existingDoc.id), freshData);
    return existingDoc.id;
  }

  const docRef = await addDoc(collection(db, 'budgets'), {
    userId: uid,
    month,
    year,
    ...freshData,
    createdAt: serverTimestamp(),
  });
  return docRef.id;
}

// ─── Context ─────────────────────────────────────────────────────────────────

type AppDataContextType = {
  expenses: Expense[];
  income: Income[];
  budget: BudgetDoc | null;
  budgetId: string | null;
  loadingExpenses: boolean;
  loadingIncome: boolean;
  loadingBudget: boolean;
};

const AppDataContext = createContext<AppDataContextType>({
  expenses: [],
  income: [],
  budget: null,
  budgetId: null,
  loadingExpenses: true,
  loadingIncome: true,
  loadingBudget: true,
});

export function useAppData() {
  return useContext(AppDataContext);
}

// ─── Provider ─────────────────────────────────────────────────────────────────

export function AppDataProvider({ children }: { children: ReactNode }) {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [income, setIncome] = useState<Income[]>([]);
  const [budget, setBudget] = useState<BudgetDoc | null>(null);
  const [budgetId, setBudgetId] = useState<string | null>(null);
  const [loadingExpenses, setLoadingExpenses] = useState(true);
  const [loadingIncome, setLoadingIncome] = useState(true);
  const [loadingBudget, setLoadingBudget] = useState(true);

  // Refs hold the last serialized value — used to skip identical re-renders
  const expensesHash = useRef('');
  const incomeHash = useRef('');
  const budgetHash = useRef('');

  useEffect(() => {
    const listeners: (() => void)[] = [];

    const unsubAuth = onAuthStateChanged(auth, async (user) => {
      // Tear down previous subscriptions
      listeners.forEach((fn) => fn());
      listeners.length = 0;

      if (!user) {
        setExpenses([]);
        setIncome([]);
        setBudget(null);
        setBudgetId(null);
        setLoadingExpenses(false);
        setLoadingIncome(false);
        setLoadingBudget(false);
        expensesHash.current = '';
        incomeHash.current = '';
        budgetHash.current = '';
        return;
      }

      const uid = user.uid;
      const now = new Date();
      const month = now.getMonth() + 1;
      const year = now.getFullYear();

      // ── Seed from AsyncStorage so screens show data immediately ──
      try {
        const [cachedExp, cachedInc, cachedBudget, cachedBudgetId] = await Promise.all([
          AsyncStorage.getItem(CACHE.expenses),
          AsyncStorage.getItem(CACHE.income),
          AsyncStorage.getItem(CACHE.budget),
          AsyncStorage.getItem(CACHE.budgetId),
        ]);

        if (cachedExp) {
          setExpenses(JSON.parse(cachedExp));
          expensesHash.current = cachedExp;
          setLoadingExpenses(false);
        }
        if (cachedInc) {
          setIncome(JSON.parse(cachedInc));
          incomeHash.current = cachedInc;
          setLoadingIncome(false);
        }
        if (cachedBudget && cachedBudgetId) {
          setBudget(JSON.parse(cachedBudget));
          setBudgetId(cachedBudgetId);
          budgetHash.current = cachedBudget;
          setLoadingBudget(false);
        }
      } catch {
        // Cache read failure is non-fatal — Firestore will fill in
      }

      // ── Live subscription: expenses ──
      const expQuery = query(
        collection(db, 'expenses'),
        where('userId', '==', uid),
        orderBy('createdAt', 'desc'),
      );

      const unsubExp = onSnapshot(expQuery, (snapshot) => {
        const data: Expense[] = snapshot.docs.map((d) => {
          const raw = d.data();
          return {
            id: d.id,
            title: raw.title as string,
            category: '',
            amount: raw.amount as number,
            icon: raw.icon as Expense['icon'],
            iconBgColor: raw.iconBgColor as string,
            isPaymentPlan: raw.isPaymentPlan as boolean | undefined,
            totalPayments: raw.totalPayments as number | undefined,
            currentPayment: raw.currentPayment as number | undefined,
            active: (raw.active ?? true) as boolean,
          };
        });

        const hash = JSON.stringify(data);
        if (hash !== expensesHash.current) {
          expensesHash.current = hash;
          setExpenses(data);
          AsyncStorage.setItem(CACHE.expenses, hash).catch(() => {});
        }
        setLoadingExpenses(false);
      });
      listeners.push(unsubExp);

      // ── Live subscription: income ──
      const incQuery = query(
        collection(db, 'income'),
        where('userId', '==', uid),
        orderBy('createdAt', 'desc'),
      );

      const unsubInc = onSnapshot(incQuery, (snapshot) => {
        const data: Income[] = snapshot.docs.map((d) => {
          const raw = d.data();
          return {
            id: d.id,
            name: raw.name as string,
            amount: raw.amount as number,
            month: raw.month as number,
            year: raw.year as number,
          };
        });

        const hash = JSON.stringify(data);
        if (hash !== incomeHash.current) {
          incomeHash.current = hash;
          setIncome(data);
          AsyncStorage.setItem(CACHE.income, hash).catch(() => {});
        }
        setLoadingIncome(false);
      });
      listeners.push(unsubInc);

      // ── Budget: sync once then subscribe ──
      try {
        const id = await syncBudget(uid, month, year);
        setBudgetId(id);
        AsyncStorage.setItem(CACHE.budgetId, id).catch(() => {});

        const unsubBudget = onSnapshot(doc(db, 'budgets', id), (snap) => {
          if (!snap.exists()) return;
          const data = snap.data() as BudgetDoc;
          const hash = JSON.stringify(data);
          if (hash !== budgetHash.current) {
            budgetHash.current = hash;
            setBudget(data);
            AsyncStorage.setItem(CACHE.budget, hash).catch(() => {});
          }
          setLoadingBudget(false);
        });
        listeners.push(unsubBudget);
      } catch {
        setLoadingBudget(false);
      }
    });

    return () => {
      unsubAuth();
      listeners.forEach((fn) => fn());
    };
  }, []);

  return (
    <AppDataContext.Provider
      value={{ expenses, income, budget, budgetId, loadingExpenses, loadingIncome, loadingBudget }}
    >
      {children}
    </AppDataContext.Provider>
  );
}
