"use client"

import type React from "react"

import { useState, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Upload, X } from "lucide-react"

interface SampleUploaderProps {
  onSampleUpload: (padId: string, audioBuffer: AudioBuffer) => void
  selectedPad: string | null
  audioContext: AudioContext | null
}

export default function SampleUploader({ onSampleUpload, selectedPad, audioContext }: SampleUploaderProps) {
  const [isUploading, setIsUploading] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [uploadedSamples, setUploadedSamples] = useState<Record<string, string>>({})
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleUploadClick = () => {
    if (!selectedPad) {
      setUploadError("Please select a pad first (Shift+click or right-click on a pad)")
      return
    }

    if (fileInputRef.current) {
      fileInputRef.current.click()
    }
  }

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !selectedPad || !audioContext) {
      return
    }

    try {
      setIsUploading(true)
      setUploadError(null)

      // Read the file as ArrayBuffer
      const arrayBuffer = await file.arrayBuffer()

      // Decode the audio data
      const audioBuffer = await audioContext.decodeAudioData(arrayBuffer)

      // Pass the decoded audio to the parent component
      onSampleUpload(selectedPad, audioBuffer)

      // Store the filename for display
      setUploadedSamples((prev) => ({
        ...prev,
        [selectedPad]: file.name,
      }))

      // Save the sample to IndexedDB for persistence
      saveSampleToIndexedDB(selectedPad, arrayBuffer)
    } catch (error) {
      console.error("Error uploading sample:", error)
      setUploadError("Failed to upload sample. Make sure it's a valid audio file.")
    } finally {
      setIsUploading(false)
      // Reset the file input
      if (fileInputRef.current) {
        fileInputRef.current.value = ""
      }
    }
  }

  const saveSampleToIndexedDB = async (padId: string, arrayBuffer: ArrayBuffer) => {
    try {
      // Open (or create) the IndexedDB database
      const dbRequest = indexedDB.open("DrumMachineSamples", 1)

      // Create object store if it doesn't exist
      dbRequest.onupgradeneeded = (event) => {
        const db = (event.target as IDBRequest).result
        if (!db.objectStoreNames.contains("samples")) {
          db.createObjectStore("samples")
        }
      }

      dbRequest.onsuccess = (event) => {
        const db = (event.target as IDBRequest).result
        const transaction = db.transaction(["samples"], "readwrite")
        const store = transaction.objectStore("samples")

        // Store the sample with the pad ID as the key
        const request = store.put(arrayBuffer, padId)

        request.onsuccess = () => {
          console.log(`Sample for ${padId} saved to IndexedDB`)
        }

        request.onerror = () => {
          console.error("Error saving sample to IndexedDB")
        }
      }

      dbRequest.onerror = (event) => {
        console.error("IndexedDB error:", (event.target as IDBRequest).error)
      }
    } catch (error) {
      console.error("Error accessing IndexedDB:", error)
    }
  }

  const removeSample = async (padId: string) => {
    try {
      // Remove from state
      setUploadedSamples((prev) => {
        const newSamples = { ...prev }
        delete newSamples[padId]
        return newSamples
      })

      // Remove from IndexedDB
      const dbRequest = indexedDB.open("DrumMachineSamples", 1)

      dbRequest.onsuccess = (event) => {
        const db = (event.target as IDBRequest).result
        const transaction = db.transaction(["samples"], "readwrite")
        const store = transaction.objectStore("samples")

        const request = store.delete(padId)

        request.onsuccess = () => {
          console.log(`Sample for ${padId} removed from IndexedDB`)
        }
      }

      // Notify parent component
      onSampleUpload(padId, null)
    } catch (error) {
      console.error("Error removing sample:", error)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-medium">Custom Samples</h3>
          <Button size="sm" variant="outline" onClick={handleUploadClick} disabled={isUploading || !selectedPad}>
            <Upload className="w-4 h-4 mr-2" />
            {isUploading ? "Uploading..." : "Upload Sample"}
          </Button>
          <input type="file" ref={fileInputRef} onChange={handleFileChange} accept="audio/*" className="hidden" />
        </div>

        {uploadError && <p className="text-xs text-red-500">{uploadError}</p>}

        {!selectedPad && <p className="text-xs text-gray-400">Select a pad to upload a custom sample</p>}

        {selectedPad && (
          <p className="text-xs text-cyan-400">
            Uploading for: <span className="font-bold">{selectedPad.toUpperCase()}</span>
          </p>
        )}
      </div>

      {Object.keys(uploadedSamples).length > 0 && (
        <div className="space-y-2">
          <h4 className="text-xs font-medium text-gray-400">Uploaded Samples:</h4>
          <div className="grid grid-cols-2 gap-2">
            {Object.entries(uploadedSamples).map(([padId, fileName]) => (
              <div key={padId} className="flex items-center justify-between bg-gray-800 rounded p-2 text-xs">
                <div>
                  <span className="font-bold text-cyan-400">{padId.toUpperCase()}</span>
                  <span className="text-gray-400 ml-2 truncate max-w-[100px] inline-block">{fileName}</span>
                </div>
                <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => removeSample(padId)}>
                  <X className="h-3 w-3" />
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

