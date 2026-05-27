/**
 * useConsent - DSGVO-Einwilligungen verwalten.
 *
 * Persistiert Einwilligungen in `consent_log` (Schreibvorgaenge sind durch
 * RLS auf den aktuellen User beschraenkt). Aktuell unterstuetzte Typen:
 *
 *   - `health_data`     : Art. 9 DSGVO - Gewicht/Groesse/Alter/Ziel/Aktivitaet
 *   - `marketing_push`  : §7 UWG - Marketing-Push (separate Einwilligung)
 *   - `marketing_email` : §7 UWG - Marketing-Mails (reserviert)
 *
 * Eine Einwilligung gilt als "granted", solange die juengste Zeile fuer
 * (user_id, consent_type) kein `revoked_at` hat.
 *
 * Beim Widerruf wird die juengste aktive Zeile mit `revoked_at = now()`
 * markiert. Bei erneutem Granten wird eine neue Zeile angelegt - so bleibt
 * die Historie vollstaendig.
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { useAppStore } from '../store/useAppStore'

export type ConsentType = 'health_data' | 'marketing_push' | 'marketing_email'

export const HEALTH_DATA_CONSENT_VERSION = 'health_data_v1'
export const MARKETING_PUSH_CONSENT_VERSION = 'marketing_push_v1'

interface ConsentRow {
  id: string
  consent_type: ConsentType
  granted_at: string
  revoked_at: string | null
  version: string
}

async function fetchActiveConsent(
  userId: string,
  type: ConsentType,
): Promise<ConsentRow | null> {
  const { data, error } = await supabase
    .from('consent_log')
    .select('id, consent_type, granted_at, revoked_at, version')
    .eq('user_id', userId)
    .eq('consent_type', type)
    .is('revoked_at', null)
    .order('granted_at', { ascending: false })
    .limit(1)
    .maybeSingle()
  if (error) throw error
  return (data as ConsentRow | null) ?? null
}

export function useConsent(type: ConsentType) {
  const session = useAppStore((s) => s.session)
  const userId = session?.user?.id ?? null
  const queryClient = useQueryClient()

  const query = useQuery({
    queryKey: ['consent', userId, type],
    queryFn: () => fetchActiveConsent(userId as string, type),
    enabled: !!userId,
    staleTime: 1000 * 60 * 5,
  })

  const grant = useMutation({
    mutationFn: async (version: string) => {
      if (!userId) throw new Error('Kein User angemeldet')
      const userAgent = typeof navigator !== 'undefined' ? navigator.userAgent : null
      const { error } = await supabase.from('consent_log').insert({
        user_id: userId,
        consent_type: type,
        version,
        user_agent: userAgent,
      })
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['consent', userId, type] })
    },
  })

  const revoke = useMutation({
    mutationFn: async () => {
      if (!userId) throw new Error('Kein User angemeldet')
      // Markiere alle aktiven Einwilligungen dieses Typs als widerrufen.
      const { error } = await supabase
        .from('consent_log')
        .update({ revoked_at: new Date().toISOString() })
        .eq('user_id', userId)
        .eq('consent_type', type)
        .is('revoked_at', null)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['consent', userId, type] })
    },
  })

  return {
    /** true, wenn aktuell eine gueltige Einwilligung existiert */
    hasConsent: !!query.data,
    grantedAt: query.data?.granted_at ?? null,
    version: query.data?.version ?? null,
    isLoading: query.isLoading,
    grant: grant.mutateAsync,
    revoke: revoke.mutateAsync,
    isGranting: grant.isPending,
    isRevoking: revoke.isPending,
  }
}
