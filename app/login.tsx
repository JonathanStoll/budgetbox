import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  sendEmailVerification,
} from 'firebase/auth';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';

import { auth, db } from '@/firebaseconfig';
import { AppInput } from '@/components/general/app-input';
import { AppButton } from '@/components/general/app-button';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);
  const [loading, setLoading] = useState(false);

  const [forgotPasswordVisible, setForgotPasswordVisible] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [resetLoading, setResetLoading] = useState(false);

  async function handleSubmit() {
    if (!email.trim() || !password.trim()) {
      Alert.alert('Missing fields', 'Please enter both email and password.');
      return;
    }

    setLoading(true);
    try {
      if (isSignUp) {
        const userCredential = await createUserWithEmailAndPassword(auth, email.trim(), password);
        const user = userCredential.user;

        try {
          await sendEmailVerification(user);
        } catch (verifyError: any) {
          // Non-blocking — user can resend from the verify-email screen
        }

        try {
          await setDoc(
            doc(db, 'users', user.uid),
            {
              uid: user.uid,
              email: user.email,
              emailVerified: false,
              createdAt: serverTimestamp(),
            },
            { merge: true }
          );
        } catch (firestoreError: any) {
          // Non-blocking — routing does not depend on the Firestore document
        }

        router.replace('/verify-email');
      } else {
        const userCredential = await signInWithEmailAndPassword(auth, email.trim(), password);
        const user = userCredential.user;
        router.replace(user.emailVerified ? '/hello' : '/verify-email');
      }
    } catch (error: any) {
      const code = error?.code as string | undefined;
      let message = 'Something went wrong. Please try again.';

      switch (code) {
        case 'auth/invalid-email':
          message = 'Please enter a valid email address.';
          break;
        case 'auth/user-not-found':
          message = 'No account found with this email.';
          break;
        case 'auth/wrong-password':
          message = 'Incorrect password.';
          break;
        case 'auth/invalid-credential':
          message = 'Invalid email or password.';
          break;
        case 'auth/email-already-in-use':
          message = 'An account with this email already exists.';
          break;
        case 'auth/weak-password':
          message = 'Password should be at least 6 characters.';
          break;
      }

      Alert.alert(isSignUp ? 'Sign Up Failed' : 'Sign In Failed', message);
    } finally {
      setLoading(false);
    }
  }

  async function handleForgotPassword() {
    const trimmed = resetEmail.trim();

    if (!trimmed) {
      Alert.alert('Email required', 'Please enter your email address.');
      return;
    }

    setResetLoading(true);
    try {
      await sendPasswordResetEmail(auth, trimmed);
      Alert.alert(
        'Reset email sent',
        'If an account with this email exists, a password reset link has been sent. Check your inbox.',
        [
          {
            text: 'OK',
            onPress: () => {
              setForgotPasswordVisible(false);
              setResetEmail('');
            },
          },
        ]
      );
    } catch (error: any) {
      const code = error?.code as string | undefined;
      let message = 'Something went wrong. Please try again.';

      switch (code) {
        case 'auth/invalid-email':
          message = 'Please enter a valid email address.';
          break;
        case 'auth/too-many-requests':
          message = 'Too many attempts. Please wait a moment and try again.';
          break;
        case 'auth/network-request-failed':
          message = 'Network error. Check your connection and try again.';
          break;
      }

      Alert.alert('Reset Failed', message);
    } finally {
      setResetLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.container}>
          {/* Logo */}
          <View style={styles.logoSection}>
            <View style={styles.logoBox}>
              <Ionicons name="wallet-outline" size={28} color="#fff" />
            </View>
            <Text style={styles.appName}>BudgetPro</Text>
            <Text style={styles.tagline}>Smart budgeting made simple</Text>
          </View>

          {/* Form */}
          <View style={styles.formSection}>
            <Text style={styles.heading}>
              {isSignUp ? 'Create account' : 'Welcome back'}
            </Text>
            <Text style={styles.subheading}>
              {isSignUp ? 'Sign up to get started' : 'Sign in to your account'}
            </Text>

            <View style={styles.form}>
              {/* Email */}
              <View style={styles.fieldGroup}>
                <Text style={styles.label}>Email</Text>
                <AppInput
                  icon="mail-outline"
                  placeholder="Enter your email"
                  autoCapitalize="none"
                  keyboardType="email-address"
                  value={email}
                  onChangeText={setEmail}
                />
              </View>

              {/* Password */}
              <View style={styles.fieldGroup}>
                <Text style={styles.label}>Password</Text>
                <AppInput
                  icon="lock-closed-outline"
                  rightIcon={showPassword ? 'eye-off-outline' : 'eye-outline'}
                  onRightIconPress={() => setShowPassword(!showPassword)}
                  placeholder="Enter your password"
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
                  value={password}
                  onChangeText={setPassword}
                />
              </View>

              {/* Forgot password */}
              {!isSignUp && (
                <TouchableOpacity
                  onPress={() => {
                    setResetEmail(email.trim());
                    setForgotPasswordVisible(true);
                  }}
                  accessibilityLabel="Forgot password"
                  accessibilityRole="button"
                >
                  <Text style={styles.forgotPassword}>Forgot password?</Text>
                </TouchableOpacity>
              )}

              {/* Submit */}
              <AppButton
                title={
                  loading
                    ? ''
                    : isSignUp
                      ? 'Create Account'
                      : 'Sign In'
                }
                onPress={handleSubmit}
                disabled={loading}
                accessibilityLabel={isSignUp ? 'Create account' : 'Sign in'}
                accessibilityRole="button"
              />
              {loading && (
                <ActivityIndicator
                  style={styles.loader}
                  color="#fff"
                  size="small"
                />
              )}
            </View>

            {/* Toggle sign in / sign up */}
            <View style={styles.signUpSection}>
              <Text style={styles.signUpLabel}>
                {isSignUp ? 'Already have an account?' : "Don't have an account?"}
              </Text>
              <TouchableOpacity onPress={() => setIsSignUp(!isSignUp)}>
                <Text style={styles.signUpLink}>
                  {isSignUp ? 'Sign in' : 'Create an account'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Footer */}
          <View style={styles.footer}>
            <Text style={styles.footerLink}>Privacy Policy</Text>
            <Text style={styles.footerLink}>Terms of Service</Text>
          </View>
        </View>
      </ScrollView>

      {/* Forgot Password Modal */}
      <Modal
        visible={forgotPasswordVisible}
        transparent
        animationType="slide"
        onRequestClose={() => {
          setForgotPasswordVisible(false);
          setResetEmail('');
        }}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => {
            setForgotPasswordVisible(false);
            setResetEmail('');
          }}
          accessibilityLabel="Dismiss password reset"
          accessibilityRole="button"
        >
          <TouchableOpacity activeOpacity={1} style={styles.modalSheet}>
            <View style={styles.modalHandle} />
            <Text style={styles.modalTitle}>Reset your password</Text>
            <Text style={styles.modalSubtitle}>
              Enter your email and we'll send you a reset link.
            </Text>

            <View style={styles.fieldGroup}>
              <Text style={styles.label}>Email</Text>
              <AppInput
                icon="mail-outline"
                placeholder="Enter your email"
                autoCapitalize="none"
                keyboardType="email-address"
                value={resetEmail}
                onChangeText={setResetEmail}
                autoFocus
              />
            </View>

            <AppButton
              title={resetLoading ? '' : 'Send Reset Link'}
              onPress={handleForgotPassword}
              disabled={resetLoading}
              style={styles.modalButton}
              accessibilityLabel="Send password reset link"
              accessibilityRole="button"
            />
            {resetLoading && (
              <ActivityIndicator
                style={styles.loader}
                color="#fff"
                size="small"
              />
            )}

            <TouchableOpacity
              style={styles.modalCancel}
              onPress={() => {
                setForgotPasswordVisible(false);
                setResetEmail('');
              }}
              accessibilityLabel="Cancel password reset"
              accessibilityRole="button"
            >
              <Text style={styles.modalCancelText}>Cancel</Text>
            </TouchableOpacity>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: '#fff' },
  scroll: { flexGrow: 1 },
  container: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 60,
    paddingBottom: 32,
    backgroundColor: '#fff',
  },

  /* Logo */
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

  /* Form */
  formSection: { flex: 1 },
  heading: {
    fontSize: 20,
    fontWeight: '600',
    color: '#111827',
    letterSpacing: -0.5,
  },
  subheading: {
    fontSize: 14,
    color: '#6b7280',
    marginTop: 4,
    marginBottom: 24,
    letterSpacing: -0.5,
  },
  form: { gap: 20 },
  fieldGroup: { gap: 8 },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
    letterSpacing: -0.5,
  },
  forgotPassword: {
    fontSize: 14,
    fontWeight: '500',
    color: '#0066ff',
    textAlign: 'right',
    letterSpacing: -0.5,
    marginTop: -8,
  },
  loader: {
    position: 'absolute',
    bottom: 14,
    alignSelf: 'center',
  },

  /* Sign up */
  signUpSection: { alignItems: 'center', marginTop: 24 },
  signUpLabel: { fontSize: 14, color: '#6b7280' },
  signUpLink: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0066ff',
    textDecorationLine: 'underline',
    marginTop: 8,
  },

  /* Footer */
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 24,
    marginTop: 32,
  },
  footerLink: { fontSize: 12, color: '#9ca3af' },

  /* Forgot password modal */
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 24,
    paddingTop: 12,
    paddingBottom: 40,
    gap: 16,
  },
  modalButton: { marginTop: 8 },
  modalHandle: {
    width: 40,
    height: 4,
    backgroundColor: '#e5e7eb',
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 8,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    letterSpacing: -0.5,
  },
  modalSubtitle: {
    fontSize: 14,
    color: '#6b7280',
    letterSpacing: -0.5,
    marginTop: -4,
  },
  modalCancel: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  modalCancelText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6b7280',
  },
});
