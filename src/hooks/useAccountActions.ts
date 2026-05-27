/**
 * useAccountActions - DSGVO-Aktionen fuer den eigenen Account.
 *
 *   - exportData()      : ruft RPC `export_my_data` auf, liefert JSON-Blob
 *                         als Download. Recht auf Datenuebertragbarkeit
 *                         (Art. 20 DSGVO) + Auskunftsrecht (Art. 15 DSGVO).
 *   - requestDeletion() : ruft RPC `request_account_deletion` auf, markiert
 *                         den Account als geloescht (Soft-Delete). Anschliessend
 *                         Logout. Hard-Delete nach 30 Tagen via Cron.
 */

import { useMutation } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'

function downloadJson(filename: string, payload: unknown): void {
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  setTimeout(() => URL.revokeObjectURL(url), 0)
}

export function useAccountActions() {
  const exportData = useMutation({
    mutationFn: async () => {
      // RPC ist noch nicht in den auto-generierten Types, daher Cast.
      const { data, error } = await (
        supabase.rpc as unknown as (fn: string) => Promise<{ data: unknown; error: unknown }>
      )('export_my_data')
      if (error) throw error
      const stamp = new Date().toISOString().replace(/[:.]/g, '-')
      downloadJson(`mealdeal-export-${stamp}.json`, data)
      return data
    },
  })

  const requestDeletion = useMutation({
    mutationFn: async () => {
      const { data, error } = await (
        supabase.rpc as unknown as (fn: string) => Promise<{ data: unknown; error: unknown }>
      )('request_account_deletion')
      if (error) throw error
      // Nach Soft-Delete: Session beenden, sodass kein Weiterarbeiten moeglich ist.
      await supabase.auth.signOut()
      return data
    },
  })

  return {
    exportData: exportData.mutateAsync,
    isExporting: exportData.isPending,
    exportError: exportData.error as Error | null,
    requestDeletion: requestDeletion.mutateAsync,
    isDeleting: requestDeletion.isPending,
    deletionError: requestDeletion.error as Error | null,
  }
}
