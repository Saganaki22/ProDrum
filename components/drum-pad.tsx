"use client"

import type React from "react"

import { useState, useEffect, useRef } from "react"
import { cn } from "@/lib/utils"
import { useAudioContext } from "@/hooks/use-audio-context"

// Update the DrumPad interface to include activeKit and custom sample
interface DrumPadProps {
  id: string
  label: string
  keyTrigger: string
  keyCode: number
  onTrigger: (id: string, label: string, triggerFunction?: Function) => void
  onSelect: (id: string) => void
  isSelected?: boolean
  isActive?: boolean
  activeKit: string
  customSample?: AudioBuffer | null
}

// Update the DrumPad component to include data-pad-id attribute and pass the trigger function
export default function DrumPad({
  id,
  label,
  keyTrigger,
  keyCode,
  onTrigger,
  onSelect,
  isSelected = false,
  isActive = false,
  activeKit,
  customSample,
}: DrumPadProps) {
  const [color, setColor] = useState<string>(() => {
    // Generate a random color from a predefined palette
    const colors = [
      "from-cyan-500 to-blue-500",
      "from-purple-500 to-indigo-500",
      "from-pink-500 to-rose-500",
      "from-amber-500 to-orange-500",
      "from-emerald-500 to-green-500",
      "from-fuchsia-500 to-purple-500",
      "from-sky-500 to-cyan-500",
      "from-violet-500 to-purple-500",
    ]
    return colors[Math.floor(Math.random() * colors.length)]
  })

  const { audioContext, masterGainNode, isAudioInitialized } = useAudioContext()
  const audioBufferRef = useRef<AudioBuffer | null>(null)
  const hasCustomSampleRef = useRef<boolean>(false)

  // Load the sample
  useEffect(() => {
    if (audioContext) {
      // If we have a custom sample, use it
      if (customSample) {
        audioBufferRef.current = customSample
        hasCustomSampleRef.current = true
      } else {
        // Otherwise load the default sample
        loadSample()
        hasCustomSampleRef.current = false
      }
    }
  }, [audioContext, id, activeKit, customSample])

  // Handle keyboard events
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.repeat) return // Prevent holding key

      if (e.keyCode === keyCode) {
        triggerPad()

        // Select pad if shift key is held
        if (e.shiftKey) {
          onSelect(id)
        }
      }
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [keyCode, audioContext, masterGainNode])

  // Modify the loadSample function to create different sounds based on the kit
  const loadSample = async () => {
    if (!audioContext) return

    try {
      // Try to load custom sample from IndexedDB first
      const customBuffer = await loadCustomSampleFromIndexedDB(id)

      if (customBuffer) {
        audioBufferRef.current = customBuffer
        hasCustomSampleRef.current = true
        return
      }

      // If no custom sample, create a synthetic drum sound based on the pad id and active kit
      let buffer: AudioBuffer

      switch (id) {
        case "kick":
          buffer =
            activeKit === "electronic"
              ? createElectronicKick(audioContext)
              : activeKit === "hiphop"
                ? createHipHopKick(audioContext)
                : createKickSound(audioContext)
          break
        case "snare":
          buffer =
            activeKit === "electronic"
              ? createElectronicSnare(audioContext)
              : activeKit === "hiphop"
                ? createHipHopSnare(audioContext)
                : createSnareSound(audioContext)
          break
        case "hihat":
          buffer =
            activeKit === "electronic"
              ? createElectronicHiHat(audioContext)
              : activeKit === "hiphop"
                ? createHipHopHiHat(audioContext)
                : createHiHatSound(audioContext)
          break
        case "clap":
          buffer =
            activeKit === "electronic"
              ? createElectronicClap(audioContext)
              : activeKit === "hiphop"
                ? createHipHopClap(audioContext)
                : createClapSound(audioContext)
          break
        case "tom1":
          buffer =
            activeKit === "electronic"
              ? createElectronicTom(audioContext, 200)
              : activeKit === "hiphop"
                ? createTomSound(audioContext, 160)
                : createTomSound(audioContext, 180)
          break
        case "tom2":
          buffer =
            activeKit === "electronic"
              ? createElectronicTom(audioContext, 150)
              : activeKit === "hiphop"
                ? createTomSound(audioContext, 120)
                : createTomSound(audioContext, 140)
          break
        case "crash":
          buffer =
            activeKit === "electronic"
              ? createElectronicCrash(audioContext)
              : activeKit === "hiphop"
                ? createCymbalSound(audioContext, "crash", 1.2)
                : createCymbalSound(audioContext, "crash")
          break
        case "ride":
          buffer =
            activeKit === "electronic"
              ? createElectronicRide(audioContext)
              : activeKit === "hiphop"
                ? createCymbalSound(audioContext, "ride", 0.8)
                : createCymbalSound(audioContext, "ride")
          break
        default:
          buffer = createDefaultSound(audioContext)
      }

      audioBufferRef.current = buffer
      hasCustomSampleRef.current = false
    } catch (error) {
      console.error("Error loading sample:", error)
    }
  }

  const loadCustomSampleFromIndexedDB = (padId: string): Promise<AudioBuffer | null> => {
    return new Promise((resolve) => {
      if (!audioContext) {
        resolve(null)
        return
      }

      try {
        const dbRequest = indexedDB.open("DrumMachineSamples", 1)

        dbRequest.onupgradeneeded = (event) => {
          const db = (event.target as IDBRequest).result
          if (!db.objectStoreNames.contains("samples")) {
            db.createObjectStore("samples")
          }
        }

        dbRequest.onsuccess = (event) => {
          const db = (event.target as IDBRequest).result
          const transaction = db.transaction(["samples"], "readonly")
          const store = transaction.objectStore("samples")

          const request = store.get(padId)

          request.onsuccess = async () => {
            if (request.result && audioContext) {
              try {
                // Decode the audio data
                const audioBuffer = await audioContext.decodeAudioData(request.result)
                resolve(audioBuffer)
              } catch (error) {
                console.error("Error decoding audio data:", error)
                resolve(null)
              }
            } else {
              resolve(null)
            }
          }

          request.onerror = () => {
            console.error("Error loading sample from IndexedDB")
            resolve(null)
          }
        }

        dbRequest.onerror = () => {
          console.error("IndexedDB error")
          resolve(null)
        }
      } catch (error) {
        console.error("Error accessing IndexedDB:", error)
        resolve(null)
      }
    })
  }

  const triggerPad = (scheduledTime?: number) => {
    if (!audioContext || !masterGainNode || !audioBufferRef.current) return

    // Create source node
    const source = audioContext.createBufferSource()
    source.buffer = audioBufferRef.current

    // Create gain node for this sound
    const gainNode = audioContext.createGain()
    gainNode.gain.value = 1.0

    // Create effect nodes
    let chain: AudioNode = source

    // Get effects settings from localStorage if available
    const effectsKey = `effects-${id}-${activeKit}`
    const effectsData = localStorage.getItem(effectsKey)
    let effects = null
    let effectsEnabled = null

    if (effectsData) {
      try {
        const parsed = JSON.parse(effectsData)
        effects = parsed.effects
        effectsEnabled = parsed.effectsEnabled
      } catch (e) {
        console.error("Error parsing effects data", e)
      }
    }

    // Apply effects if available
    if (effects && effectsEnabled) {
      // 1. Pitch effect
      if (effectsEnabled.pitch) {
        source.detune.value = (effects.pitch - 0.5) * 1200 // -600 to +600 cents
      }

      // 2. Filter effect
      if (effectsEnabled.filter) {
        const filter = audioContext.createBiquadFilter()
        filter.type = "lowpass"
        filter.frequency.value = effects.filter * 15000 + 100 // 100Hz to 15100Hz
        chain.connect(filter)
        chain = filter
      }

      // 3. Distortion effect
      if (effectsEnabled.distortion && effects.distortion > 0) {
        const distortion = audioContext.createWaveShaper()
        const amount = effects.distortion * 100
        distortion.curve = createDistortionCurve(amount)
        chain.connect(distortion)
        chain = distortion
      }

      // 4. Delay effect
      if (effectsEnabled.delay && effects.delay > 0) {
        const delay = audioContext.createDelay()
        delay.delayTime.value = effects.delay * 0.5 // 0 to 0.5 seconds

        const feedback = audioContext.createGain()
        feedback.gain.value = 0.4

        const delayGain = audioContext.createGain()
        delayGain.gain.value = effects.delay * 0.8

        chain.connect(delay)
        delay.connect(feedback)
        feedback.connect(delay)
        delay.connect(delayGain)

        // Mix dry and wet signals
        chain.connect(gainNode)
        delayGain.connect(gainNode)
        chain = gainNode
      } else {
        chain.connect(gainNode)
        chain = gainNode
      }

      // 5. Reverb effect (simplified)
      if (effectsEnabled.reverb && effects.reverb > 0) {
        const convolver = audioContext.createConvolver()
        // Create a simple impulse response
        const reverbTime = effects.reverb * 2 // 0 to 2 seconds
        const rate = audioContext.sampleRate
        const length = rate * reverbTime
        const impulse = audioContext.createBuffer(2, length, rate)
        const left = impulse.getChannelData(0)
        const right = impulse.getChannelData(1)

        for (let i = 0; i < length; i++) {
          const n = i / length
          // Decay curve
          left[i] = (Math.random() * 2 - 1) * Math.pow(1 - n, reverbTime)
          right[i] = (Math.random() * 2 - 1) * Math.pow(1 - n, reverbTime)
        }

        convolver.buffer = impulse

        const reverbGain = audioContext.createGain()
        reverbGain.gain.value = effects.reverb * 0.5

        chain.connect(convolver)
        convolver.connect(reverbGain)
        reverbGain.connect(masterGainNode)
      }
    } else {
      // No effects, connect directly
      chain.connect(gainNode)
    }

    // Connect the final node to the master gain
    if (chain !== masterGainNode) {
      chain.connect(masterGainNode)
    }

    // Play the sound (either immediately or at scheduled time)
    if (scheduledTime !== undefined) {
      source.start(scheduledTime)
    } else {
      source.start()

      // Notify parent
      onTrigger(id, label, (time?: number) => triggerPad(time))
    }
  }

  const handlePadClick = (e: React.MouseEvent) => {
    triggerPad()

    // Select pad if right click or shift key
    if (e.button === 2 || e.shiftKey) {
      e.preventDefault()
      onSelect(id)
    }
  }

  const handlePadContextMenu = (e: React.MouseEvent) => {
    e.preventDefault()
    onSelect(id)
    return false
  }

  return (
    <div
      className={cn(
        "drum-pad aspect-square relative rounded-lg shadow-lg cursor-pointer",
        "bg-gray-800 border border-gray-700 overflow-hidden",
        "transition-transform duration-100 transform",
        isActive && "scale-[0.98] shadow-sm",
        isSelected && "ring-2 ring-cyan-500 ring-offset-2 ring-offset-gray-900",
        hasCustomSampleRef.current && "border-cyan-500",
      )}
      data-pad-id={id}
      onMouseDown={handlePadClick}
      onContextMenu={handlePadContextMenu}
    >
      {/* Indicator light */}
      <div
        className={cn(
          "pad-indicator absolute top-2 left-2 w-2 h-2 rounded-full bg-gray-600",
          isActive && "bg-green-500 shadow-glow-green active-indicator",
          hasCustomSampleRef.current && !isActive && "bg-cyan-500",
          "transition-all duration-100",
        )}
      />

      {/* Custom sample indicator */}
      {hasCustomSampleRef.current && (
        <div className="absolute top-2 right-2 w-2 h-2 rounded-full bg-cyan-500 shadow-glow-cyan" />
      )}

      {/* Glow effect */}
      <div
        className={cn(
          "absolute inset-0 bg-gradient-to-br opacity-0 transition-opacity",
          color,
          isActive && "opacity-40",
        )}
      />

      {/* Label */}
      <div className="absolute bottom-2 left-2 text-xs text-gray-300">
        {label} ({keyTrigger})
      </div>
    </div>
  )
}

