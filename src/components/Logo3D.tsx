import { useState, useEffect, useRef } from 'react'

interface Logo3DProps {
  className?: string
}

export function Logo3D({ className = '' }: Logo3DProps) {
  const [isHovered, setIsHovered] = useState(false)
  const [isDragging, setIsDragging] = useState(false)
  const [rotation, setRotation] = useState({ x: -15, y: 45 })
  const [dragStart, setDragStart] = useState<{ x: number; y: number } | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!isHovered && !isDragging) {
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
  }, [isHovered, isDragging])

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true)
    setDragStart({ x: e.clientX, y: e.clientY })
  }

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || !dragStart) return
    const deltaX = e.clientX - dragStart.x
    const deltaY = e.clientY - dragStart.y
    setRotation((prev) => ({
      x: prev.x - deltaY * 0.5,
      y: prev.y + deltaX * 0.5,
    }))
    setDragStart({ x: e.clientX, y: e.clientY })
  }

  const handleMouseUp = () => {
    setIsDragging(false)
    setDragStart(null)
  }

  return (
    <div
      ref={containerRef}
      className={`relative w-20 h-20 ${className}`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => {
        setIsHovered(false)
        setIsDragging(false)
        setDragStart(null)
      }}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
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
        {/* Face avant */}
        <div
          className="absolute w-full h-full bg-yellow-500 border-2 border-yellow-600"
          style={{
            transform: 'translateZ(40px)',
          }}
        />
        {/* Face arrière */}
        <div
          className="absolute w-full h-full bg-yellow-600 border-2 border-yellow-700"
          style={{
            transform: 'translateZ(-40px) rotateY(180deg)',
          }}
        />
        {/* Face droite */}
        <div
          className="absolute w-full h-full bg-yellow-400 border-2 border-yellow-500"
          style={{
            transform: 'rotateY(90deg) translateZ(40px)',
          }}
        />
        {/* Face gauche */}
        <div
          className="absolute w-full h-full bg-yellow-600 border-2 border-yellow-700"
          style={{
            transform: 'rotateY(-90deg) translateZ(40px)',
          }}
        />
        {/* Face haut */}
        <div
          className="absolute w-full h-full bg-yellow-500 border-2 border-yellow-600"
          style={{
            transform: 'rotateX(90deg) translateZ(40px)',
          }}
        />
        {/* Face bas */}
        <div
          className="absolute w-full h-full bg-yellow-700 border-2 border-yellow-800"
          style={{
            transform: 'rotateX(-90deg) translateZ(40px)',
          }}
        />
      </div>
    </div>
  )
}
