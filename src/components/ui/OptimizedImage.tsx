import { useState, memo } from 'react'
import { getOptimizedImageUrl, type ImageSize } from '../../lib/imageUtils'

interface OptimizedImageProps {
  src: string | null | undefined
  alt: string
  size: ImageSize
  fallback?: string
  className?: string
  style?: React.CSSProperties
}

/**
 * Optimierte Bild-Komponente mit:
 * - Automatischer Größenanpassung via Supabase Transforms / Unsplash params
 * - Fade-in Animation beim Laden
 * - Emoji-Fallback wenn kein Bild vorhanden
 */
export const OptimizedImage = memo(function OptimizedImage({
  src,
  alt,
  size,
  fallback = '🍽️',
  className = '',
  style,
}: OptimizedImageProps) {
  const [loaded, setLoaded] = useState(false)
  const [error, setError] = useState(false)

  const optimizedUrl = getOptimizedImageUrl(src, size)

  if (!optimizedUrl || error) {
    return (
      <div className={`flex items-center justify-center bg-background ${className}`} style={style}>
        <span className={size === 'thumb' ? 'text-[36px]' : size === 'hero' ? 'text-[64px]' : 'text-[48px]'}>
          {fallback}
        </span>
      </div>
    )
  }

  return (
    <div className={`relative overflow-hidden bg-background ${className}`} style={style}>
      {/* Skeleton Placeholder */}
      {!loaded && (
        <div className="absolute inset-0 bg-gray-100 animate-pulse" />
      )}
      <img
        src={optimizedUrl}
        alt={alt}
        loading="lazy"
        decoding="async"
        onLoad={() => setLoaded(true)}
        onError={() => setError(true)}
        className={`w-full h-full object-cover transition-opacity duration-300 ${loaded ? 'opacity-100' : 'opacity-0'}`}
      />
    </div>
  )
})