// Synthetic drum sound generators
function createKickSound(ctx: AudioContext): AudioBuffer {
  const duration = 0.5
  const buffer = ctx.createBuffer(2, duration * ctx.sampleRate, ctx.sampleRate)
  const left = buffer.getChannelData(0)
  const right = buffer.getChannelData(1)

  for (let i = 0; i < buffer.length; i++) {
    const t = i / ctx.sampleRate
    // Frequency drop from 150Hz to 40Hz
    const freq = 150 * Math.pow(40 / 150, t * 10)
    const sample = Math.sin(2 * Math.PI * freq * t)
    // Amplitude envelope
    const amp = Math.exp(-5 * t)
    left[i] = sample * amp
    right[i] = sample * amp
  }

  return buffer
}

function createSnareSound(ctx: AudioContext): AudioBuffer {
  const duration = 0.3
  const buffer = ctx.createBuffer(2, duration * ctx.sampleRate, ctx.sampleRate)
  const left = buffer.getChannelData(0)
  const right = buffer.getChannelData(1)

  for (let i = 0; i < buffer.length; i++) {
    const t = i / ctx.sampleRate
    // Mix of tone and noise
    const tone = Math.sin(2 * Math.PI * 180 * t)
    const noise = Math.random() * 2 - 1
    // Different decay rates
    const toneEnv = Math.exp(-15 * t)
    const noiseEnv = Math.exp(-7 * t)
    const sample = tone * toneEnv * 0.7 + noise * noiseEnv * 0.3
    left[i] = sample
    right[i] = sample
  }

  return buffer
}

