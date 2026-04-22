/**
 * AI Cost Logger (Phase 1)
 *
 * Schreibt jeden AI-Call in die Supabase-Tabelle ai_usage_log.
 * Kein throw bei Logging-Fehler — AI-Kosten-Tracking darf den Hauptjob nicht killen.
 */

import { createClient } from '@supabase/supabase-js'

let _supabase = null

function getSupabase() {
  if (_supabase) return _supabase
  const url = process.env.SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_KEY
  if (!url || !key) {
    throw new Error(
      'SUPABASE_URL oder SUPABASE_SERVICE_KEY fehlt — Kosten-Logging nicht möglich'
    )
  }
  _supabase = createClient(url, key, { auth: { persistSession: false } })
  return _supabase
}

/**
 * Loggt einen AI-Call.
 * @param {Object} params
 * @param {string} params.provider           z.B. 'gemini' | 'anthropic' | 'openai'
 * @param {string} params.model              z.B. 'gemini-1.5-flash'
 * @param {string} params.operation          z.B. 'enrich_product'
 * @param {number?} params.inputTokens
 * @param {number?} params.outputTokens
 * @param {number?} params.costEur
 * @param {number?} params.latencyMs
 * @param {boolean} params.success
 * @param {string?} params.errorMessage
 * @param {string?} params.referenceId       UUID (z.B. product_id)
 */
export async function logAiUsage(params) {
  try {
    const supabase = getSupabase()
    const { error } = await supabase.from('ai_usage_log').insert({
      provider: params.provider,
      model: params.model,
      operation: params.operation,
      input_tokens: params.inputTokens ?? null,
      output_tokens: params.outputTokens ?? null,
      cost_eur: params.costEur ?? null,
      latency_ms: params.latencyMs ?? null,
      success: params.success ?? true,
      error_message: params.errorMessage ?? null,
      reference_id: params.referenceId ?? null,
    })
    if (error) {
      console.warn('⚠️  AI-Kosten-Log fehlgeschlagen:', error.message)
    }
  } catch (err) {
    console.warn('⚠️  AI-Kosten-Log-Fehler (ignoriert):', err.message)
  }
}

/**
 * Summary-Log für eine Batch-Operation (menschenlesbar in der Konsole).
 */
export function logBatchSummary(operation, stats) {
  const total = (stats.success ?? 0) + (stats.failed ?? 0)
  const costEur = stats.costEur ?? 0
  console.log(
    `📊 ${operation}: ${stats.success}/${total} erfolgreich • ${costEur.toFixed(4)} € Kosten • ${stats.avgLatencyMs ?? 0} ms ⌀`
  )
}
