/**
 * Vercel Serverless Function — Proxy für Marktguru API
 * Leitet Requests an api.marktguru.de weiter und fügt den API-Key hinzu.
 *
 * Route: /api/marktguru/* → https://api.marktguru.de/api/v1/*
 */

const MARKTGURU_API_KEY = '8Kk+pmbf7TgJ9nVj2cXeA7P5zBGv8iuutVVMRfOfvNE='
const MARKTGURU_BASE = 'https://api.marktguru.de/api/v1'

export const config = {
  runtime: 'edge',
}

export default async function handler(request: Request): Promise<Response> {
  const url = new URL(request.url)

  // Extrahiere den Pfad nach /api/marktguru/
  const pathMatch = url.pathname.match(/^\/api\/marktguru\/(.*)/)
  const apiPath = pathMatch ? pathMatch[1] : ''

  // Baue die Marktguru-URL zusammen
  const targetUrl = `${MARKTGURU_BASE}/${apiPath}${url.search}`

  try {
    const response = await fetch(targetUrl, {
      method: request.method,
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
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=7200',
      },
    })
  } catch (error) {
    return new Response(JSON.stringify({ error: 'Marktguru API nicht erreichbar' }), {
      status: 502,
      headers: { 'Content-Type': 'application/json' },
    })
  }
}
