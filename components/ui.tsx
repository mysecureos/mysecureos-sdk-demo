// Mirrors apps/mobile/components/ui.tsx's palette and primitives so this
// demo looks like the real MySecureOS app rather than a generic RN starter.
import type { PropsWithChildren } from 'react'
import { ScrollView, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native'

export const COLORS = {
  bg: '#F4F7FB',
  surface: '#FFFFFF',
  gold: '#1B4DB1',
  onAccent: '#FFFFFF',
  red: '#E11D28',
  text: '#0E1726',
  muted: '#5A6B84',
  line: 'rgba(14,23,38,0.12)',
  card: 'rgba(14,23,38,0.04)',
  ok: '#1B8F5A',
}

export function Screen({ children }: PropsWithChildren) {
  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.screenContent}>
      {children}
    </ScrollView>
  )
}

export function H1({ children }: PropsWithChildren) {
  return <Text style={styles.h1}>{children}</Text>
}

export function H2({ children }: PropsWithChildren) {
  return <Text style={styles.h2}>{children}</Text>
}

export function P({ children }: PropsWithChildren) {
  return <Text style={styles.p}>{children}</Text>
}

export function Card({ children, style }: PropsWithChildren<{ style?: StyleProp<ViewStyle> }>) {
  return <View style={[styles.card, style]}>{children}</View>
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },
  screenContent: {
    padding: 20,
    gap: 16,
  },
  h1: {
    fontSize: 24,
    fontWeight: '800',
    color: COLORS.text,
  },
  h2: {
    fontSize: 17,
    fontWeight: '800',
    color: COLORS.text,
  },
  p: {
    fontSize: 15,
    lineHeight: 22,
    color: COLORS.muted,
  },
  card: {
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.line,
    borderRadius: 14,
    padding: 16,
    gap: 12,
  },
})
