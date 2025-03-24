"use client"

import type React from "react"

import { useEffect, useState, useRef } from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Slider } from "@/components/ui/slider"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import {
  Play,
  Pause,
  Square,
  Repeat,
  Mic,
  Save,
  Upload,
  Volume2,
  VolumeX,
  Settings,
  Music,
  Disc,
  AudioWaveformIcon as Waveform,
} from "lucide-react"
import DrumPad from "@/components/drum-pad"
import EffectsPanel from "@/components/effects-panel"
import Visualizer from "@/components/visualizer"
import { useAudioContext } from "@/hooks/use-audio-context"
import { useMobile } from "@/hooks/use-mobile"
import { cn } from "@/lib/utils"
import SampleUploader from "@/components/sample-uploader"

export default function DrumMachine() {
  const { isMobile } = useMobile()
  const { audioContext, masterGainNode, initializeAudio, isAudioInitialized } = useAudioContext()

  const [isPlaying, setIsPlaying] = useState(false)
  const [isRecording, setIsRecording] = useState(false)
  const [isLooping, setIsLooping] = useState(false)
  const [isMuted, setIsMuted] = useState(false)
  const [tempo, setTempo] = useState(120)
  const [volume, setVolume] = useState(0.7)
  const [selectedPad, setSelectedPad] = useState<string | null>(null)
  const [activeKit, setActiveKit] = useState("acoustic")
  const [recordedSequence, setRecordedSequence] = useState<any[]>([])
  const [recordingStartTime, setRecordingStartTime] = useState(0)
  const [recordingDuration, setRecordingDuration] = useState(0)
  const [displayMessage, setDisplayMessage] = useState("READY")
  const [metronomeActive, setMetronomeActive] = useState(false)
  const [ledPosition, setLedPosition] = useState<number>(-1)
  const [activePad, setActivePad] = useState<string | null>(null)
  const [customSamples, setCustomSamples] = useState<Record<string, AudioBuffer>>({})

  const metronomeIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const playbackTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const recordingTimerRef = useRef<NodeJS.Timeout | null>(null)
  const progressIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const ledRef = useRef<number>(-1)
  const recordingStartTimeRef = useRef<number>(0)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Initialize audio context on first user interaction
  const handleInitAudio = () => {
    if (!isAudioInitialized) {
      initializeAudio()
    }
  }

  // Update master volume when volume changes
  useEffect(() => {
    if (masterGainNode) {
      masterGainNode.gain.value = isMuted ? 0 : volume
    }
  }, [volume, isMuted, masterGainNode])

  // Handle metronome
  useEffect(() => {
    if (metronomeActive && audioContext) {
      startMetronome()
    } else {
      stopMetronome()
    }

    return () => stopMetronome()
  }, [metronomeActive, tempo, audioContext])

  // Clean up all intervals and timeouts when component unmounts
  useEffect(() => {
    return () => {
      if (metronomeIntervalRef.current) clearInterval(metronomeIntervalRef.current)
      if (playbackTimeoutRef.current) clearTimeout(playbackTimeoutRef.current)
      if (recordingTimerRef.current) clearInterval(recordingTimerRef.current)
      if (progressIntervalRef.current) clearInterval(progressIntervalRef.current)
    }
  }, [])

  const startMetronome = () => {
    if (metronomeIntervalRef.current) {
      clearInterval(metronomeIntervalRef.current)
    }

    let count = 0
    const interval = 60000 / tempo

    metronomeIntervalRef.current = setInterval(() => {
      playMetronomeSound(count % 4 === 0)
      updateLED(count % 8)
      count++
    }, interval)
  }

  const stopMetronome = () => {
    if (metronomeIntervalRef.current) {
      clearInterval(metronomeIntervalRef.current)
      metronomeIntervalRef.current = null
    }
    updateLED(-1)
  }

  const playMetronomeSound = (accentBeat: boolean) => {
    if (!audioContext) return

    const osc = audioContext.createOscillator()
    const gain = audioContext.createGain()

    osc.frequency.value = accentBeat ? 1000 : 800

    gain.gain.setValueAtTime(0, audioContext.currentTime)
    gain.gain.linearRampToValueAtTime(accentBeat ? 0.3 : 0.2, audioContext.currentTime + 0.01)
    gain.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + 0.1)

    osc.connect(gain)
    gain.connect(masterGainNode || audioContext.destination)

    osc.start()
    osc.stop(audioContext.currentTime + 0.1)
  }

  const updateLED = (index: number) => {
    ledRef.current = index
    // Force re-render to update LEDs
    setLedPosition(index)
  }

  const handlePadTrigger = (padId: string, soundName: string, triggerFunction?: Function) => {
    if (!isAudioInitialized) {
      initializeAudio()
    }

    setDisplayMessage(soundName.toUpperCase())

    // Set active pad for visual feedback
    setActivePad(padId)
    setTimeout(() => setActivePad(null), 100)

    // Store the trigger function on the pad element for playback
    const padElement = document.querySelector(`[data-pad-id="${padId}"]`)
    if (padElement && triggerFunction) {
      ;(padElement as any).__padTrigger = triggerFunction
    }

    // Record the trigger if recording is active
    if (isRecording && audioContext) {
      // Calculate time relative to recording start
      const currentTime = audioContext.currentTime
      const elapsedTime = currentTime - recordingStartTimeRef.current

      setRecordedSequence((prev) => [
        ...prev,
        {
          padId,
          soundName,
          time: elapsedTime,
          triggerFunction,
        },
      ])
    }
  }

  const handlePadSelect = (padId: string) => {
    setSelectedPad(padId)
    setDisplayMessage(`EDIT: ${padId.toUpperCase()}`)
  }

  const togglePlay = () => {
    // If recording, stop recording and start playback
    if (isRecording) {
      stopRecording()
      startPlayback()
    } else if (isPlaying) {
      stopPlayback()
    } else {
      startPlayback()
    }
  }

  const startPlayback = () => {
    if (recordedSequence.length === 0) {
      setDisplayMessage("NO SEQUENCE RECORDED")
      return
    }

    // Stop any existing playback
    stopPlayback()

    setIsPlaying(true)
    setDisplayMessage("PLAYING")

    // Get the current time as the playback start time
    const playbackStartTime = audioContext?.currentTime || 0

    // Clear any existing intervals
    if (progressIntervalRef.current) {
      clearInterval(progressIntervalRef.current)
    }

    // Schedule all recorded sounds to play at their recorded times
    recordedSequence.forEach((note) => {
      const scheduledTime = playbackStartTime + note.time

      // Schedule a timeout to show visual feedback
      setTimeout(() => {
        if (!isPlaying) return

        // Set active pad for visual feedback
        setActivePad(note.padId)
        setTimeout(() => setActivePad(null), 100)

        // Update display
        setDisplayMessage(note.soundName.toUpperCase())
      }, note.time * 1000)

      // Play the sound at the scheduled time
      if (note.triggerFunction) {
        note.triggerFunction(scheduledTime)
      } else {
        // Fallback if triggerFunction is not available
        const padElement = document.querySelector(`[data-pad-id="${note.padId}"]`) as any
        if (padElement && padElement.__padTrigger) {
          padElement.__padTrigger(scheduledTime)
        }
      }
    })

    // Calculate playback duration
    const playbackDuration =
      recordingDuration > 0
        ? recordingDuration
        : recordedSequence.length > 0
          ? Math.max(...recordedSequence.map((note) => note.time)) + 1
          : 2

    // Display playback progress
    let elapsed = 0
    progressIntervalRef.current = setInterval(() => {
      if (!isPlaying) {
        clearInterval(progressIntervalRef.current!)
        return
      }

      elapsed += 0.1
      const progress = Math.min(elapsed / playbackDuration, 1)
      const remaining = Math.max(0, playbackDuration - elapsed).toFixed(1)

      // Update display to show progress
      setDisplayMessage(`${createProgressBar(progress)} ${remaining}s`)

      // Update LEDs to show playback position
      const ledPosition = Math.floor(progress * 8) % 8
      updateLED(ledPosition)
    }, 100)

    // Schedule the end of playback or loop
    playbackTimeoutRef.current = setTimeout(() => {
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current)
      }

      if (isLooping) {
        // If looping, start playback again
        startPlayback()
      } else {
        // Otherwise stop
        stopPlayback()
      }
    }, playbackDuration * 1000)
  }

  const stopPlayback = () => {
    setIsPlaying(false)
    setDisplayMessage("STOPPED")

    if (playbackTimeoutRef.current) {
      clearTimeout(playbackTimeoutRef.current)
      playbackTimeoutRef.current = null
    }

    if (progressIntervalRef.current) {
      clearInterval(progressIntervalRef.current)
      progressIntervalRef.current = null
    }

    // Reset LEDs
    updateLED(-1)
    setActivePad(null)
  }

  const toggleRecording = () => {
    if (isRecording) {
      stopRecording()
    } else {
      startRecording()
    }
  }

  const startRecording = () => {
    if (!audioContext) return

    // Stop any existing playback
    stopPlayback()

    // Reset recording state
    setRecordedSequence([])
    setIsRecording(true)

    // Store the recording start time
    recordingStartTimeRef.current = audioContext.currentTime
    setRecordingStartTime(audioContext.currentTime)

    setDisplayMessage("RECORDING")

    // Start recording timer
    if (recordingTimerRef.current) {
      clearInterval(recordingTimerRef.current)
    }

    // Start from 0 seconds
    let elapsedTime = 0
    recordingTimerRef.current = setInterval(() => {
      elapsedTime += 0.1
      setDisplayMessage(`REC: ${elapsedTime.toFixed(1)}s`)
    }, 100)
  }

  const stopRecording = () => {
    setIsRecording(false)

    if (recordingTimerRef.current) {
      clearInterval(recordingTimerRef.current)
      recordingTimerRef.current = null
    }

    // Calculate recording duration
    if (recordedSequence.length > 0) {
      const maxTime = Math.max(...recordedSequence.map((note) => note.time))
      setRecordingDuration(maxTime + 1) // Add 1 second buffer at the end
      setDisplayMessage(`RECORDED ${recordedSequence.length} HITS (${(maxTime + 1).toFixed(1)}s)`)
    } else {
      setDisplayMessage("NOTHING RECORDED")
    }
  }

  const toggleLoop = () => {
    setIsLooping(!isLooping)
    setDisplayMessage(isLooping ? "LOOP OFF" : "LOOP ON")
  }

  const toggleMute = () => {
    setIsMuted(!isMuted)
  }

  const handleKitChange = (kit: string) => {
    setActiveKit(kit)
    setDisplayMessage(`KIT: ${kit.toUpperCase()}`)
  }

  const handleSaveKit = () => {
    // Collect all effects settings from localStorage
    const kitData: any = {
      name: activeKit,
      tempo: tempo,
      pads: {},
      hasCustomSamples: Object.keys(customSamples).length > 0,
    }

    // Get all pad IDs
    const padIds = ["kick", "snare", "hihat", "clap", "tom1", "tom2", "crash", "ride"]

    // For each pad, get its effects settings
    padIds.forEach((padId) => {
      const effectsKey = `effects-${padId}-${activeKit}`
      const effectsData = localStorage.getItem(effectsKey)

      if (effectsData) {
        try {
          kitData.pads[padId] = JSON.parse(effectsData)
          // Note if this pad has a custom sample
          kitData.pads[padId].hasCustomSample = padId in customSamples
        } catch (e) {
          console.error(`Error parsing effects data for ${padId}`, e)
        }
      }
    })

    // Create a JSON file to download
    const dataStr = JSON.stringify(kitData, null, 2)
    const dataUri = "data:application/json;charset=utf-8," + encodeURIComponent(dataStr)

    // Create a download link and trigger it
    const exportName = `drumkit-${activeKit}-${new Date().toISOString().slice(0, 10)}.json`
    const linkElement = document.createElement("a")
    linkElement.setAttribute("href", dataUri)
    linkElement.setAttribute("download", exportName)
    linkElement.click()

    setDisplayMessage(`KIT SAVED: ${exportName}`)

    // Note: Custom samples are stored in IndexedDB and not included in the JSON file
    // They will need to be uploaded again if the kit is loaded on another device
    if (Object.keys(customSamples).length > 0) {
      setTimeout(() => {
        setDisplayMessage("NOTE: Custom samples must be uploaded separately")
      }, 2000)
    }
  }

  const handleLoadKit = () => {
    // Trigger the hidden file input
    if (fileInputRef.current) {
      fileInputRef.current.click()
    }
  }

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const kitData = JSON.parse(e.target?.result as string)

        // Apply the kit settings
        if (kitData.tempo) {
          setTempo(kitData.tempo)
        }

        // Apply pad effects settings
        if (kitData.pads) {
          Object.keys(kitData.pads).forEach((padId) => {
            const effectsKey = `effects-${padId}-${activeKit}`
            localStorage.setItem(effectsKey, JSON.stringify(kitData.pads[padId]))
          })
        }

        setDisplayMessage(`KIT LOADED: ${file.name}`)
      } catch (error) {
        console.error("Error loading kit file:", error)
        setDisplayMessage("ERROR LOADING KIT")
      }
    }

    reader.readAsText(file)

    // Reset the file input so the same file can be loaded again
    event.target.value = ""
  }

  // Add this function to handle sample uploads
  const handleSampleUpload = (padId: string, audioBuffer: AudioBuffer | null) => {
    if (audioBuffer) {
      setCustomSamples((prev) => ({
        ...prev,
        [padId]: audioBuffer,
      }))
    } else {
      // Remove the sample if null is passed
      setCustomSamples((prev) => {
        const newSamples = { ...prev }
        delete newSamples[padId]
        return newSamples
      })
    }
  }

  // Add a helper function to create a progress bar
  const createProgressBar = (progress: number) => {
    const totalBlocks = 10
    const filledBlocks = Math.floor(progress * totalBlocks)
    const emptyBlocks = totalBlocks - filledBlocks

    return "▮".repeat(filledBlocks) + "▯".repeat(emptyBlocks)
  }

  return (
    <div
      className="w-full max-w-5xl bg-gradient-to-b from-gray-800 to-gray-900 rounded-xl overflow-hidden shadow-2xl"
      onClick={handleInitAudio}
    >
      <div className="p-4 md:p-6 space-y-4">
        <div className="flex flex-col items-center space-y-1">
          <h1 className="text-2xl md:text-3xl font-bold bg-gradient-to-r from-cyan-400 to-purple-500 bg-clip-text text-transparent">
            PRO DRUM MACHINE
          </h1>
          <p className="text-xs md:text-sm text-gray-400 uppercase tracking-widest">Professional Beat Creator</p>
        </div>

        {/* Main Display */}
        <div className="bg-gray-950 rounded-lg p-4 border border-gray-800 shadow-inner">
          <div className="flex justify-between text-xs text-gray-500 mb-1">
            <div>{selectedPad ? `PAD: ${selectedPad.toUpperCase()}` : "SELECT PAD"}</div>
            <div>{isPlaying ? "PLAYING" : isRecording ? "RECORDING" : "READY"}</div>
          </div>
          <div className="text-xl md:text-2xl text-center font-mono text-cyan-400 mb-2">{displayMessage}</div>
          <div className="text-sm text-center text-cyan-300 mb-2">{tempo} BPM</div>
          <div className="flex justify-center gap-1 mt-2">
            {Array.from({ length: 8 }).map((_, i) => (
              <div
                key={i}
                className={cn(
                  "w-2 h-4 rounded-sm transition-colors duration-100",
                  ledPosition === i ? "bg-green-500 shadow-glow-green" : "bg-gray-800",
                )}
              />
            ))}
          </div>
        </div>

        {/* Kit Selector */}
        <div className="flex gap-2">
          <Button
            variant={activeKit === "acoustic" ? "default" : "outline"}
            size="sm"
            className="flex-1"
            onClick={() => handleKitChange("acoustic")}
          >
            Acoustic
          </Button>
          <Button
            variant={activeKit === "electronic" ? "default" : "outline"}
            size="sm"
            className="flex-1"
            onClick={() => handleKitChange("electronic")}
          >
            Electronic
          </Button>
          <Button
            variant={activeKit === "hiphop" ? "default" : "outline"}
            size="sm"
            className="flex-1"
            onClick={() => handleKitChange("hiphop")}
          >
            Hip Hop
          </Button>
        </div>

        {/* Transport Controls */}
        <div className="grid grid-cols-3 md:grid-cols-6 gap-2">
          <Button
            variant={metronomeActive ? "destructive" : "secondary"}
            size="sm"
            onClick={() => setMetronomeActive(!metronomeActive)}
          >
            <Waveform className="w-4 h-4 mr-2" />
            Metro
          </Button>
          <Button
            variant={isRecording ? "destructive" : "secondary"}
            size="sm"
            onClick={toggleRecording}
            className={isRecording ? "animate-pulse" : ""}
          >
            <Mic className="w-4 h-4 mr-2" />
            {isRecording ? "Stop" : "Rec"}
          </Button>
          <Button variant="secondary" size="sm" onClick={togglePlay}>
            {isPlaying ? <Pause className="w-4 h-4 mr-2" /> : <Play className="w-4 h-4 mr-2" />}
            {isPlaying ? "Pause" : "Play"}
          </Button>
          <Button variant={isLooping ? "destructive" : "secondary"} size="sm" onClick={toggleLoop}>
            <Repeat className="w-4 h-4 mr-2" />
            Loop
          </Button>
          <Button variant="secondary" size="sm" onClick={stopPlayback}>
            <Square className="w-4 h-4 mr-2" />
            Stop
          </Button>
          <Button variant="secondary" size="sm" onClick={toggleMute}>
            {isMuted ? <VolumeX className="w-4 h-4 mr-2" /> : <Volume2 className="w-4 h-4 mr-2" />}
            {isMuted ? "Unmute" : "Mute"}
          </Button>
        </div>

        {/* Drum Pads Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
          <DrumPad
            id="kick"
            label="KICK"
            keyTrigger="Q"
            keyCode={81}
            onTrigger={handlePadTrigger}
            onSelect={handlePadSelect}
            isSelected={selectedPad === "kick"}
            isActive={activePad === "kick"}
            activeKit={activeKit}
            customSample={customSamples["kick"]}
          />
          <DrumPad
            id="snare"
            label="SNARE"
            keyTrigger="W"
            keyCode={87}
            onTrigger={handlePadTrigger}
            onSelect={handlePadSelect}
            isSelected={selectedPad === "snare"}
            isActive={activePad === "snare"}
            activeKit={activeKit}
            customSample={customSamples["snare"]}
          />
          <DrumPad
            id="hihat"
            label="HIHAT"
            keyTrigger="E"
            keyCode={69}
            onTrigger={handlePadTrigger}
            onSelect={handlePadSelect}
            isSelected={selectedPad === "hihat"}
            isActive={activePad === "hihat"}
            activeKit={activeKit}
            customSample={customSamples["hihat"]}
          />
          <DrumPad
            id="clap"
            label="CLAP"
            keyTrigger="R"
            keyCode={82}
            onTrigger={handlePadTrigger}
            onSelect={handlePadSelect}
            isSelected={selectedPad === "clap"}
            isActive={activePad === "clap"}
            activeKit={activeKit}
            customSample={customSamples["clap"]}
          />
          <DrumPad
            id="tom1"
            label="TOM 1"
            keyTrigger="A"
            keyCode={65}
            onTrigger={handlePadTrigger}
            onSelect={handlePadSelect}
            isSelected={selectedPad === "tom1"}
            isActive={activePad === "tom1"}
            activeKit={activeKit}
            customSample={customSamples["tom1"]}
          />
          <DrumPad
            id="tom2"
            label="TOM 2"
            keyTrigger="S"
            keyCode={83}
            onTrigger={handlePadTrigger}
            onSelect={handlePadSelect}
            isSelected={selectedPad === "tom2"}
            isActive={activePad === "tom2"}
            activeKit={activeKit}
            customSample={customSamples["tom2"]}
          />
          <DrumPad
            id="crash"
            label="CRASH"
            keyTrigger="D"
            keyCode={68}
            onTrigger={handlePadTrigger}
            onSelect={handlePadSelect}
            isSelected={selectedPad === "crash"}
            isActive={activePad === "crash"}
            activeKit={activeKit}
            customSample={customSamples["crash"]}
          />
          <DrumPad
            id="ride"
            label="RIDE"
            keyTrigger="F"
            keyCode={70}
            onTrigger={handlePadTrigger}
            onSelect={handlePadSelect}
            isSelected={selectedPad === "ride"}
            isActive={activePad === "ride"}
            activeKit={activeKit}
            customSample={customSamples["ride"]}
          />
        </div>

        {/* Visualizer */}
        <Visualizer />

        {/* Controls Panel */}
        <Tabs defaultValue="effects" className="w-full">
          <TabsList className="grid grid-cols-3 mb-4">
            <TabsTrigger value="effects">
              <Settings className="w-4 h-4 mr-2" />
              Effects
            </TabsTrigger>
            <TabsTrigger value="samples">
              <Music className="w-4 h-4 mr-2" />
              Samples
            </TabsTrigger>
            <TabsTrigger value="mixer">
              <Disc className="w-4 h-4 mr-2" />
              Mixer
            </TabsTrigger>
          </TabsList>

          <TabsContent value="effects" className="space-y-4">
            <EffectsPanel selectedPad={selectedPad} activeKit={activeKit} />
          </TabsContent>

          <TabsContent value="samples" className="space-y-4">
            <SampleUploader onSampleUpload={handleSampleUpload} selectedPad={selectedPad} audioContext={audioContext} />

            <div className="border-2 border-dashed border-gray-700 rounded-lg p-6 text-center hover:border-cyan-600 transition-colors cursor-pointer">
              <p className="text-gray-400">Drop audio files here</p>
              <p className="text-xs text-gray-500 mt-1">Or click to browse files</p>
            </div>

            <div className="flex justify-between items-center">
              <div className="flex items-center space-x-2">
                <Switch id="use-defaults" defaultChecked />
                <Label htmlFor="use-defaults">Use Default Samples</Label>
              </div>
            </div>

            <div className="flex gap-2">
              <Button className="flex-1" onClick={handleSaveKit}>
                <Save className="w-4 h-4 mr-2" />
                Save Kit
              </Button>
              <Button className="flex-1" onClick={handleLoadKit}>
                <Upload className="w-4 h-4 mr-2" />
                Load Kit
              </Button>
              <input type="file" ref={fileInputRef} onChange={handleFileUpload} accept=".json" className="hidden" />
            </div>
          </TabsContent>

          <TabsContent value="mixer" className="space-y-4">
            <div className="space-y-4">
              <div className="space-y-2">
                <div className="flex justify-between">
                  <Label htmlFor="tempo">Tempo: {tempo} BPM</Label>
                </div>
                <Slider
                  id="tempo"
                  min={60}
                  max={180}
                  step={1}
                  value={[tempo]}
                  onValueChange={(value) => setTempo(value[0])}
                />
              </div>

              <div className="space-y-2">
                <div className="flex justify-between">
                  <Label htmlFor="volume">Volume: {Math.round(volume * 100)}%</Label>
                </div>
                <Slider
                  id="volume"
                  min={0}
                  max={1}
                  step={0.01}
                  value={[volume]}
                  onValueChange={(value) => setVolume(value[0])}
                />
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}

