import type { Expense } from '@/components/general/expense-card';

export const mockExpenses: Expense[] = [
  {
    id: '1',
    title: 'Grocery Shopping',
    category: 'Food & Dining',
    amount: 89.5,
    checked: true,
    icon: 'restaurant',
    iconBgColor: '#ffedd5',
  },
  {
    id: '2',
    title: 'Car Payment',
    category: '3/12 payments',
    amount: 425.0,
    checked: false,
    icon: 'car',
    iconBgColor: '#dbeafe',
  },
  {
    id: '3',
    title: 'Electricity Bill',
    category: 'Utilities',
    amount: 156.75,
    checked: true,
    icon: 'flash',
    iconBgColor: '#fef9c3',
  },
  {
    id: '4',
    title: 'Rent Payment',
    category: '12/12 payments',
    amount: 1200.0,
    checked: false,
    icon: 'home',
    iconBgColor: '#f3e8ff',
  },
  {
    id: '5',
    title: 'Gym Membership',
    category: 'Health & Fitness',
    amount: 45.0,
    checked: false,
    icon: 'fitness',
    iconBgColor: '#dcfce7',
  },
  {
    id: '6',
    title: 'Gas Station',
    category: 'Transportation',
    amount: 62.3,
    checked: true,
    icon: 'speedometer',
    iconBgColor: '#fee2e2',
  },
  {
    id: '7',
    title: 'Internet Bill',
    category: '1/1 payments',
    amount: 79.99,
    checked: false,
    icon: 'wifi',
    iconBgColor: '#e0e7ff',
  },
];

export const mockSummary = {
  income: '$3,250',
  expenses: '$2,180',
  balance: '$1,070',
};
