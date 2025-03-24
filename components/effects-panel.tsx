"use client"

import { useState, useEffect } from "react"
import Knob from "@/components/knob"

interface EffectsPanelProps {
  selectedPad: string | null
  activeKit?: string
}

export default function EffectsPanel({ selectedPad, activeKit = "default" }: EffectsPanelProps) {
  const [effects, setEffects] = useState({
    pitch: 0.5,
    filter: 1.0,
    reverb: 0.3,
    delay: 0.0,
    distortion: 0.0,
  })

  const [effectsEnabled, setEffectsEnabled] = useState({
    pitch: true,
    filter: true,
    reverb: false,
    delay: false,
    distortion: false,
  })

  // In a real app, we would load/save effects settings for each pad
  useEffect(() => {
    if (selectedPad) {
      // Try to load from localStorage first
      const key = `effects-${selectedPad}-${activeKit}`
      const savedData = localStorage.getItem(key)

      if (savedData) {
        try {
          const parsed = JSON.parse(savedData)
          setEffects(parsed.effects)
          setEffectsEnabled(parsed.effectsEnabled)
          return
        } catch (e) {
          console.error("Error loading effects", e)
        }
      }

      // If no saved data, reset to defaults
      setEffects({
        pitch: 0.5,
        filter: 1.0,
        reverb: 0.3,
        delay: 0.0,
        distortion: 0.0,
      })

      setEffectsEnabled({
        pitch: true,
        filter: true,
        reverb: false,
        delay: false,
        distortion: false,
      })
    }
  }, [selectedPad, activeKit])

  const handleEffectChange = (effect: string, value: number) => {
    setEffects((prev) => {
      const newEffects = {
        ...prev,
        [effect]: value,
      }

      // Save to localStorage
      if (selectedPad) {
        const key = `effects-${selectedPad}-${activeKit || "default"}`
        localStorage.setItem(
          key,
          JSON.stringify({
            effects: newEffects,
            effectsEnabled,
          }),
        )
      }

      return newEffects
    })
  }

  const toggleEffect = (effect: string) => {
    setEffectsEnabled((prev) => {
      const newEffectsEnabled = {
        ...prev,
        [effect]: !prev[effect],
      }

      // Save to localStorage
      if (selectedPad) {
        const key = `effects-${selectedPad}-${activeKit || "default"}`
        localStorage.setItem(
          key,
          JSON.stringify({
            effects,
            effectsEnabled: newEffectsEnabled,
          }),
        )
      }

      return newEffectsEnabled
    })
  }

  return (
    <div className="space-y-6">
      {!selectedPad ? (
        <div className="text-center text-gray-400 py-4">
          Select a pad to edit effects (Shift+click or right-click on a pad)
        </div>
      ) : (
        <>
          <div className="text-sm text-gray-400 mb-4">
            Editing effects for: <span className="text-cyan-400 font-semibold">{selectedPad.toUpperCase()}</span>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
            <div className="flex flex-col items-center gap-2">
              <Knob
                value={effects.pitch}
                onChange={(value) => handleEffectChange("pitch", value)}
                isActive={effectsEnabled.pitch}
                onToggle={() => toggleEffect("pitch")}
                label="PITCH"
                color="bg-gradient-to-r from-cyan-500 to-blue-500"
              />
            </div>

            <div className="flex flex-col items-center gap-2">
              <Knob
                value={effects.filter}
                onChange={(value) => handleEffectChange("filter", value)}
                isActive={effectsEnabled.filter}
                onToggle={() => toggleEffect("filter")}
                label="FILTER"
                color="bg-gradient-to-r from-purple-500 to-indigo-500"
              />
            </div>

            <div className="flex flex-col items-center gap-2">
              <Knob
                value={effects.reverb}
                onChange={(value) => handleEffectChange("reverb", value)}
                isActive={effectsEnabled.reverb}
                onToggle={() => toggleEffect("reverb")}
                label="REVERB"
                color="bg-gradient-to-r from-pink-500 to-rose-500"
              />
            </div>

            <div className="flex flex-col items-center gap-2">
              <Knob
                value={effects.delay}
                onChange={(value) => handleEffectChange("delay", value)}
                isActive={effectsEnabled.delay}
                onToggle={() => toggleEffect("delay")}
                label="DELAY"
                color="bg-gradient-to-r from-amber-500 to-orange-500"
              />
            </div>

            <div className="flex flex-col items-center gap-2">
              <Knob
                value={effects.distortion}
                onChange={(value) => handleEffectChange("distortion", value)}
                isActive={effectsEnabled.distortion}
                onToggle={() => toggleEffect("distortion")}
                label="DIST"
                color="bg-gradient-to-r from-emerald-500 to-green-500"
              />
            </div>

            <div className="flex flex-col items-center gap-2">
              <Knob
                value={0.7}
                onChange={() => {}}
                isActive={true}
                label="MASTER"
                color="bg-gradient-to-r from-sky-500 to-cyan-500"
              />
            </div>
          </div>
        </>
      )}
    </div>
  )
}

