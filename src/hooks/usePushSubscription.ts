/**
 * usePushSubscription
 *
 * Web-Push-Subscription verwalten: Permission anfragen, beim Browser
 * registrieren, in Supabase persistieren. Auch Unsubscribe.
 *
 * Voraussetzungen zur Laufzeit:
 *   - Service Worker (public/sw.js) installiert
 *   - VITE_VAPID_PUBLIC_KEY in Env gesetzt
 */

import { useEffect, useState, useCallback } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { useAppStore } from '../store/useAppStore'

type PermissionState = 'default' | 'granted' | 'denied' | 'unsupported'

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const raw = atob(base64)
  const out = new Uint8Array(raw.length)
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i)
  return out
}

function arrayBufferToBase64(buffer: ArrayBuffer | null): string {
  if (!buffer) return ''
  const bytes = new Uint8Array(buffer)
  let bin = ''
  for (let i = 0; i < bytes.byteLength; i++) bin += String.fromCharCode(bytes[i])
  return btoa(bin)
}

function isPushSupported(): boolean {
  return (
    typeof window !== 'undefined' &&
    'serviceWorker' in navigator &&
    'PushManager' in window &&
    'Notification' in window
  )
}

async function getActiveSubscription(): Promise<PushSubscription | null> {
  if (!('serviceWorker' in navigator)) return null
  const reg = await navigator.serviceWorker.ready
  return reg.pushManager.getSubscription()
}

export function usePushSubscription() {
  const session = useAppStore((s) => s.session)
  const userId = session?.user?.id ?? null
  const queryClient = useQueryClient()

  const [permission, setPermission] = useState<PermissionState>(() => {
    if (!isPushSupported()) return 'unsupported'
    return (Notification.permission as PermissionState) ?? 'default'
  })

  useEffect(() => {
    if (!isPushSupported()) return
    const sync = () => setPermission(Notification.permission as PermissionState)
    sync()
    window.addEventListener('focus', sync)
    return () => window.removeEventListener('focus', sync)
  }, [])

  const subQuery = useQuery({
    queryKey: ['pushSubscription', userId],
    queryFn: getActiveSubscription,
    enabled: isPushSupported() && !!userId,
    staleTime: 1000 * 60,
  })

  const subscribe = useMutation({
    mutationFn: async () => {
      if (!isPushSupported()) throw new Error('Push wird in diesem Browser nicht unterstuetzt')
      if (!userId) throw new Error('Bitte zuerst einloggen')

      const vapidKey = import.meta.env.VITE_VAPID_PUBLIC_KEY as string | undefined
      if (!vapidKey) throw new Error('VAPID-Public-Key fehlt (VITE_VAPID_PUBLIC_KEY)')

      let perm = Notification.permission
      if (perm === 'default') {
        perm = await Notification.requestPermission()
      }
      setPermission(perm as PermissionState)
      if (perm !== 'granted') throw new Error('Benachrichtigungen wurden abgelehnt')

      const reg = await navigator.serviceWorker.ready
      let sub = await reg.pushManager.getSubscription()
      if (!sub) {
        const key = urlBase64ToUint8Array(vapidKey) as unknown as BufferSource
        sub = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: key,
        })
      }

      const json = sub.toJSON() as { endpoint?: string; keys?: { p256dh?: string; auth?: string } }
      const endpoint = json.endpoint ?? sub.endpoint
      const p256dh = json.keys?.p256dh ?? arrayBufferToBase64(sub.getKey('p256dh'))
      const auth = json.keys?.auth ?? arrayBufferToBase64(sub.getKey('auth'))

      const userAgent = typeof navigator !== 'undefined' ? navigator.userAgent : null

      const { error } = await (
        supabase.rpc as unknown as (fn: string, args: Record<string, unknown>) => Promise<{ error: unknown }>
      )('upsert_push_subscription', {
        p_endpoint: endpoint,
        p_p256dh: p256dh,
        p_auth: auth,
        p_user_agent: userAgent,
      })
      if (error) throw error
      return sub
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pushSubscription', userId] })
      queryClient.invalidateQueries({ queryKey: ['pushPreferences', userId] })
    },
  })

  const unsubscribe = useMutation({
    mutationFn: async () => {
      if (!isPushSupported()) return
      const sub = await getActiveSubscription()
      if (!sub) return
      const endpoint = sub.endpoint
      await sub.unsubscribe()
      const { error } = await (
        supabase.rpc as unknown as (fn: string, args: Record<string, unknown>) => Promise<{ error: unknown }>
      )('delete_push_subscription', { p_endpoint: endpoint })
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pushSubscription', userId] })
    },
  })

  const isSubscribed = !!subQuery.data
  const isLoading = subQuery.isLoading

  const refresh = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['pushSubscription', userId] })
  }, [queryClient, userId])

  return {
    supported: isPushSupported(),
    permission,
    isSubscribed,
    isLoading,
    subscribe: subscribe.mutateAsync,
    isSubscribing: subscribe.isPending,
    subscribeError: subscribe.error as Error | null,
    unsubscribe: unsubscribe.mutateAsync,
    isUnsubscribing: unsubscribe.isPending,
    refresh,
  }
}

export interface PushPreferences {
  weekly_plan_reminder: boolean
  offer_ending_soon: boolean
  new_offers_in_plz: boolean
  marketing: boolean
}

const DEFAULT_PREFS: PushPreferences = {
  weekly_plan_reminder: true,
  offer_ending_soon: true,
  new_offers_in_plz: false,
  marketing: false,
}

export function usePushPreferences() {
  const session = useAppStore((s) => s.session)
  const userId = session?.user?.id ?? null
  const queryClient = useQueryClient()

  const query = useQuery({
    queryKey: ['pushPreferences', userId],
    queryFn: async (): Promise<PushPreferences> => {
      if (!userId) return DEFAULT_PREFS
      const { data, error } = await supabase
        .from('push_preferences')
        .select('weekly_plan_reminder, offer_ending_soon, new_offers_in_plz, marketing')
        .eq('user_id', userId)
        .maybeSingle()
      if (error) throw error
      if (!data) return DEFAULT_PREFS
      return data as PushPreferences
    },
    enabled: !!userId,
    staleTime: 1000 * 60,
  })

  const update = useMutation({
    mutationFn: async (patch: Partial<PushPreferences>) => {
      if (!userId) throw new Error('Not authenticated')
      const { error } = await supabase
        .from('push_preferences')
        .upsert(
          { user_id: userId, ...patch, updated_at: new Date().toISOString() },
          { onConflict: 'user_id' },
        )
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pushPreferences', userId] })
    },
  })

  return {
    prefs: query.data ?? DEFAULT_PREFS,
    isLoading: query.isLoading,
    update: update.mutateAsync,
    isUpdating: update.isPending,
  }
}
