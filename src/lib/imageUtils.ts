/**
 * Zentrale Bild-Utilities für optimiertes Laden
 * - Supabase Image Transforms (Resize + WebP)
 * - Unsplash URL-Optimierung
 * - Bild-URL-Konstruktion nach Kontext
 */

const SUPABASE_STORAGE_BASE =
  'https://wjhesvkapqrsbibqjbtr.supabase.co/storage/v1/object/public/recipe-images/'

/** Bild-Größen für verschiedene Kontexte */
export type ImageSize = 'thumb' | 'card' | 'hero' | 'full'

const SIZE_CONFIG: Record<ImageSize, { width: number; height: number; quality: number }> = {
  thumb: { width: 80, height: 80, quality: 60 },
  card:  { width: 200, height: 140, quality: 70 },
  hero:  { width: 480, height: 280, quality: 75 },
  full:  { width: 800, height: 600, quality: 80 },
}

/**
 * Erzeugt eine optimierte Bild-URL
 * Unterstützt: Supabase Storage, ext: (Unsplash), und direkte URLs
 */
export function getOptimizedImageUrl(
  imageUrl: string | null | undefined,
  size: ImageSize = 'card'
): string | null {
  if (!imageUrl) return null

  const config = SIZE_CONFIG[size]

  // Externe URLs (Unsplash etc.) — ext: Prefix
  if (imageUrl.startsWith('ext:')) {
    const rawUrl = imageUrl.slice(4)
    return optimizeUnsplashUrl(rawUrl, config.width, config.quality)
  }

  // Direkte URLs (https://)
  if (imageUrl.startsWith('http')) {
    // Unsplash URLs optimieren
    if (imageUrl.includes('unsplash.com')) {
      return optimizeUnsplashUrl(imageUrl, config.width, config.quality)
    }
    // Marktguru und andere externe URLs — nicht transformierbar
    return imageUrl
  }

  // Supabase Storage — direkt /object/ Endpoint (render/image gibt 503 auf Free-Plan)
  const encoded = encodeURIComponent(imageUrl)
  return `${SUPABASE_STORAGE_BASE}${encoded}`
}

/**
 * Optimiert Unsplash-URLs mit passenden Parametern
 */
function optimizeUnsplashUrl(url: string, width: number, quality: number): string {
  // Entferne bestehende Query-Parameter
  const baseUrl = url.split('?')[0]
  return `${baseUrl}?w=${width}&q=${quality}&auto=format&fit=crop`
}

/**
 * Alte IMAGE_BASE_URL Kompatibilität (wird schrittweise ersetzt)
 */
export const IMAGE_BASE_URL = SUPABASE_STORAGE_BASE
