import {
  StyleSheet,
  Text,
  TouchableOpacity,
  type TouchableOpacityProps,
} from 'react-native';

type AppButtonVariant = 'primary' | 'outline';

type AppButtonProps = TouchableOpacityProps & {
  title: string;
  variant?: AppButtonVariant;
};

export function AppButton({ title, variant = 'primary', style, ...rest }: AppButtonProps) {
  const isPrimary = variant === 'primary';

  return (
    <TouchableOpacity
      activeOpacity={0.8}
      style={[
        styles.base,
        isPrimary ? styles.primary : styles.outline,
        style,
      ]}
      {...rest}
    >
      <Text style={[styles.text, isPrimary ? styles.primaryText : styles.outlineText]}>
        {title}
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  base: {
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primary: {
    backgroundColor: '#0066ff',
  },
  outline: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  text: {
    fontSize: 16,
    fontWeight: '600',
    letterSpacing: -0.5,
  },
  primaryText: {
    color: '#fff',
  },
  outlineText: {
    color: '#374151',
    fontWeight: '500',
  },
});
