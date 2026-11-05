import { forwardRef, useEffect, useImperativeHandle, useRef } from 'react';
import { View } from 'react-native';
import { RecaptchaVerifier, type ApplicationVerifier } from 'firebase/auth';
import { auth } from './firebase';

// On web there is a real DOM, so Firebase's own RecaptchaVerifier is used directly.
// Expo picks this file over RecaptchaModal.tsx when running in a browser.
export type RecaptchaHandle = { verifier: ApplicationVerifier };

const CONTAINER_ID = 'recaptcha-container';

export const RecaptchaModal = forwardRef<RecaptchaHandle>(function RecaptchaModal(_props, ref) {
  const verifier = useRef<RecaptchaVerifier | null>(null);

  useEffect(() => () => verifier.current?.clear(), []);

  useImperativeHandle(ref, () => ({
    get verifier() {
      // Invisible reCAPTCHA: usually passes silently, shows a challenge only if Google is unsure.
      verifier.current ??= new RecaptchaVerifier(auth, CONTAINER_ID, { size: 'invisible' });
      return verifier.current;
    },
  }));

  return <View nativeID={CONTAINER_ID} />;
});