function createHiHatSound(ctx: AudioContext): AudioBuffer {
  const duration = 0.15
  const buffer = ctx.createBuffer(2, duration * ctx.sampleRate, ctx.sampleRate)
  const left = buffer.getChannelData(0)
  const right = buffer.getChannelData(1)

  for (let i = 0; i < buffer.length; i++) {
    const t = i / ctx.sampleRate
    const noise = Math.random() * 2 - 1
    const env = Math.exp(-50 * t)
    // Apply bandpass filtering effect (simulated)
    const filtered = noise * (0.5 + 0.5 * Math.sin(2 * Math.PI * 8000 * t))
    left[i] = filtered * env
    right[i] = filtered * env
  }

  return buffer
}

function createClapSound(ctx: AudioContext): AudioBuffer {
  const duration = 0.3
  const buffer = ctx.createBuffer(2, duration * ctx.sampleRate, ctx.sampleRate)
  const left = buffer.getChannelData(0)
  const right = buffer.getChannelData(1)

  for (let i = 0; i < buffer.length; i++) {
    const t = i / ctx.sampleRate
    let sample = 0

    // Create multiple transients
    for (let j = 0; j < 5; j++) {
      const burstTime = j * 0.005
      if (t >= burstTime) {
        const localTime = t - burstTime
        const noise = Math.random() * 2 - 1
        const env = Math.exp(-40 * localTime)
        sample += noise * env * (1 - j * 0.15)
      }
    }

    // Add the main burst
    const mainNoise = Math.random() * 2 - 1
    const mainEnv = Math.exp(-10 * t)
    sample += mainNoise * mainEnv * 0.5

    left[i] = sample
    right[i] = sample
  }

  return buffer
}

