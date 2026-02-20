import { useState, useEffect, useRef } from 'react'

interface Logo3DProps {
  className?: string
}

export function Logo3D({ className = '' }: Logo3DProps) {
  const [isDragging, setIsDragging] = useState(false)
  const [rotation, setRotation] = useState({ x: -15, y: 45 })
  const [dragStart, setDragStart] = useState<{ x: number; y: number } | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!isDragging) {
      // Animation de flottement verticale
      const startTime = Date.now()
      const interval = setInterval(() => {
        const elapsed = (Date.now() - startTime) / 1000
        setRotation((prev) => ({
          x: prev.x + Math.sin(elapsed * 2) * 0.2, // Flottement vertical
          y: prev.y + 0.3, // Rotation continue
        }))
      }, 50)
      return () => clearInterval(interval)
    }
  }, [isDragging])

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging || !dragStart) return
      const deltaX = e.clientX - dragStart.x
      const deltaY = e.clientY - dragStart.y
      setRotation((prev) => ({
        x: Math.max(-90, Math.min(90, prev.x - deltaY * 0.5)),
        y: prev.y + deltaX * 0.5,
      }))
      setDragStart({ x: e.clientX, y: e.clientY })
    }

    const handleMouseUp = () => {
      setIsDragging(false)
      setDragStart(null)
    }

    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove)
      document.addEventListener('mouseup', handleMouseUp)
      return () => {
        document.removeEventListener('mousemove', handleMouseMove)
        document.removeEventListener('mouseup', handleMouseUp)
      }
    }
  }, [isDragging, dragStart])

  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault()
    setIsDragging(true)
    setDragStart({ x: e.clientX, y: e.clientY })
  }

  return (
    <div
      ref={containerRef}
      className={`relative w-32 h-32 ${className}`}
      onMouseDown={handleMouseDown}
      style={{ perspective: '1000px', cursor: isDragging ? 'grabbing' : 'grab' }}
    >
      <div
        className="relative w-full h-full"
        style={{
          transformStyle: 'preserve-3d',
          transform: `rotateX(${rotation.x}deg) rotateY(${rotation.y}deg)`,
          transition: isDragging ? 'none' : 'transform 0.1s ease-out',
        }}
      >
        {/* Cube sans remplissage - juste les arêtes */}
        {/* Face avant */}
        <div
          className="absolute w-full h-full border-2 border-yellow-500"
          style={{
            transform: 'translateZ(60px)',
            background: 'transparent',
          }}
        />
        {/* Face arrière */}
        <div
          className="absolute w-full h-full border-2 border-yellow-500"
          style={{
            transform: 'translateZ(-60px) rotateY(180deg)',
            background: 'transparent',
          }}
        />
        {/* Face droite */}
        <div
          className="absolute w-full h-full border-2 border-yellow-500"
          style={{
            transform: 'rotateY(90deg) translateZ(60px)',
            background: 'transparent',
          }}
        />
        {/* Face gauche */}
        <div
          className="absolute w-full h-full border-2 border-yellow-500"
          style={{
            transform: 'rotateY(-90deg) translateZ(60px)',
            background: 'transparent',
          }}
        />
        {/* Face haut */}
        <div
          className="absolute w-full h-full border-2 border-yellow-500"
          style={{
            transform: 'rotateX(90deg) translateZ(60px)',
            background: 'transparent',
          }}
        />
        {/* Face bas */}
        <div
          className="absolute w-full h-full border-2 border-yellow-500"
          style={{
            transform: 'rotateX(-90deg) translateZ(60px)',
            background: 'transparent',
          }}
        />
      </div>
    </div>
  )
}
