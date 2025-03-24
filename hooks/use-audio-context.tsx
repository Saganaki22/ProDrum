"use client"

import { createContext, useContext, useState, useEffect, type ReactNode } from "react"

interface AudioContextType {
  audioContext: AudioContext | null
  masterGainNode: GainNode | null
  isAudioInitialized: boolean
  initializeAudio: () => void
}

const AudioContext = createContext<AudioContextType>({
  audioContext: null,
  masterGainNode: null,
  isAudioInitialized: false,
  initializeAudio: () => {},
})

export function AudioContextProvider({ children }: { children: ReactNode }) {
  const [audioContext, setAudioContext] = useState<AudioContext | null>(null)
  const [masterGainNode, setMasterGainNode] = useState<GainNode | null>(null)
  const [isAudioInitialized, setIsAudioInitialized] = useState(false)

  const initializeAudio = () => {
    if (isAudioInitialized) return

    try {
      // Create audio context
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)()

      // Create master gain node
      const gainNode = ctx.createGain()
      gainNode.gain.value = 0.7 // Default volume
      gainNode.connect(ctx.destination)

      // Store in state
      setAudioContext(ctx)
      setMasterGainNode(gainNode)
      setIsAudioInitialized(true)

      console.log("Audio context initialized")
    } catch (error) {
      console.error("Failed to initialize audio context:", error)
    }
  }

  // Clean up on unmount
  useEffect(() => {
    return () => {
      if (audioContext) {
        audioContext.close()
      }
    }
  }, [audioContext])

  return (
    <AudioContext.Provider
      value={{
        audioContext,
        masterGainNode,
        isAudioInitialized,
        initializeAudio,
      }}
    >
      {children}
    </AudioContext.Provider>
  )
}

export function useAudioContext() {
  return useContext(AudioContext)
}