function createTomSound(ctx: AudioContext, baseFreq: number): AudioBuffer {
  const duration = 0.6
  const buffer = ctx.createBuffer(2, duration * ctx.sampleRate, ctx.sampleRate)
  const left = buffer.getChannelData(0)
  const right = buffer.getChannelData(1)

  for (let i = 0; i < buffer.length; i++) {
    const t = i / ctx.sampleRate
    // Frequency drop
    const freq = baseFreq * Math.pow(0.8, t * 5)
    const tone = Math.sin(2 * Math.PI * freq * t)
    // Add noise for attack
    const noise = Math.random() * 2 - 1
    const noiseEnv = Math.exp(-50 * t)
    // Envelope
    const env = Math.exp(-5 * t)
    const output = (tone * 0.8 + noise * noiseEnv * 0.2) * env
    left[i] = output
    right[i] = output
  }

  return buffer
}

// Add a parameter for cymbal duration
function createCymbalSound(ctx: AudioContext, type: string, durationMultiplier = 1): AudioBuffer {
  const duration = type === "crash" ? 1.5 * durationMultiplier : 1.0 * durationMultiplier
  const buffer = ctx.createBuffer(2, duration * ctx.sampleRate, ctx.sampleRate)
  const left = buffer.getChannelData(0)
  const right = buffer.getChannelData(1)

  const freqs =
    type === "crash"
      ? [300, 450, 600, 750, 900, 1200, 1600, 2000, 2500, 3000]
      : [400, 800, 1200, 1800, 2400, 3000, 3600]
  const decay = type === "crash" ? 3 : 5

  for (let i = 0; i < buffer.length; i++) {
    const t = i / ctx.sampleRate
    let sample = 0

    // Mix multiple frequencies
    for (let j = 0; j < freqs.length; j++) {
      const f = freqs[j]
      const phase = j * 0.2
      sample += Math.sin(2 * Math.PI * f * t + phase) * 0.1
    }

    // Add noise
    const noise = Math.random() * 2 - 1

    // Envelope
    const attackEnv = Math.min(1, t * 10)
    const decayEnv = Math.exp(-decay * t)

    // Mix tone and noise
    const mixRatio = type === "crash" ? 0.3 : 0.4
    const output = (sample * mixRatio + noise * (1 - mixRatio)) * attackEnv * decayEnv

    left[i] = output
    right[i] = output
  }

  return buffer
}

