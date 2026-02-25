import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { sendEmailVerification, signOut } from 'firebase/auth';
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';

import { auth, db } from '@/firebaseconfig';
import { AppButton } from '@/components/general/app-button';

export default function VerifyEmailScreen() {
  const [checking, setChecking] = useState(false);
  const [resending, setResending] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [statusIsError, setStatusIsError] = useState(false);

  const cooldownRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    return () => {
      if (cooldownRef.current) {
        clearInterval(cooldownRef.current);
      }
    };
  }, []);

  function startCooldown() {
    setResendCooldown(30);
    cooldownRef.current = setInterval(() => {
      setResendCooldown((prev) => {
        if (prev <= 1) {
          clearInterval(cooldownRef.current!);
          cooldownRef.current = null;
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }

  async function handleContinue() {
    const user = auth.currentUser;
    if (!user) {
      router.replace('/login');
      return;
    }

    setChecking(true);
    setStatusMessage(null);

    try {
      await user.reload();
      const refreshedUser = auth.currentUser;

      if (refreshedUser?.emailVerified) {
        try {
          await updateDoc(doc(db, 'users', refreshedUser.uid), {
            emailVerified: true,
            verifiedAt: serverTimestamp(),
          });
        } catch (firestoreError: any) {
          // Non-blocking — navigation does not depend on the Firestore update
        }
        router.replace('/hello');
      } else {
        setStatusIsError(true);
        setStatusMessage(
          "Your email hasn't been verified yet. Please check your inbox and click the link."
        );
      }
    } catch (error: any) {
      setStatusIsError(true);
      setStatusMessage('Something went wrong. Please try again.');
    } finally {
      setChecking(false);
    }
  }

  async function handleResend() {
    const user = auth.currentUser;
    if (!user) {
      router.replace('/login');
      return;
    }

    setResending(true);
    setStatusMessage(null);

    try {
      await sendEmailVerification(user);
      setStatusIsError(false);
      setStatusMessage('Verification email sent. Check your inbox.');
      startCooldown();
    } catch (error: any) {
      setStatusIsError(true);
      const code = error?.code as string | undefined;
      if (code === 'auth/too-many-requests') {
        setStatusMessage('Too many attempts. Please wait before resending.');
      } else {
        setStatusMessage('Failed to resend the verification email. Please try again.');
      }
    } finally {
      setResending(false);
    }
  }

  async function handleSignOut() {
    try {
      await signOut(auth);
    } catch {
      // Navigate regardless — user is in a broken state if signOut throws
    }
    router.replace('/login');
  }

  const userEmail = auth.currentUser?.email ?? 'your email address';

  return (
    <View style={styles.flex}>
      <View style={styles.container}>
        {/* Logo — matches login.tsx exactly */}
        <View style={styles.logoSection}>
          <View style={styles.logoBox}>
            <Ionicons name="wallet-outline" size={28} color="#fff" />
          </View>
          <Text style={styles.appName}>BudgetPro</Text>
          <Text style={styles.tagline}>Smart budgeting made simple</Text>
        </View>

        {/* Content */}
        <View style={styles.contentSection}>
          <Text style={styles.heading}>Verify your email</Text>
          <Text style={styles.subheading}>
            {`We sent a verification link to ${userEmail}.\nClick the link in that email, then tap the button below.`}
          </Text>

          {/* Status message area — minHeight prevents layout shift */}
          <View style={styles.statusArea}>
            {statusMessage !== null && (
              <Text style={statusIsError ? styles.errorText : styles.successText}>
                {statusMessage}
              </Text>
            )}
          </View>

          {/* Primary action */}
          <View style={styles.buttonWrapper}>
            <AppButton
              title={checking ? '' : "I've verified — continue"}
              onPress={handleContinue}
              disabled={checking}
              accessibilityLabel="I've verified, continue to app"
              accessibilityRole="button"
            />
            {checking && (
              <ActivityIndicator style={styles.loader} color="#fff" size="small" />
            )}
          </View>

          {/* Resend action */}
          <View style={styles.buttonWrapper}>
            <AppButton
              variant="outline"
              title={
                resending
                  ? ''
                  : resendCooldown > 0
                    ? `Resend in ${resendCooldown}s`
                    : 'Resend email'
              }
              onPress={handleResend}
              disabled={resending || resendCooldown > 0}
              accessibilityLabel={
                resendCooldown > 0
                  ? `Resend email available in ${resendCooldown} seconds`
                  : 'Resend verification email'
              }
              accessibilityRole="button"
            />
            {resending && (
              <ActivityIndicator style={styles.resendLoader} color="#0066ff" size="small" />
            )}
          </View>
        </View>

        {/* Sign out */}
        <TouchableOpacity
          style={styles.signOutSection}
          onPress={handleSignOut}
          accessibilityLabel="Sign out"
          accessibilityRole="button"
        >
          <Text style={styles.signOutText}>Sign out</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: '#fff' },
  container: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 60,
    paddingBottom: 32,
    backgroundColor: '#fff',
  },

  /* Logo — identical to login.tsx */
  logoSection: { alignItems: 'center', marginBottom: 48 },
  logoBox: {
    width: 64,
    height: 64,
    borderRadius: 16,
    backgroundColor: '#0066ff',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  appName: {
    fontSize: 24,
    fontWeight: '700',
    color: '#111827',
    letterSpacing: -0.5,
  },
  tagline: {
    fontSize: 14,
    color: '#6b7280',
    marginTop: 8,
    letterSpacing: -0.5,
  },

  /* Content */
  contentSection: { flex: 1, gap: 20 },
  heading: {
    fontSize: 20,
    fontWeight: '600',
    color: '#111827',
    letterSpacing: -0.5,
  },
  subheading: {
    fontSize: 14,
    color: '#6b7280',
    letterSpacing: -0.5,
    lineHeight: 20,
  },

  /* Status */
  statusArea: { minHeight: 40 },
  successText: {
    fontSize: 14,
    color: '#16a34a',
    letterSpacing: -0.5,
  },
  errorText: {
    fontSize: 14,
    color: '#dc2626',
    letterSpacing: -0.5,
  },

  /* Button wrappers hold both the button and its absolute-positioned spinner */
  buttonWrapper: { position: 'relative' },
  loader: {
    position: 'absolute',
    bottom: 14,
    alignSelf: 'center',
  },
  resendLoader: {
    position: 'absolute',
    bottom: 14,
    alignSelf: 'center',
  },

  /* Sign out */
  signOutSection: { alignItems: 'center', paddingVertical: 8 },
  signOutText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6b7280',
    letterSpacing: -0.5,
  },
});
