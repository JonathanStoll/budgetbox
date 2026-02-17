import { StyleSheet, TextInput, View, type TextInputProps } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

type AppInputProps = TextInputProps & {
  icon?: keyof typeof Ionicons.glyphMap;
  rightIcon?: keyof typeof Ionicons.glyphMap;
  onRightIconPress?: () => void;
};

export function AppInput({ icon, rightIcon, onRightIconPress, style, ...rest }: AppInputProps) {
  return (
    <View style={styles.container}>
      {icon && (
        <Ionicons name={icon} size={16} color="#9ca3af" style={styles.icon} />
      )}
      <TextInput
        style={[styles.input, !icon && { paddingLeft: 16 }, style]}
        placeholderTextColor="rgba(0,0,0,0.4)"
        {...rest}
      />
      {rightIcon && (
        <Ionicons
          name={rightIcon}
          size={18}
          color="#9ca3af"
          style={styles.rightIcon}
          onPress={onRightIconPress}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 12,
    height: 50,
    backgroundColor: '#fff',
  },
  icon: {
    marginLeft: 14,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: '#111827',
    paddingLeft: 12,
    paddingRight: 12,
    height: '100%',
  },
  rightIcon: {
    paddingRight: 14,
  },
});
