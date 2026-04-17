import { useState, useRef, useEffect, useCallback } from 'react'
import { X, RotateCcw, Eye, Share2 } from 'lucide-react'
import { Portal } from '../ui/Portal'
import { IMAGE_BASE_URL } from '../../lib/mealConfig'
import type { ScoredRecipe } from '../../hooks/useRecipes'

const SEGMENT_COLORS = [
  '#028350', '#22C55E', '#3B82F6', '#EF4444', '#8B5CF6',
  '#EC4899', '#14B8A6', '#F59E0B', '#6366F1', '#06B6D4',
  '#D946EF', '#84CC16', '#F43F5E', '#0EA5E9', '#A855F7',
]

interface SpinWheelProps {
  recipes: ScoredRecipe[]
  onViewRecipe: (recipe: ScoredRecipe) => void
  onClose: () => void
}

export function SpinWheel({ recipes, onViewRecipe, onClose }: SpinWheelProps) {
  const [spinning, setSpinning] = useState(false)
  const [result, setResult] = useState<ScoredRecipe | null>(null)
  const [rotation, setRotation] = useState(0)
  const [showConfetti, setShowConfetti] = useState(false)
  const [pointerBounce, setPointerBounce] = useState(false)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const imagesRef = useRef<Map<string, HTMLImageElement>>(new Map())

  const items = recipes.slice(0, 14)
  const segAngle = 360 / items.length

  const drawWheel = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas || items.length === 0) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const size = canvas.width
    const center = size / 2
    const outerR = center - 8
    const innerR = 28

    ctx.clearRect(0, 0, size, size)

    // Outer ring shadow
    ctx.beginPath()
    ctx.arc(center, center, outerR + 6, 0, Math.PI * 2)
    ctx.fillStyle = 'rgba(2,131,80,0.15)'
    ctx.fill()

    items.forEach((recipe, i) => {
      const startA = (i * segAngle - 90) * (Math.PI / 180)
      const endA = ((i + 1) * segAngle - 90) * (Math.PI / 180)

      // Clip to segment shape
      ctx.save()
      ctx.beginPath()
      ctx.moveTo(center, center)
      ctx.arc(center, center, outerR, startA, endA)
      ctx.closePath()
      ctx.clip()

      // Draw recipe image if loaded
      const img = imagesRef.current.get(recipe.id)
      if (img && img.complete && img.naturalWidth > 0) {
        const midA = (startA + endA) / 2
        const imgSize = outerR * 2
        const imgX = center + Math.cos(midA) * (outerR * 0.45) - imgSize / 2
        const imgY = center + Math.sin(midA) * (outerR * 0.45) - imgSize / 2
        ctx.drawImage(img, imgX, imgY, imgSize, imgSize)
        // Dark overlay for text readability
        ctx.fillStyle = i % 2 === 0 ? 'rgba(0,0,0,0.55)' : 'rgba(0,0,0,0.45)'
        ctx.fillRect(0, 0, size, size)
      } else {
        // Fallback color
        ctx.fillStyle = SEGMENT_COLORS[i % SEGMENT_COLORS.length]
        ctx.fillRect(0, 0, size, size)
      }

      ctx.restore()

      // Segment border
      ctx.beginPath()
      ctx.moveTo(center, center)
      ctx.arc(center, center, outerR, startA, endA)
      ctx.closePath()
      ctx.strokeStyle = 'rgba(255,255,255,0.4)'
      ctx.lineWidth = 1.5
      ctx.stroke()

      // Text along the segment
      ctx.save()
      ctx.translate(center, center)
      ctx.rotate(startA + (endA - startA) / 2)
      ctx.textAlign = 'right'
      ctx.fillStyle = 'white'
      ctx.shadowColor = 'rgba(0,0,0,0.7)'
      ctx.shadowBlur = 3
      ctx.font = `bold ${items.length > 10 ? 9 : 11}px "DM Sans", sans-serif`
      const name = recipe.name.length > 14 ? recipe.name.slice(0, 13) + '…' : recipe.name
      ctx.fillText(name, outerR - 10, 4)
      ctx.restore()
    })

    // Outer ring border
    ctx.beginPath()
    ctx.arc(center, center, outerR, 0, Math.PI * 2)
    ctx.strokeStyle = '#028350'
    ctx.lineWidth = 5
    ctx.stroke()
    ctx.strokeStyle = 'rgba(255,255,255,0.3)'
    ctx.lineWidth = 1
    ctx.stroke()

    // Center circle
    ctx.beginPath()
    ctx.arc(center, center, innerR + 2, 0, Math.PI * 2)
    ctx.fillStyle = 'white'
    ctx.fill()
    ctx.beginPath()
    ctx.arc(center, center, innerR, 0, Math.PI * 2)
    const grad = ctx.createRadialGradient(center, center, 0, center, center, innerR)
    grad.addColorStop(0, '#03A86A')
    grad.addColorStop(1, '#028350')
    ctx.fillStyle = grad
    ctx.fill()

    // Center text
    ctx.fillStyle = 'white'
    ctx.font = 'bold 11px "DM Sans", sans-serif'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText('SPIN', center, center)
  }, [items, segAngle])

  useEffect(() => { drawWheel() }, [drawWheel])

  // Preload recipe images; re-render via drawWheel sobald ein Bild fertig ist.
  useEffect(() => {
    items.forEach((recipe) => {
      if (recipe.image_url && !imagesRef.current.has(recipe.id)) {
        const img = new Image()
        img.crossOrigin = 'anonymous'
        img.src = `${IMAGE_BASE_URL}${encodeURIComponent(recipe.image_url)}`
        img.onload = () => {
          imagesRef.current.set(recipe.id, img)
          drawWheel()
        }
        imagesRef.current.set(recipe.id, img)
      }
    })
  }, [items, drawWheel])

  const spin = () => {
    if (spinning || items.length === 0) return
    setSpinning(true)
    setResult(null)
    setShowConfetti(false)
    setPointerBounce(true)

    const winnerIdx = Math.floor(Math.random() * items.length)
    const winnerAngle = winnerIdx * segAngle + segAngle / 2
    const extraSpins = 6 + Math.floor(Math.random() * 3)
    const targetRotation = rotation + extraSpins * 360 + (360 - winnerAngle)

    setRotation(targetRotation)

    setTimeout(() => {
      setSpinning(false)
      setPointerBounce(false)
      setResult(items[winnerIdx])
      setShowConfetti(true)
      setTimeout(() => setShowConfetti(false), 3500)
    }, 4500)
  }

  const handleShare = async () => {
    if (!result) return
    const text = `Heute koche ich: ${result.name} 🍳\n\nGefunden mit MealDeal`
    if (navigator.share) {
      try { await navigator.share({ title: 'MealDeal', text }) } catch { /* cancelled */ }
    } else {
      await navigator.clipboard.writeText(text)
    }
  }

  const resultImg = result?.image_url
    ? `${IMAGE_BASE_URL}${encodeURIComponent(result.image_url)}`
    : null

  return (
    <Portal>
      <div className="fixed inset-0 z-50 flex flex-col items-center" style={{ fontFamily: 'DM Sans, system-ui, sans-serif' }}>
        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

        <div className="relative mt-[4vh] w-full max-w-[480px] h-[96vh] bg-background rounded-t-[24px] flex flex-col overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-4 pt-4 pb-2 shrink-0">
            <h2 className="font-display text-[18px] font-extrabold text-dark">Überrasch mich!</h2>
            <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full bg-white" style={{ border: '1.5px solid #EBEBEB' }}>
              <X size={16} className="text-dark" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto px-4 pb-8">
            {/* Wheel container */}
            <div className="relative flex justify-center mt-2 mb-5">
              {/* Pointer */}
              <div
                className={`absolute top-[-2px] left-1/2 -translate-x-1/2 z-10 ${pointerBounce ? 'animate-pointer-bounce' : ''}`}
              >
                <svg width="28" height="32" viewBox="0 0 28 32" fill="none">
                  <path d="M14 32L0 0H28L14 32Z" fill="#028350" />
                  <path d="M14 28L3 2H25L14 28Z" fill="#03A86A" />
                </svg>
              </div>

              {/* Wheel shadow */}
              <div
                className="absolute rounded-full"
                style={{
                  width: 296, height: 296,
                  top: 8, left: '50%', transform: 'translateX(-50%)',
                  boxShadow: '0 8px 32px rgba(0,0,0,0.25), 0 2px 8px rgba(2,131,80,0.2)',
                  borderRadius: '50%',
                }}
              />

              <div
                style={{
                  transform: `rotate(${rotation}deg)`,
                  transition: spinning ? 'transform 4.5s cubic-bezier(0.15, 0.60, 0.08, 1.0)' : 'none',
                }}
              >
                <canvas
                  ref={canvasRef}
                  width={300}
                  height={300}
                  className="w-[300px] h-[300px]"
                />
              </div>
            </div>

            {/* Spin button */}
            {!result && (
              <button
                onClick={spin}
                disabled={spinning || items.length === 0}
                className={`w-full py-4 bg-primary text-white font-bold text-[16px] rounded-btn flex items-center justify-center gap-2.5 disabled:opacity-50 active:bg-green-800 ${!spinning ? 'animate-pulse-subtle' : ''}`}
              >
                <RotateCcw size={20} className={spinning ? 'animate-spin' : ''} />
                {spinning ? 'Dreht...' : 'DREHEN!'}
              </button>
            )}

            {/* Winner result */}
            {result && (
              <div className="animate-result-slide">
                <div className="text-center mb-3">
                  <span className="text-[28px]">🎉</span>
                  <p className="font-display text-[14px] font-bold text-primary mt-1">Heute gibt es...</p>
                </div>

                <div className="bg-white rounded-card overflow-hidden" style={{ border: '1.5px solid #EBEBEB' }}>
                  {resultImg ? (
                    <img src={resultImg} alt={result.name} className="w-full h-[180px] object-cover" />
                  ) : (
                    <div className="w-full h-[120px] bg-background flex items-center justify-center">
                      <span className="text-[48px]">{result.emoji ?? '🍽️'}</span>
                    </div>
                  )}
                  <div className="p-4">
                    <h3 className="font-display text-[22px] font-extrabold text-dark leading-tight">{result.name}</h3>
                    <div className="flex items-center gap-2 mt-2 text-[12px] text-muted">
                      {result.time_minutes && <span>{result.time_minutes} Min</span>}
                      {result.time_minutes && result.difficulty && <span>·</span>}
                      {result.difficulty && <span>{result.difficulty}</span>}
                      {result.calories && <span>· {result.calories} kcal</span>}
                    </div>
                  </div>
                </div>

                <div className="flex gap-2.5 mt-3">
                  <button
                    onClick={() => { onViewRecipe(result); onClose() }}
                    className="flex-1 py-3 bg-primary text-white font-bold text-[13px] rounded-btn flex items-center justify-center gap-1.5 active:bg-green-800"
                  >
                    <Eye size={15} /> Rezept ansehen
                  </button>
                  <button
                    onClick={spin}
                    className="py-3 px-4 bg-white font-bold text-[13px] text-dark rounded-btn flex items-center justify-center gap-1.5 active:bg-background"
                    style={{ border: '1.5px solid #EBEBEB' }}
                  >
                    <RotateCcw size={15} />
                  </button>
                </div>

                <button
                  onClick={handleShare}
                  className="w-full mt-2 py-2.5 bg-white font-bold text-[12px] text-muted rounded-btn flex items-center justify-center gap-1.5 active:bg-background"
                  style={{ border: '1.5px solid #EBEBEB' }}
                >
                  <Share2 size={14} /> Teilen
                </button>
              </div>
            )}
          </div>
        </div>

        {showConfetti && <Confetti />}
      </div>
    </Portal>
  )
}

function Confetti() {
  // Partikel einmalig pro Mount berechnen, damit Re-Renders die Animation
  // nicht zurücksetzen (und react-hooks/purity nicht meckert).
  const [particles] = useState(() =>
    Array.from({ length: 50 }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      delay: Math.random() * 0.6,
      duration: 2 + Math.random() * 2.5,
      color: SEGMENT_COLORS[i % SEGMENT_COLORS.length],
      size: 5 + Math.random() * 7,
      drift: -40 + Math.random() * 80,
      rotation: Math.random() * 360,
    }))
  )

  return (
    <div className="fixed inset-0 pointer-events-none z-[60] overflow-hidden">
      {particles.map((p) => (
        <div
          key={p.id}
          className="absolute"
          style={{
            left: `${p.x}%`,
            top: '-12px',
            width: p.size,
            height: p.size * 0.6,
            backgroundColor: p.color,
            borderRadius: p.id % 3 === 0 ? '50%' : '2px',
            animation: `confettiFall ${p.duration}s ease-in ${p.delay}s forwards`,
            transform: `rotate(${p.rotation}deg)`,
            '--drift': `${p.drift}px`,
          } as React.CSSProperties}
        />
      ))}
    </div>
  )
}
