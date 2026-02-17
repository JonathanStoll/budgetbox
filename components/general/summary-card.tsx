import { StyleSheet, Text, View } from 'react-native';

type SummaryCardVariant = 'income' | 'expense' | 'balance';

type SummaryCardProps = {
  label: string;
  amount: string;
  variant: SummaryCardVariant;
};

const variantStyles: Record<SummaryCardVariant, { bg: string; label: string; amount: string }> = {
  income: { bg: '#f0fdf4', label: '#16a34a', amount: '#15803d' },
  expense: { bg: '#fef2f2', label: '#dc2626', amount: '#b91c1c' },
  balance: { bg: '#eff6ff', label: '#2563eb', amount: '#1d4ed8' },
};

export function SummaryCard({ label, amount, variant }: SummaryCardProps) {
  const colors = variantStyles[variant];

  return (
    <View style={[styles.card, { backgroundColor: colors.bg }]}>
      <Text style={[styles.label, { color: colors.label }]}>{label}</Text>
      <Text style={[styles.amount, { color: colors.amount }]}>{amount}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
  },
  label: {
    fontSize: 12,
    fontWeight: '500',
    lineHeight: 16,
  },
  amount: {
    fontSize: 18,
    fontWeight: '700',
    lineHeight: 28,
    marginTop: 2,
  },
});
