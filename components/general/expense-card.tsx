import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export type Expense = {
  id: string;
  title: string;
  category: string;
  amount: number;
  checked?: boolean;
  icon: keyof typeof Ionicons.glyphMap;
  iconBgColor: string;
  isPaymentPlan?: boolean;
  totalPayments?: number;
  currentPayment?: number;
};

type ExpenseCardProps = {
  expense: Expense;
  onToggle?: (id: string) => void;
  onPress?: () => void;
};

export function ExpenseCard({ expense, onToggle, onPress }: ExpenseCardProps) {
  const { id, title, category, amount, checked, icon, iconBgColor, isPaymentPlan, currentPayment, totalPayments } = expense;

  const subtitle = isPaymentPlan
    ? `${currentPayment}/${totalPayments} payments`
    : category;

  const card = (
    <View style={styles.card}>
      {onToggle && (
        <TouchableOpacity
          style={[styles.checkbox, checked && styles.checkboxChecked]}
          onPress={() => onToggle(id)}
          activeOpacity={0.7}
        >
          {checked && <Ionicons name="checkmark" size={14} color="#fff" />}
        </TouchableOpacity>
      )}

      <View style={[styles.iconCircle, { backgroundColor: iconBgColor }, !onToggle && { marginLeft: 0 }]}>
        <Ionicons name={icon} size={18} color="#374151" />
      </View>

      <View style={styles.info}>
        <Text style={styles.title}>{title}</Text>
        {subtitle ? <Text style={styles.category}>{subtitle}</Text> : null}
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
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 2,
    borderWidth: 0.5,
    borderColor: '#000',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
  },
  checkboxChecked: {
    backgroundColor: '#0075ff',
    borderColor: '#0075ff',
    borderWidth: 0,
  },
  iconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 12,
  },
  info: {
    flex: 1,
    marginLeft: 12,
  },
  title: {
    fontSize: 16,
    fontWeight: '500',
    color: '#1f2937',
    lineHeight: 24,
    letterSpacing: -0.5,
  },
  category: {
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
