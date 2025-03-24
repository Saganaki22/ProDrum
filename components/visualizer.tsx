"use client"

import { useRef, useEffect } from "react"
import { useAudioContext } from "@/hooks/use-audio-context"

export default function Visualizer() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const animationRef = useRef<number>(0)
  const { audioContext, masterGainNode } = useAudioContext()
  const analyzerRef = useRef<AnalyserNode | null>(null)

  useEffect(() => {
    if (!audioContext || !masterGainNode || !canvasRef.current) return

    // Create analyzer if it doesn't exist
    if (!analyzerRef.current) {
      const analyzer = audioContext.createAnalyser()
      analyzer.fftSize = 2048
      masterGainNode.connect(analyzer)
      analyzerRef.current = analyzer
    }

    const canvas = canvasRef.current
    const ctx = canvas.getContext("2d")
    if (!ctx) return

    // Ensure canvas is properly sized
    const resizeCanvas = () => {
      if (canvas.parentElement) {
        canvas.width = canvas.parentElement.clientWidth
        canvas.height = canvas.parentElement.clientHeight
      }
    }

    resizeCanvas()
    window.addEventListener("resize", resizeCanvas)

    // Start visualization loop
    const draw = () => {
      if (!ctx || !analyzerRef.current) return

      // Get canvas dimensions
      const width = canvas.width
      const height = canvas.height

      // Clear canvas
      ctx.fillStyle = "rgba(13, 13, 13, 0.2)"
      ctx.fillRect(0, 0, width, height)

      // Get waveform data
      const bufferLength = analyzerRef.current.frequencyBinCount
      const dataArray = new Uint8Array(bufferLength)
      analyzerRef.current.getByteTimeDomainData(dataArray)

      // Draw waveform
      ctx.lineWidth = 2
      ctx.strokeStyle = "rgba(58, 134, 255, 0.8)"
      ctx.beginPath()

      const sliceWidth = width / bufferLength
      let x = 0

      for (let i = 0; i < bufferLength; i++) {
        const v = dataArray[i] / 128.0
        const y = (v * height) / 2

        if (i === 0) {
          ctx.moveTo(x, y)
        } else {
          ctx.lineTo(x, y)
        }

        x += sliceWidth
      }

      ctx.lineTo(width, height / 2)
      ctx.stroke()

      // Add frequency bars in background
      const freqData = new Uint8Array(bufferLength)
      analyzerRef.current.getByteFrequencyData(freqData)

      const barWidth = (width / bufferLength) * 4
      let barHeight

      ctx.fillStyle = "rgba(91, 33, 182, 0.3)"

      for (let i = 0; i < bufferLength; i++) {
        barHeight = ((freqData[i] / 255) * height) / 2

        // Only draw every few bars for performance
        if (i % 4 === 0) {
          ctx.fillRect(i * 4, height - barHeight, barWidth > 1 ? barWidth : 1, barHeight)
        }
      }

      // Schedule next frame
      animationRef.current = requestAnimationFrame(draw)
    }

    draw()

    return () => {
      cancelAnimationFrame(animationRef.current)
      window.removeEventListener("resize", resizeCanvas)
    }
  }, [audioContext, masterGainNode])

  return (
    <div className="w-full h-16 bg-gray-950 rounded-lg overflow-hidden shadow-inner border border-gray-800">
      <canvas ref={canvasRef} className="w-full h-full" />
    </div>
  )
}