function createDefaultSound(ctx: AudioContext): AudioBuffer {
  const duration = 0.2
  const buffer = ctx.createBuffer(2, duration * ctx.sampleRate, ctx.sampleRate)
  const left = buffer.getChannelData(0)
  const right = buffer.getChannelData(1)

  for (let i = 0; i < buffer.length; i++) {
    const t = i / ctx.sampleRate
    const sample = Math.sin(2 * Math.PI * 440 * t) * Math.exp(-10 * t)
    left[i] = sample
    right[i] = sample
  }

  return buffer
}

// Add these new sound generation functions at the end of the file:

// Electronic kit sounds
function createElectronicKick(ctx: AudioContext): AudioBuffer {
  const duration = 0.4
  const buffer = ctx.createBuffer(2, duration * ctx.sampleRate, ctx.sampleRate)
  const left = buffer.getChannelData(0)
  const right = buffer.getChannelData(1)

  for (let i = 0; i < buffer.length; i++) {
    const t = i / ctx.sampleRate
    // More electronic kick with sharper attack
    const freq = 60 * Math.pow(40 / 60, t * 8)
    const sample = Math.sin(2 * Math.PI * freq * t)
    // Sharper envelope
    const amp = Math.exp(-8 * t)
    // Add some distortion
    const distortion = Math.sin(2 * Math.PI * freq * 1.01 * t) * 0.2
    left[i] = (sample + distortion) * amp
    right[i] = (sample + distortion) * amp
  }

  return buffer
}

function createElectronicSnare(ctx: AudioContext): AudioBuffer {
  const duration = 0.25
  const buffer = ctx.createBuffer(2, duration * ctx.sampleRate, ctx.sampleRate)
  const left = buffer.getChannelData(0)
  const right = buffer.getChannelData(1)

  for (let i = 0; i < buffer.length; i++) {
    const t = i / ctx.sampleRate
    // More electronic snare with higher pitch
    const tone = Math.sin(2 * Math.PI * 220 * t)
    const noise = Math.random() * 2 - 1
    // Sharper decay
    const toneEnv = Math.exp(-20 * t)
    const noiseEnv = Math.exp(-10 * t)
    // More noise component
    const sample = tone * toneEnv * 0.5 + noise * noiseEnv * 0.5
    left[i] = sample
    right[i] = sample
  }

  return buffer
}

