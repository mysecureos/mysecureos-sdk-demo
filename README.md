# MySecureOS SDK demo (React Native)

A working example of integrating
[`mysecureos-js-sdk`](https://www.npmjs.com/package/mysecureos-js-sdk) into a
mobile app. It's a real, installable Expo / React Native app with a small
backend. It activates an emergency, with a 5-second cancel window before
anything is sent, and then clears it with a reason.

Use it to see the SDK running on a device, and as a starting point for your
own integration.

> [!WARNING]
> **Emergencies activated through this demo are real.** Against a live
> MySecureOS environment they can alert MySecureOS and dispatch armed
> response. Before you press SOS, ask MySecureOS for a test environment or
> test credentials, and agree on when you'll be testing.

## Contents

- [How it works](#how-it-works)
- [Screenshots](#screenshots)
- [What you need](#what-you-need)
- [Setup](#setup)
- [Run on an Android device](#run-on-an-android-device)
- [Troubleshooting](#troubleshooting)
- [Taking it to production](#taking-it-to-production)
- [License](#license)

## How it works

```
┌──────────────────────┐   plain fetch    ┌──────────────────────┐   API key    ┌──────────────┐
│  App.tsx (phone)     │ ───────────────▶ │  server.ts (your     │ ───────────▶ │  MySecureOS  │
│  no API key at all   │                  │  backend), holds key │              │  API         │
└──────────────────────┘                  └──────────────────────┘              └──────────────┘
```

**The app holds no API key; that's the point.** A trusted-partner API key is
a server secret. Anyone who decompiles an app bundle can read a key shipped
inside it. So:

- **`server.ts`** is a small Node server standing in for *your* backend. It
  loads the key from `.env` and is the only place that uses the SDK's
  `MySecureOSPartnerClient`. It exposes two endpoints:
  - `POST /emergencies/activate`, with body `{ location? }`
  - `POST /emergencies/:id/clear`, with body `{ reason }`
- **`App.tsx`** is the phone app. It only knows `server.ts`'s URL, and it
  uses the SDK's optional UI layer (`mysecureos-js-sdk/react-native`) in two
  ways, switchable with the tabs at the top:
  1. **`<PanicScreen>`**: the complete MySecureOS SOS screen in one component.
  2. **`usePanic()`**: the same state and logic behind a deliberately plain,
     custom layout. It shows you're never locked into the SDK's UI.

The app also shows a few details of the flow:

- **Location:** the phone's GPS location (`expo-location`) is captured
  automatically and sent with the activation. There's no manual entry.
  Permission is requested when the app launches, not mid-emergency. If
  permission is denied, activation still works, just without coordinates.
- **Cancel window:** cancelling during the 5-second countdown never contacts
  the server, so no emergency is created.
- **Clearing:** clearing always sends a reason.

## Screenshots

These were taken on a physical Android device. The location shown is
demo data.

### Mode 1: the SDK's `<PanicScreen>`

| Idle | 5s cancel window | Emergency active | Clear confirm |
| --- | --- | --- | --- |
| ![SOS button, GPS fix resolved](docs/screenshots/sdk-panicscreen-idle.jpeg) | ![Sending in 2… with Cancel](docs/screenshots/sdk-panicscreen-countdown.jpeg) | ![EMERGENCY ACTIVE, armed response notified](docs/screenshots/sdk-panicscreen-active.jpeg) | ![Clear your emergency? dialog](docs/screenshots/sdk-panicscreen-clear-confirm.jpeg) |

### Mode 2: a custom UI on `usePanic()`

| Idle | Pending | Resolved |
| --- | --- | --- |
| ![custom UI, send SOS](docs/screenshots/custom-usepanic-idle.jpeg) | ![status: pending, clear](docs/screenshots/custom-usepanic-pending.jpeg) | ![status: resolved, reset](docs/screenshots/custom-usepanic-resolved.jpeg) |

## What you need

- **A MySecureOS partner account and API key.** An admin generates the key in
  the MySecureOS dashboard under **Company Settings → API Keys → Generate new
  key**. It's shown only once.
- **A MySecureOS SDK plan with activations available.** See
  [Plans & quota](https://github.com/mysecureos/mysecureos-js-sdk#plans--quota).
- **Node.js 20 or newer.**
- **An Android device or emulator,** with the Android SDK and `adb`
  installed. See Expo's
  [Android development setup](https://docs.expo.dev/get-started/set-up-your-environment/).
  The app also runs on iOS with `npx expo run:ios` on a Mac with Xcode, but
  this guide covers Android.

## Setup

```bash
git clone https://github.com/mysecureos/mysecureos-sdk-demo.git
cd mysecureos-sdk-demo
npm install
cp .env.example .env
```

Edit `.env`:

| Variable | Description |
| --- | --- |
| `MYSECUREOS_BASE_URL` | The MySecureOS API that `server.ts` forwards to. Use the test environment MySecureOS gives you. |
| `MYSECUREOS_API_KEY` | Your trusted-partner API key (`msk_live_…`). `.env` is gitignored, so never commit a real key. |
| `PORT` | The port `server.ts` listens on. Default `4100`. |

## Run on an Android device

### 1. Start the backend

```bash
npm run server   # listens on :4100
```

Keep it running. It's a separate Node process, not part of the app bundle.

### 2. Connect the phone

1. Enable **USB debugging** on the phone (in Developer Options) and plug it in.
2. Accept the "Allow USB debugging?" prompt. `adb devices` should list the
   phone as `device`, not `unauthorized`.
3. Let the phone reach `server.ts` on your computer:
   ```bash
   adb reverse tcp:4100 tcp:4100
   ```

### 3. Build and install

```bash
npx expo run:android
```

This builds, installs and launches the app, and starts the Metro bundler. The
first run does a full native build, which can take a while because it
downloads large native dependencies. Later runs are much faster.

To rebuild faster after the first run, build only for your device's
architecture:

```bash
adb shell getprop ro.product.cpu.abi   # e.g. arm64-v8a
cd android && ./gradlew app:assembleDebug -PreactNativeArchitectures=arm64-v8a
adb install -r app/build/outputs/apk/debug/app-debug.apk
```

### Pointing the app at a different backend

By default the app calls `http://localhost:4100`. Override it with:

```bash
EXPO_PUBLIC_PROXY_URL=http://localhost:5000 npx expo run:android
```

## Troubleshooting

**The app hangs on the splash screen, or requests fail.**
The `adb reverse` tunnels don't survive a USB reconnect, a phone reboot or an
`adb` restart. Re-create them and reopen the app:

```bash
adb reverse tcp:8081 tcp:8081   # Metro (JS bundle)
adb reverse tcp:4100 tcp:4100   # server.ts
```

**Requests to `http://localhost:4100` are blocked.**
Android blocks plain HTTP by default. `app.json` sets
`android.usesCleartextTraffic: true` so the demo can reach `server.ts`. If you
generated the `android/` folder before that setting existed, regenerate it
with `npx expo prebuild --clean`.

**The app disappeared from the phone.**
If native code and `app.json` haven't changed, you can reinstall without
rebuilding:

```bash
adb install android/app/build/outputs/apk/debug/app-debug.apk
adb reverse tcp:8081 tcp:8081
adb reverse tcp:4100 tcp:4100
adb shell am start -n com.mysecureos.sdkdemo/.MainActivity
```

**The Gradle build crashes with `Could not isolate parameters ... BuildToolsApiClasspathEntrySnapshotTransform`.**
This is a Kotlin Gradle plugin bug with parallel builds. Add the following to
`android/gradle.properties`. Builds get slower, but stop crashing:

```properties
kotlin.compiler.execution.strategy=in-process
org.gradle.parallel=false
```

**`server.ts` returns 402.**
Your organisation's SDK plan is inactive, or its monthly activation quota is
used up. Check your plan with your MySecureOS administrator.

## Taking it to production

`server.ts` shows the *shape* of the integration. It is **not**
production-ready. In your real backend:

- **Authenticate your users first.** `server.ts` has no authentication, so
  anyone who can reach it can raise an emergency. Only activate or clear an
  emergency for a signed-in user, and only clear emergencies that user raised.
- **Keep the API key on the server.** Load it from your secret store, never
  from the app or a committed file.
- **Use HTTPS** between your app and your backend, and remove
  `usesCleartextTraffic` from `app.json`.
- **Handle errors deliberately.** Catch `MySecureOSPaymentRequiredError` (402)
  and alert your operations team. Log other errors and show the user a
  generic message. See
  [Errors](https://github.com/mysecureos/mysecureos-js-sdk#errors).

The full SDK reference is in the
[mysecureos-js-sdk README](https://github.com/mysecureos/mysecureos-js-sdk#readme).

## License

The demo code is released under the [MIT License](LICENSE), so you can copy
it into your own app. The `mysecureos-js-sdk` package it depends on has its
own [proprietary license](https://github.com/mysecureos/mysecureos-js-sdk/blob/main/LICENSE).
