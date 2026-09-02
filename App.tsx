import { StatusBar } from 'expo-status-bar'
import * as Location from 'expo-location'
import {
  isEmergencyCleared,
  PanicScreen,
  type PanicBackendConfig,
  usePanic,
} from 'mysecureos-sdk/react-native'
import { useState } from 'react'
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native'

// The trusted-partner API key is a server secret — it never belongs in a
// phone app bundle (anyone can decompile an APK and read it out). This app
// only ever talks to server.ts's own two endpoints; *that* server is the one
// holding the key (from its own .env) and calling mysecureos-sdk's
// MySecureOSPartnerClient. Reach it over USB via `adb reverse tcp:4100
// tcp:4100` — see this project's own README.
const proxyUrl = process.env.EXPO_PUBLIC_PROXY_URL ?? 'http://localhost:4100'

// `backend` points at YOUR server, not MySecureOS — the SDK builds the two
// POSTs. server.ts's routes aren't the defaults (/panic, /panic/:id/clear),
// so name them here.
const backend: PanicBackendConfig = {
  url: proxyUrl,
  activatePath: '/emergencies/activate',
  clearPath: '/emergencies/:id/clear',
}

/** Mode 1: the whole real MySecureOS screen, one component. */
function SdkScreen() {
  return (
    <PanicScreen
      location={Location}
      subject={{ name: 'SDK Demo User' }}
      confirmSeconds={5}
      backend={backend}
    />
  )
}

/**
 * Mode 2: same `usePanic` state, a completely custom (ugly, deliberately
 * un-MySecureOS) layout — to show you're never locked into the SDK's UI.
 */
function CustomScreen() {
  const { active, fix, sending, clearing, error, activate, clear, dismiss } = usePanic({
    location: Location,
    backend,
  })

  if (active) {
    return (
      <View style={styles.customBody}>
        <Text style={styles.customH}>status: {active.status}</Text>
        <Text style={styles.customMono}>{active.id}</Text>
        {isEmergencyCleared(active) ? (
          <Pressable style={styles.customBtn} onPress={dismiss}>
            <Text style={styles.customBtnText}>reset</Text>
          </Pressable>
        ) : (
          <Pressable
            style={styles.customBtn}
            disabled={clearing}
            onPress={() => clear('Safe (custom UI)')}
          >
            <Text style={styles.customBtnText}>{clearing ? '…' : 'clear'}</Text>
          </Pressable>
        )}
        {error ? <Text style={styles.customErr}>{error}</Text> : null}
      </View>
    )
  }

  return (
    <View style={styles.customBody}>
      <Text style={styles.customH}>custom UI · usePanic()</Text>
      <Text style={styles.customMono}>
        fix: {fix ? `${fix.lat.toFixed(4)}, ${fix.lng.toFixed(4)}` : 'none yet'}
      </Text>
      <Pressable
        style={[styles.customBtn, styles.customBtnDanger]}
        disabled={sending}
        onPress={() => activate()}
      >
        {sending ? <ActivityIndicator color="#fff" /> : <Text style={styles.customBtnText}>send SOS</Text>}
      </Pressable>
      {error ? <Text style={styles.customErr}>{error}</Text> : null}
    </View>
  )
}

export default function App() {
  const [mode, setMode] = useState<'sdk' | 'custom'>('sdk')

  return (
    <View style={styles.root}>
      <StatusBar style="dark" />
      <View style={styles.banner}>
        <Text style={styles.bannerTitle}>
          <Text style={styles.brand}>mysecureos</Text>-sdk demo
        </Text>
        <Text style={styles.bannerSub}>key stays in server.ts · via {proxyUrl}</Text>
        <View style={styles.tabs}>
          {(['sdk', 'custom'] as const).map((m) => (
            <Pressable
              key={m}
              onPress={() => setMode(m)}
              style={[styles.tab, mode === m && styles.tabOn]}
            >
              <Text style={[styles.tabText, mode === m && styles.tabTextOn]}>
                {m === 'sdk' ? 'SDK <PanicScreen>' : 'Custom usePanic()'}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>

      {mode === 'sdk' ? <SdkScreen /> : <CustomScreen />}
    </View>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#F4F7FB' },
  banner: {
    paddingTop: 52,
    paddingBottom: 12,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(14,23,38,0.12)',
    backgroundColor: '#FFFFFF',
  },
  bannerTitle: { fontSize: 18, fontWeight: '800', color: '#0E1726' },
  brand: { color: '#F5B54A' },
  bannerSub: { fontSize: 12, color: '#5A6B84', marginTop: 2 },
  tabs: { flexDirection: 'row', gap: 8, marginTop: 12 },
  tab: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(14,23,38,0.15)',
  },
  tabOn: { backgroundColor: '#1B4DB1', borderColor: '#1B4DB1' },
  tabText: { fontSize: 12, fontWeight: '700', color: '#5A6B84' },
  tabTextOn: { color: '#fff' },

  customBody: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, padding: 24 },
  customH: { fontSize: 16, fontWeight: '800', color: '#0E1726' },
  customMono: { fontFamily: 'monospace', fontSize: 12, color: '#5A6B84' },
  customBtn: {
    backgroundColor: '#1B4DB1',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 20,
    minWidth: 140,
    alignItems: 'center',
  },
  customBtnDanger: { backgroundColor: '#E11D28' },
  customBtnText: { color: '#fff', fontWeight: '800' },
  customErr: { color: '#E11D28', fontSize: 13 },
})
