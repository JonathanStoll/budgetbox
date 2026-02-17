import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export type NavTab = {
  key: string;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
};

type BottomNavBarProps = {
  tabs: NavTab[];
  activeTab: string;
  onTabPress?: (key: string) => void;
};

export function BottomNavBar({ tabs, activeTab, onTabPress }: BottomNavBarProps) {
  const centerIndex = Math.floor(tabs.length / 2);

  return (
    <View style={styles.container}>
      <View style={styles.inner}>
        {tabs.map((tab, index) => {
          const isCenter = index === centerIndex;
          const isActive = tab.key === activeTab;

          if (isCenter) {
            return (
              <TouchableOpacity
                key={tab.key}
                style={styles.centerTab}
                onPress={() => onTabPress?.(tab.key)}
                activeOpacity={0.8}
              >
                <View style={styles.centerCircle}>
                  <Ionicons name={tab.icon} size={22} color="#fff" />
                </View>
                <Text style={[styles.label, styles.centerLabel]}>{tab.label}</Text>
              </TouchableOpacity>
            );
          }

          return (
            <TouchableOpacity
              key={tab.key}
              style={styles.tab}
              onPress={() => onTabPress?.(tab.key)}
              activeOpacity={0.7}
            >
              <Ionicons
                name={tab.icon}
                size={20}
                color={isActive ? '#6366f1' : '#9ca3af'}
              />
              <Text style={[styles.label, isActive && styles.activeLabel]}>
                {tab.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    paddingBottom: 24,
    paddingTop: 8,
  },
  inner: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-around',
    paddingHorizontal: 16,
  },
  tab: {
    alignItems: 'center',
    paddingTop: 8,
    minWidth: 60,
  },
  centerTab: {
    alignItems: 'center',
    marginTop: -16,
  },
  centerCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#6366f1',
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    fontSize: 12,
    color: '#9ca3af',
    marginTop: 4,
    letterSpacing: -0.5,
  },
  activeLabel: {
    color: '#6366f1',
    fontWeight: '500',
  },
  centerLabel: {
    color: '#6366f1',
    fontWeight: '500',
  },
});
