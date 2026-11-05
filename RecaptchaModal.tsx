import { forwardRef, useImperativeHandle, useRef, useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { WebView, type WebViewMessageEvent } from 'react-native-webview';
import type { ApplicationVerifier } from 'firebase/auth';
import { firebaseConfig } from './firebase';

// Firebase only sends an SMS after a reCAPTCHA check. Expo Go has no browser DOM, so the check runs
// in a WebView whose origin is the project's authDomain (authorized by default in Firebase), and the
// resulting token is handed to the Firebase JS SDK through a custom ApplicationVerifier.
const html = `<!DOCTYPE html>
<html>
<head>
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <script src="https://www.gstatic.com/firebasejs/10.14.1/firebase-app-compat.js"></script>
  <script src="https://www.gstatic.com/firebasejs/10.14.1/firebase-auth-compat.js"></script>
  <style>body{margin:0;display:flex;justify-content:center;padding-top:24px;font-family:sans-serif}</style>
</head>
<body>
  <div id="recaptcha"></div>
  <script>
    function send(msg) { window.ReactNativeWebView.postMessage(JSON.stringify(msg)); }
    try {
      firebase.initializeApp(${JSON.stringify(firebaseConfig)});
      new firebase.auth.RecaptchaVerifier('recaptcha', {
        size: 'normal',
        callback: function (token) { send({ type: 'verified', token: token }); },
        'expired-callback': function () { send({ type: 'error', message: 'reCAPTCHA expired. Try again.' }); }
      }).render().then(function () { send({ type: 'loaded' }); });
    } catch (e) {
      send({ type: 'error', message: String(e && e.message || e) });
    }
  </script>
</body>
</html>`;

export type RecaptchaHandle = { verifier: ApplicationVerifier };

type Pending = { resolve: (token: string) => void; reject: (err: Error) => void };

export const RecaptchaModal = forwardRef<RecaptchaHandle>(function RecaptchaModal(_props, ref) {
  const [visible, setVisible] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const pending = useRef<Pending | null>(null);

  const finish = (outcome: { token: string } | { error: Error }) => {
    setVisible(false);
    setLoaded(false);
    const p = pending.current;
    pending.current = null;
    if (!p) return;
    if ('token' in outcome) p.resolve(outcome.token);
    else p.reject(outcome.error);
  };

  useImperativeHandle(ref, () => ({
    // Shape the Firebase SDK expects: type 'recaptcha', verify() returning a token, and _reset().
    verifier: {
      type: 'recaptcha',
      verify: () =>
        new Promise<string>((resolve, reject) => {
          pending.current = { resolve, reject };
          setVisible(true);
        }),
      _reset: () => {},
    } as ApplicationVerifier,
  }));

  const onMessage = (event: WebViewMessageEvent) => {
    const msg = JSON.parse(event.nativeEvent.data);
    if (msg.type === 'loaded') setLoaded(true);
    else if (msg.type === 'verified') finish({ token: msg.token });
    else if (msg.type === 'error') finish({ error: Object.assign(new Error(msg.message), { code: 'recaptcha-error' }) });
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={() => finish({ error: cancelled() })}>
      <View style={styles.backdrop}>
        <View style={styles.sheet}>
          <Text style={styles.title}>Confirm you're not a robot</Text>
          {!loaded && <Text style={styles.hint}>Loading reCAPTCHA…</Text>}
          <WebView
            style={styles.webview}
            originWhitelist={['*']}
            source={{ html, baseUrl: `https://${firebaseConfig.authDomain}` }}
            onMessage={onMessage}
            javaScriptEnabled
          />
          <Pressable onPress={() => finish({ error: cancelled() })} style={styles.cancel}>
            <Text style={styles.cancelText}>Cancel</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
});

function cancelled() {
  return Object.assign(new Error('Verification cancelled.'), { code: 'cancelled' });
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  sheet: { height: '75%', backgroundColor: '#fff', borderTopLeftRadius: 16, borderTopRightRadius: 16, padding: 16 },
  title: { fontSize: 18, fontWeight: '600', textAlign: 'center', marginBottom: 8 },
  hint: { textAlign: 'center', color: '#666' },
  webview: { flex: 1 },
  cancel: { padding: 14, alignItems: 'center' },
  cancelText: { color: '#2563eb', fontSize: 16, fontWeight: '600' },
});
