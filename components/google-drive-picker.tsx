"use client"

import { useState, useCallback, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Cloud, Loader2 } from "lucide-react"
import { SUPPORTED_DRIVE_TYPES } from "@/lib/google-types"

// Google API script URLs
const GOOGLE_API_URL = "https://apis.google.com/js/api.js"
const GOOGLE_GSI_URL = "https://accounts.google.com/gsi/client"

// Scopes for Google Drive read access
const SCOPES = "https://www.googleapis.com/auth/drive.readonly"

interface PickedFile {
  id: string
  name: string
  mimeType: string
}

interface GoogleDrivePickerProps {
  onFilesSelected: (files: PickedFile[], accessToken: string) => void
  disabled?: boolean
}

declare global {
  interface Window {
    google?: {
      accounts: {
        oauth2: {
          initTokenClient: (config: {
            client_id: string
            scope: string
            callback: (response: { access_token: string; error?: string }) => void
          }) => {
            requestAccessToken: () => void
          }
        }
      }
      picker: {
        PickerBuilder: new () => {
          addView: (view: unknown) => GooglePickerBuilder
          setOAuthToken: (token: string) => GooglePickerBuilder
          setDeveloperKey: (key: string) => GooglePickerBuilder
          setCallback: (callback: (data: GooglePickerData) => void) => GooglePickerBuilder
          enableFeature: (feature: unknown) => GooglePickerBuilder
          build: () => { setVisible: (visible: boolean) => void }
        }
        ViewId: {
          DOCS: string
          SPREADSHEETS: string
          PDFS: string
        }
        DocsView: new (viewId?: string) => {
          setMimeTypes: (types: string) => unknown
        }
        Feature: {
          MULTISELECT_ENABLED: unknown
        }
        Action: {
          PICKED: string
          CANCEL: string
        }
      }
    }
    gapi?: {
      load: (api: string, callback: () => void) => void
    }
  }
}

interface GooglePickerBuilder {
  addView: (view: unknown) => GooglePickerBuilder
  setOAuthToken: (token: string) => GooglePickerBuilder
  setDeveloperKey: (key: string) => GooglePickerBuilder
  setCallback: (callback: (data: GooglePickerData) => void) => GooglePickerBuilder
  enableFeature: (feature: unknown) => GooglePickerBuilder
  build: () => { setVisible: (visible: boolean) => void }
}

interface GooglePickerData {
  action: string
  docs?: Array<{
    id: string
    name: string
    mimeType: string
  }>
}

export function GoogleDrivePicker({ onFilesSelected, disabled }: GoogleDrivePickerProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [scriptsLoaded, setScriptsLoaded] = useState(false)
  const [accessToken, setAccessToken] = useState<string | null>(null)

  const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_API_KEY

  // Load Google API scripts
  useEffect(() => {
    if (scriptsLoaded || !clientId || !apiKey) return

    let gapiLoaded = false
    let gsiLoaded = false

    const checkBothLoaded = () => {
      if (gapiLoaded && gsiLoaded) {
        window.gapi?.load("picker", () => {
          setScriptsLoaded(true)
        })
      }
    }

    // Load GAPI
    const gapiScript = document.createElement("script")
    gapiScript.src = GOOGLE_API_URL
    gapiScript.async = true
    gapiScript.defer = true
    gapiScript.onload = () => {
      gapiLoaded = true
      checkBothLoaded()
    }
    document.body.appendChild(gapiScript)

    // Load GSI (Google Sign-In)
    const gsiScript = document.createElement("script")
    gsiScript.src = GOOGLE_GSI_URL
    gsiScript.async = true
    gsiScript.defer = true
    gsiScript.onload = () => {
      gsiLoaded = true
      checkBothLoaded()
    }
    document.body.appendChild(gsiScript)

    return () => {
      // Cleanup scripts on unmount if needed
    }
  }, [clientId, apiKey, scriptsLoaded])

  const createPicker = useCallback(
    (token: string) => {
      if (!window.google?.picker || !apiKey) return

      const view = new window.google.picker.DocsView()
      view.setMimeTypes(SUPPORTED_DRIVE_TYPES.join(","))

      const picker = new window.google.picker.PickerBuilder()
        .addView(view)
        .setOAuthToken(token)
        .setDeveloperKey(apiKey)
        .enableFeature(window.google.picker.Feature.MULTISELECT_ENABLED)
        .setCallback((data: GooglePickerData) => {
          if (data.action === window.google?.picker.Action.PICKED && data.docs) {
            const files: PickedFile[] = data.docs.map((doc) => ({
              id: doc.id,
              name: doc.name,
              mimeType: doc.mimeType,
            }))
            onFilesSelected(files, token)
          }
          setIsLoading(false)
        })
        .build()

      picker.setVisible(true)
    },
    [apiKey, onFilesSelected]
  )

  const handleClick = useCallback(() => {
    if (!scriptsLoaded || !clientId) return

    setIsLoading(true)

    // If we already have a token, use it
    if (accessToken) {
      createPicker(accessToken)
      return
    }

    // Get OAuth token
    const tokenClient = window.google?.accounts.oauth2.initTokenClient({
      client_id: clientId,
      scope: SCOPES,
      callback: (response) => {
        if (response.error) {
          console.error("OAuth error:", response.error)
          setIsLoading(false)
          return
        }
        setAccessToken(response.access_token)
        createPicker(response.access_token)
      },
    })

    tokenClient?.requestAccessToken()
  }, [scriptsLoaded, clientId, accessToken, createPicker])

  // Don't render if not configured
  if (!clientId || !apiKey) {
    return null
  }

  return (
    <Button
      onClick={handleClick}
      disabled={disabled || isLoading || !scriptsLoaded}
      variant="outline"
      className="gap-2"
    >
      {isLoading ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <Cloud className="h-4 w-4" />
      )}
      {isLoading ? "Loading..." : "Import from Google Drive"}
    </Button>
  )
}