function createElectronicHiHat(ctx: AudioContext): AudioBuffer {
  const duration = 0.1
  const buffer = ctx.createBuffer(2, duration * ctx.sampleRate, ctx.sampleRate)
  const left = buffer.getChannelData(0)
  const right = buffer.getChannelData(1)

  for (let i = 0; i < buffer.length; i++) {
    const t = i / ctx.sampleRate
    const noise = Math.random() * 2 - 1
    // Sharper decay for electronic sound
    const env = Math.exp(-70 * t)
    // Higher frequency filtering
    const filtered = noise * (0.5 + 0.5 * Math.sin(2 * Math.PI * 10000 * t))
    left[i] = filtered * env
    right[i] = filtered * env
  }

  return buffer
}

function createElectronicClap(ctx: AudioContext): AudioBuffer {
  const duration = 0.2
  const buffer = ctx.createBuffer(2, duration * ctx.sampleRate, ctx.sampleRate)
  const left = buffer.getChannelData(0)
  const right = buffer.getChannelData(1)

  for (let i = 0; i < buffer.length; i++) {
    const t = i / ctx.sampleRate

    // Electronic clap with bandpass filtered noise
    const noise = Math.random() * 2 - 1

    // Create a bandpass filter effect
    const filtered = noise * (0.5 + 0.5 * Math.sin(2 * Math.PI * 2000 * t))

    // Envelope with quick attack and medium decay
    let env
    if (t < 0.005) {
      env = t / 0.005 // Quick attack
    } else {
      env = Math.exp(-15 * (t - 0.005)) // Decay
    }

    left[i] = filtered * env
    right[i] = filtered * env
  }

  return buffer
}

function createElectronicCrash(ctx: AudioContext): AudioBuffer {
  const duration = 1.0
  const buffer = ctx.createBuffer(2, duration * ctx.sampleRate, ctx.sampleRate)
  const left = buffer.getChannelData(0)
  const right = buffer.getChannelData(1)

  for (let i = 0; i < buffer.length; i++) {
    const t = i / ctx.sampleRate

    // White noise with bandpass filter
    const noise = Math.random() * 2 - 1

    // Envelope with quick attack and long decay
    const env = Math.exp(-3 * t)

    // Apply bandpass filtering (simulated)
    const filtered = noise * (0.5 + 0.5 * Math.sin(2 * Math.PI * 5000 * t))

    left[i] = filtered * env
    right[i] = filtered * env
  }

  return buffer
}

function createElectronicRide(ctx: AudioContext): AudioBuffer {
  const duration = 0.8
  const buffer = ctx.createBuffer(2, duration * ctx.sampleRate, ctx.sampleRate)
  const left = buffer.getChannelData(0)
  const right = buffer.getChannelData(1)

  const baseFreq = 800

  for (let i = 0; i < buffer.length; i++) {
    const t = i / ctx.sampleRate

    // Main tone
    const tone = Math.sin(2 * Math.PI * baseFreq * t)

    // Create harmonics
    const harmonic1 = Math.sin(2 * Math.PI * baseFreq * 1.5 * t) * 0.3
    const harmonic2 = Math.sin(2 * Math.PI * baseFreq * 2 * t) * 0.2

    // Envelope with quick attack and longer decay
    const env = Math.exp(-6 * t)

    const output = (tone + harmonic1 + harmonic2) * env

    left[i] = output
    right[i] = output
  }

  return buffer
}

// Hip Hop kit sounds
function createHipHopKick(ctx: AudioContext): AudioBuffer {
  const duration = 0.6
  const buffer = ctx.createBuffer(2, duration * ctx.sampleRate, ctx.sampleRate)
  const left = buffer.getChannelData(0)
  const right = buffer.getChannelData(1)

  for (let i = 0; i < buffer.length; i++) {
    const t = i / ctx.sampleRate
    // Hip hop kick with deeper bass
    const freq = 30 * Math.pow(40 / 30, t * 5)
    const sample = Math.sin(2 * Math.PI * freq * t)
    // Longer sustain
    const amp = Math.exp(-4 * t)
    left[i] = sample * amp
    right[i] = sample * amp
  }

  return buffer
}

