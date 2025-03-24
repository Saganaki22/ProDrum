"use client"

import type React from "react"

import { useState, useRef, useEffect } from "react"
import { cn } from "@/lib/utils"

interface KnobProps {
  value: number
  onChange: (value: number) => void
  min?: number
  max?: number
  step?: number
  label?: string
  isActive?: boolean
  onToggle?: () => void
  color?: string
}

export default function Knob({
  value,
  onChange,
  min = 0,
  max = 1,
  step = 0.01,
  label,
  isActive = true,
  onToggle,
  color = "bg-gradient-to-r from-cyan-500 to-blue-500",
}: KnobProps) {
  const [isDragging, setIsDragging] = useState(false)
  const knobRef = useRef<HTMLDivElement>(null)
  const startYRef = useRef<number>(0)
  const startValueRef = useRef<number>(0)
  const touchStartTimeRef = useRef<number>(0)

  // Calculate rotation angle based on value
  const getRotationAngle = (val: number) => {
    const normalized = (val - min) / (max - min)
    return -150 + normalized * 300 // -150 to 150 degrees
  }

  // Handle mouse wheel scrolling
  const handleWheel = (e: WheelEvent) => {
    e.preventDefault()

    // Determine direction and calculate new value
    const direction = e.deltaY > 0 ? -1 : 1
    const sensitivity = 0.05 // Adjust sensitivity as needed
    let newValue = value + direction * sensitivity * (max - min)

    // Clamp to min/max
    newValue = Math.max(min, Math.min(max, newValue))

    // Round to step
    newValue = Math.round(newValue / step) * step

    onChange(newValue)
  }

  // Set up wheel event listener
  useEffect(() => {
    const knob = knobRef.current
    if (!knob) return

    knob.addEventListener("wheel", handleWheel, { passive: false })

    return () => {
      knob.removeEventListener("wheel", handleWheel)
    }
  }, [value, min, max, step])

  const handleMouseDown = (e: React.MouseEvent) => {
    // Toggle active state on click if onToggle is provided
    if (e.button === 0 && !isDragging && onToggle) {
      onToggle()
      return
    }

    // Start dragging
    setIsDragging(true)
    startYRef.current = e.clientY
    startValueRef.current = value

    // Add global event listeners
    document.addEventListener("mousemove", handleMouseMove)
    document.addEventListener("mouseup", handleMouseUp)
  }

  const handleTouchStart = (e: React.TouchEvent) => {
    // Record touch start time for detecting taps
    touchStartTimeRef.current = Date.now()

    // Start dragging
    setIsDragging(true)
    startYRef.current = e.touches[0].clientY
    startValueRef.current = value

    // Add global event listeners
    document.addEventListener("touchmove", handleTouchMove, { passive: false })
    document.addEventListener("touchend", handleTouchEnd)
  }

  const handleMouseMove = (e: MouseEvent) => {
    if (!isDragging) return

    const deltaY = startYRef.current - e.clientY
    const sensitivity = 200 // Higher = less sensitive

    // Calculate new value
    let newValue = startValueRef.current + (deltaY / sensitivity) * (max - min)
    newValue = Math.max(min, Math.min(max, newValue))

    // Round to step
    newValue = Math.round(newValue / step) * step

    onChange(newValue)
  }

  const handleTouchMove = (e: TouchEvent) => {
    if (!isDragging) return

    const deltaY = startYRef.current - e.touches[0].clientY
    const sensitivity = 200 // Higher = less sensitive

    // Calculate new value
    let newValue = startValueRef.current + (deltaY / sensitivity) * (max - min)
    newValue = Math.max(min, Math.min(max, newValue))

    // Round to step
    newValue = Math.round(newValue / step) * step

    onChange(newValue)
    e.preventDefault()
  }

  const handleMouseUp = () => {
    setIsDragging(false)
    document.removeEventListener("mousemove", handleMouseMove)
    document.removeEventListener("mouseup", handleMouseUp)
  }

  const handleTouchEnd = (e: TouchEvent) => {
    setIsDragging(false)
    document.removeEventListener("touchmove", handleTouchMove)
    document.removeEventListener("touchend", handleTouchEnd)

    // Check if this was a quick tap (less than 200ms)
    const touchDuration = Date.now() - touchStartTimeRef.current
    if (touchDuration < 200 && onToggle) {
      // This was a quick tap, toggle the effect
      onToggle()
    }
  }

  // Format value for display
  const displayValue = value >= 1 ? value.toFixed(0) : value.toFixed(1)

  return (
    <div className="flex flex-col items-center gap-2">
      <div
        ref={knobRef}
        className={cn(
          "relative w-16 h-16 rounded-full cursor-pointer",
          "bg-gradient-to-b from-gray-800 to-gray-900",
          "shadow-lg border border-gray-700",
          isActive && "ring-1 ring-cyan-500 shadow-glow-cyan",
        )}
        onMouseDown={handleMouseDown}
        onTouchStart={handleTouchStart}
        style={{ touchAction: "none" }}
      >
        {/* Indicator line */}
        <div
          className={cn(
            "absolute w-1 h-6 rounded-full",
            isActive ? color : "bg-gray-600",
            "top-2 left-1/2 -translate-x-1/2 origin-bottom",
          )}
          style={{ transform: `translateX(-50%) rotate(${getRotationAngle(value)}deg)` }}
        />

        {/* Value display */}
        <div className="absolute inset-0 flex items-center justify-center text-xs font-mono text-gray-300">
          {displayValue}
        </div>
      </div>

      {label && <div className="text-xs uppercase tracking-wider text-gray-400">{label}</div>}
    </div>
  )
}

