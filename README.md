# Quiz 4: OTP Phone Number Verification (React Native / Expo)

An Expo app that verifies a phone number with a one-time password (OTP) sent by SMS, using **Firebase Phone Authentication**.
It runs in **Expo Go** on iPhone and Android, with no native build needed.

The user:
1. Enters a phone number in international format (for example `+923001234567`).
2. Taps **Send OTP**, completes a quick reCAPTCHA check, and Firebase texts a 6-digit code to that number.
3. Types the code into the app.
4. Taps **Verify OTP** and sees a success or failure message.

## How it works

```
App ── Send OTP ──▶ reCAPTCHA (WebView) ──token──▶ Firebase JS SDK signInWithPhoneNumber ──SMS──▶ phone
App ── Verify OTP ──▶ confirmationResult.confirm(code) ──▶ Firebase Auth ──▶ verified / error
```

Firebase requires a reCAPTCHA check before sending an SMS from a non-native app. Expo Go has no browser DOM,
so `RecaptchaModal.tsx` shows Google's reCAPTCHA in a WebView whose origin is the project's auth domain
(`quiz4-otp.firebaseapp.com`, authorized by default) and passes the token to the Firebase JS SDK.

| Path | What it is |
| --- | --- |
| `App.tsx` | The app: phone entry, code entry, success or failure result |
| `RecaptchaModal.tsx` | reCAPTCHA in a WebView, exposed to Firebase as an `ApplicationVerifier` |
| `firebase.ts` | Firebase web config and Auth instance |

## Run it

```bash
npm install
npx expo start
```
Install **Expo Go** from the App Store, then scan the QR code with the iPhone camera.
If the phone and PC are on different networks, use `npx expo start --tunnel`.

## Firebase setup (already done for project `quiz4-otp`)
1. Create a Firebase project.
2. **Authentication → Sign-in method → Phone → Enable.**
   No billing is needed: new projects can send 10 SMS per day for free.
3. **Project settings → Your apps → Add app → Web**, then copy the config into `firebase.ts`.

## Error handling
- Number not in `+<country code><number>` format → message, no SMS sent
- Wrong code → "Incorrect code. Try again."
- Expired code → "Code expired. Request a new one."
- reCAPTCHA cancelled or failed → message, no SMS sent
- Too many attempts or daily SMS quota reached → rate-limit message

## Screenshots / recording
_Add screenshots of each step and a link to the screen recording here._