function createHipHopSnare(ctx: AudioContext): AudioBuffer {
  const duration = 0.4
  const buffer = ctx.createBuffer(2, duration * ctx.sampleRate, ctx.sampleRate)
  const left = buffer.getChannelData(0)
  const right = buffer.getChannelData(1)

  for (let i = 0; i < buffer.length; i++) {
    const t = i / ctx.sampleRate
    // Hip hop snare with lower pitch
    const tone = Math.sin(2 * Math.PI * 150 * t)
    const noise = Math.random() * 2 - 1
    // Longer decay
    const toneEnv = Math.exp(-10 * t)
    const noiseEnv = Math.exp(-5 * t)
    // More tone component
    const sample = tone * toneEnv * 0.6 + noise * noiseEnv * 0.4
    left[i] = sample
    right[i] = sample
  }

  return buffer
}

function createHipHopHiHat(ctx: AudioContext): AudioBuffer {
  const duration = 0.12
  const buffer = ctx.createBuffer(2, duration * ctx.sampleRate, ctx.sampleRate)
  const left = buffer.getChannelData(0)
  const right = buffer.getChannelData(1)

  for (let i = 0; i < buffer.length; i++) {
    const t = i / ctx.sampleRate
    const noise = Math.random() * 2 - 1
    // Medium decay for hip hop sound
    const env = Math.exp(-60 * t)
    // Lower frequency filtering
    const filtered = noise * (0.5 + 0.5 * Math.sin(2 * Math.PI * 7000 * t))
    left[i] = filtered * env
    right[i] = filtered * env
  }

  return buffer
}

function createHipHopClap(ctx: AudioContext): AudioBuffer {
  const duration = 0.3
  const buffer = ctx.createBuffer(2, duration * ctx.sampleRate, ctx.sampleRate)
  const left = buffer.getChannelData(0)
  const right = buffer.getChannelData(1)

  for (let i = 0; i < buffer.length; i++) {
    const t = i / ctx.sampleRate
    let sample = 0

    // Create multiple transients with wider spacing
    for (let j = 0; j < 4; j++) {
      const burstTime = j * 0.008
      if (t >= burstTime) {
        const localTime = t - burstTime
        const noise = Math.random() * 2 - 1
        const env = Math.exp(-30 * localTime)
        sample += noise * env * (1 - j * 0.2)
      }
    }

    // Add the main burst with more reverb-like tail
    const mainNoise = Math.random() * 2 - 1
    const mainEnv = Math.exp(-8 * t)
    sample += mainNoise * mainEnv * 0.6

    left[i] = sample
    right[i] = sample
  }

  return buffer
}
function createElectronicTom(ctx: AudioContext, baseFreq: number): AudioBuffer {
  const duration = 0.5
  const buffer = ctx.createBuffer(2, duration * ctx.sampleRate, ctx.sampleRate)
  const left = buffer.getChannelData(0)
  const right = buffer.getChannelData(1)

  for (let i = 0; i < buffer.length; i++) {
    const t = i / ctx.sampleRate
    // Frequency drop
    const freq = baseFreq * Math.pow(0.7, t * 5)
    const tone = Math.sin(2 * Math.PI * freq * t)
    // Add noise for attack
    const noise = Math.random() * 2 - 1
    const noiseEnv = Math.exp(-50 * t)
    // Envelope
    const env = Math.exp(-7 * t)
    const output = (tone * 0.8 + noise * noiseEnv * 0.2) * env
    left[i] = output
    right[i] = output
  }

  return buffer
}

// Helper function for distortion effect
const createDistortionCurve = (amount: number) => {
  const samples = 44100
  const curve = new Float32Array(samples)
  const deg = Math.PI / 180

  for (let i = 0; i < samples; ++i) {
    const x = (i * 2) / samples - 1
    curve[i] = ((3 + amount) * x * 20 * deg) / (Math.PI + amount * Math.abs(x))
  }

  return curve
}

