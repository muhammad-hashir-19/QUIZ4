import { useRef, useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { signInWithPhoneNumber, signOut, type ConfirmationResult } from 'firebase/auth';
import { auth } from './firebase';
import { RecaptchaModal, type RecaptchaHandle } from './RecaptchaModal';

type Step = 'phone' | 'code' | 'done';
type Result = { kind: 'success' | 'error'; text: string } | null;

// E.164 format: + then country code and number, e.g. +923001234567
const E164 = /^\+[1-9]\d{7,14}$/;

function describeError(err: unknown): string {
  const code = (err as { code?: string })?.code ?? '';
  switch (code) {
    case 'auth/invalid-phone-number':
      return 'Invalid phone number. Use international format, e.g. +923001234567.';
    case 'auth/invalid-verification-code':
      return 'Incorrect code. Try again.';
    case 'auth/code-expired':
    case 'auth/session-expired':
      return 'Code expired. Request a new one.';
    case 'auth/too-many-requests':
      return 'Too many attempts. Wait a while and try again.';
    case 'auth/quota-exceeded':
      return 'SMS quota exceeded for this Firebase project.';
    case 'auth/captcha-check-failed':
    case 'auth/invalid-app-credential':
      return 'reCAPTCHA check failed. Try again.';
    case 'auth/operation-not-allowed':
      return "SMS to this country isn't enabled. Allow it in Firebase: Authentication → Settings → SMS region policy.";
    case 'cancelled':
      return 'Verification cancelled.';
    case 'auth/network-request-failed':
      return 'No internet connection.';
    default:
      return (err as Error)?.message ?? 'Something went wrong.';
  }
}

export default function App() {
  const [step, setStep] = useState<Step>('phone');
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<Result>(null);
  const confirmation = useRef<ConfirmationResult | null>(null);
  const recaptcha = useRef<RecaptchaHandle>(null);

  async function run(action: () => Promise<void>) {
    setLoading(true);
    setResult(null);
    try {
      await action();
    } catch (err) {
      setResult({ kind: 'error', text: describeError(err) });
    } finally {
      setLoading(false);
    }
  }

  const sendOtp = () =>
    run(async () => {
      const number = phone.trim();
      if (!E164.test(number)) {
        setResult({ kind: 'error', text: 'Enter the number in international format, e.g. +923001234567.' });
        return;
      }
      confirmation.current = await signInWithPhoneNumber(auth, number, recaptcha.current!.verifier);
      setStep('code');
      setCode('');
      setResult({ kind: 'success', text: `OTP sent to ${number}.` });
    });

  const verifyOtp = () =>
    run(async () => {
      if (!confirmation.current) {
        setResult({ kind: 'error', text: 'Request a code first.' });
        return;
      }
      await confirmation.current.confirm(code.trim());
      setStep('done');
      setResult({ kind: 'success', text: `Phone number ${phone.trim()} verified.` });
    });

  const startOver = () => {
    signOut(auth).catch(() => {});
    confirmation.current = null;
    setStep('phone');
    setPhone('');
    setCode('');
    setResult(null);
  };

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Text style={styles.title}>Phone Verification</Text>

      {step === 'phone' && (
        <>
          <Text style={styles.label}>Phone number (with country code)</Text>
          <TextInput
            style={styles.input}
            placeholder="+923001234567"
            keyboardType="phone-pad"
            autoComplete="tel"
            value={phone}
            onChangeText={setPhone}
          />
          <Button label="Send OTP" onPress={sendOtp} disabled={loading || !phone.trim()} />
        </>
      )}

      {step === 'code' && (
        <>
          <Text style={styles.label}>Enter the code sent to {phone.trim()}</Text>
          <TextInput
            style={[styles.input, styles.codeInput]}
            placeholder="123456"
            keyboardType="number-pad"
            autoComplete="sms-otp"
            textContentType="oneTimeCode"
            maxLength={6}
            value={code}
            onChangeText={setCode}
          />
          <Button label="Verify OTP" onPress={verifyOtp} disabled={loading || code.trim().length !== 6} />
          <Button label="Resend code" onPress={sendOtp} disabled={loading} secondary />
          <Button label="Change number" onPress={startOver} disabled={loading} secondary />
        </>
      )}

      {step === 'done' && <Button label="Verify another number" onPress={startOver} />}

      {loading && <ActivityIndicator style={styles.spinner} size="large" />}

      {result && (
        <View style={[styles.message, result.kind === 'success' ? styles.success : styles.error]}>
          <Text style={result.kind === 'success' ? styles.successText : styles.errorText}>
            {result.kind === 'success' ? '✓ ' : '✗ '}
            {result.text}
          </Text>
        </View>
      )}

      <RecaptchaModal ref={recaptcha} />
      <StatusBar style="auto" />
    </KeyboardAvoidingView>
  );
}

function Button(props: { label: string; onPress: () => void; disabled?: boolean; secondary?: boolean }) {
  return (
    <Pressable
      onPress={props.onPress}
      disabled={props.disabled}
      style={[styles.button, props.secondary && styles.buttonSecondary, props.disabled && styles.buttonDisabled]}
    >
      <Text style={[styles.buttonText, props.secondary && styles.buttonTextSecondary]}>{props.label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff', justifyContent: 'center', padding: 24 },
  title: { fontSize: 26, fontWeight: '700', textAlign: 'center', marginBottom: 32 },
  label: { fontSize: 15, color: '#444', marginBottom: 8 },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    padding: 14,
    fontSize: 18,
    marginBottom: 16,
  },
  codeInput: { letterSpacing: 8, textAlign: 'center' },
  button: { backgroundColor: '#2563eb', borderRadius: 8, padding: 14, alignItems: 'center', marginBottom: 10 },
  buttonSecondary: { backgroundColor: 'transparent' },
  buttonDisabled: { opacity: 0.5 },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  buttonTextSecondary: { color: '#2563eb' },
  spinner: { marginTop: 16 },
  message: { marginTop: 20, padding: 12, borderRadius: 8 },
  success: { backgroundColor: '#dcfce7' },
  error: { backgroundColor: '#fee2e2' },
  successText: { color: '#166534', fontSize: 16, textAlign: 'center' },
  errorText: { color: '#991b1b', fontSize: 16, textAlign: 'center' },
});
