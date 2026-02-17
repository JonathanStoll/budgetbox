import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

export type Income = {
  id: string;
  name: string;
  amount: number;
  month: number;
  year: number;
};

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

type IncomeCardProps = {
  income: Income;
  onPress?: () => void;
};

export function IncomeCard({ income, onPress }: IncomeCardProps) {
  const { name, amount, month, year } = income;
  const subtitle = `${MONTH_NAMES[month - 1]} ${year}`;

  const card = (
    <View style={styles.card}>
      <View style={styles.info}>
        <Text style={styles.title}>{name}</Text>
        <Text style={styles.subtitle}>{subtitle}</Text>
      </View>
      <Text style={styles.amount}>
        ${amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
      </Text>
    </View>
  );

  if (onPress) {
    return (
      <TouchableOpacity onPress={onPress} activeOpacity={0.7}>
        {card}
      </TouchableOpacity>
    );
  }

  return card;
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  info: {
    flex: 1,
  },
  title: {
    fontSize: 16,
    fontWeight: '500',
    color: '#1f2937',
    lineHeight: 24,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 12,
    color: '#6b7280',
    lineHeight: 16,
    letterSpacing: -0.5,
  },
  amount: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
    letterSpacing: -0.5,
  },
});
