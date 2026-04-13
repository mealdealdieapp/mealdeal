/**
 * Vercel Edge Function — Proxy für Marktguru API
 * Leitet Requests an api.marktguru.de weiter und fügt den API-Key serverseitig hinzu.
 * Der API-Key ist NICHT im Client-Code — nur hier.
 *
 * Route: /api/marktguru/* → https://api.marktguru.de/api/v1/*
 */

const MARKTGURU_API_KEY = process.env.MARKTGURU_API_KEY || '8Kk+pmbf7TgJ9nVj2cXeA7P5zBGv8iuutVVMRfOfvNE='
const MARKTGURU_BASE = 'https://api.marktguru.de/api/v1'

// Erlaubte Origins (Produktion + lokale Entwicklung)
const ALLOWED_ORIGINS = [
  'https://mealdeal-ten.vercel.app',
  'https://mealdeal.app',
  'http://localhost:5173',
  'http://localhost:3000',
]

function getCorsOrigin(request: Request): string {
  const origin = request.headers.get('Origin') || ''
  if (ALLOWED_ORIGINS.includes(origin)) return origin
  // Auch Vercel Preview-Deployments erlauben
  if (origin.endsWith('.vercel.app')) return origin
  return ALLOWED_ORIGINS[0] // Fallback auf Produktion
}

export const config = {
  runtime: 'edge',
}

export default async function handler(request: Request): Promise<Response> {
  const corsOrigin = getCorsOrigin(request)
  const corsHeaders = {
    'Access-Control-Allow-Origin': corsOrigin,
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Accept',
    'Access-Control-Max-Age': '86400',
  }

  // CORS Preflight
  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders })
  }

  // Nur GET-Requests erlauben
  if (request.method !== 'GET') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    })
  }

  const url = new URL(request.url)

  // Extrahiere den Pfad nach /api/marktguru/
  const pathMatch = url.pathname.match(/^\/api\/marktguru\/(.*)/)
  const apiPath = pathMatch ? pathMatch[1] : ''

  // Nur erlaubte API-Pfade durchlassen
  if (!apiPath.startsWith('offers')) {
    return new Response(JSON.stringify({ error: 'Invalid API path' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    })
  }

  const targetUrl = `${MARKTGURU_BASE}/${apiPath}${url.search}`

  try {
    const response = await fetch(targetUrl, {
      method: 'GET',
      headers: {
        'x-apikey': MARKTGURU_API_KEY,
        'Accept': 'application/json',
        'User-Agent': 'Mozilla/5.0 (compatible; MealDeal/1.0)',
      },
    })

    const body = await response.text()

    return new Response(body, {
      status: response.status,
      headers: {
        'Content-Type': response.headers.get('Content-Type') || 'application/json',
        'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=7200',
        ...corsHeaders,
      },
    })
  } catch {
    return new Response(JSON.stringify({ error: 'Marktguru API nicht erreichbar' }), {
      status: 502,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    })
  }
}
