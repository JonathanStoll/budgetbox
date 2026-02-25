import { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { Redirect } from 'expo-router';
import { onAuthStateChanged } from 'firebase/auth';

import { auth } from '@/firebaseconfig';

type Destination = '/login' | '/verify-email' | '/hello';

export default function Index() {
  const [destination, setDestination] = useState<Destination | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (!user) {
        setDestination('/login');
      } else if (!user.emailVerified) {
        setDestination('/verify-email');
      } else {
        setDestination('/hello');
      }
    });
    return unsubscribe;
  }, []);

  if (destination === null) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#0066ff" />
      </View>
    );
  }

  return <Redirect href={destination} />;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
  },
});
