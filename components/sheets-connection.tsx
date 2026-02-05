"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent } from "@/components/ui/card"
import { FileSpreadsheet, Link2, Check, AlertCircle, Loader2, ArrowRight } from "lucide-react"

// Add Google Identity Services script type
declare global {
  interface Window {
    google?: {
      accounts: {
        oauth2: {
          initTokenClient: (config: {
            client_id: string
            scope: string
            callback: (response: { access_token?: string; error?: string }) => void
          }) => {
            requestAccessToken: () => void
          }
        }
      }
    }
  }
}

interface SheetsConnectionProps {
  onConnected: (accessToken: string, spreadsheetId: string) => void
  savedSpreadsheetId?: string
}

const SCOPES = "https://www.googleapis.com/auth/spreadsheets.readonly https://www.googleapis.com/auth/drive.readonly"

export function SheetsConnection({
  onConnected,
  savedSpreadsheetId,
}: SheetsConnectionProps) {
  const [accessToken, setAccessToken] = useState<string | null>(null)
  const [spreadsheetId, setSpreadsheetId] = useState(savedSpreadsheetId || "")
  const [isConnecting, setIsConnecting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isGoogleLoaded, setIsGoogleLoaded] = useState(false)
  const timeoutRef = useRef<NodeJS.Timeout | null>(null)

  // Load Google Identity Services
  useEffect(() => {
    // Check if script already exists
    const existingScript = document.querySelector('script[src="https://accounts.google.com/gsi/client"]')
    if (existingScript) {
      setIsGoogleLoaded(true)
      return
    }

    const script = document.createElement("script")
    script.src = "https://accounts.google.com/gsi/client"
    script.async = true
    script.defer = true
    script.onload = () => setIsGoogleLoaded(true)
    script.onerror = () => setError("Failed to load Google Sign-In. Please refresh.")
    document.head.appendChild(script)
  }, [])

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
    }
  }, [])

  // Load saved token from localStorage
  useEffect(() => {
    const savedToken = localStorage.getItem("google_access_token")
    const tokenExpiry = localStorage.getItem("google_token_expiry")
    
    if (savedToken && tokenExpiry) {
      const expiry = parseInt(tokenExpiry, 10)
      if (Date.now() < expiry) {
        setAccessToken(savedToken)
      } else {
        localStorage.removeItem("google_access_token")
        localStorage.removeItem("google_token_expiry")
      }
    }

    const savedSheet = localStorage.getItem("timeline_spreadsheet_id")
    if (savedSheet && !savedSpreadsheetId) {
      setSpreadsheetId(savedSheet)
    }
  }, [savedSpreadsheetId])

  const handleSignIn = useCallback(() => {
    if (!window.google || !isGoogleLoaded) {
      setError("Google Sign-In not loaded. Please refresh the page.")
      return
    }

    const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID
    if (!clientId) {
      setError("Google Client ID not configured in environment variables.")
      return
    }

    setIsConnecting(true)
    setError(null)

    // Set a timeout to reset the connecting state if callback never fires
    timeoutRef.current = setTimeout(() => {
      setIsConnecting(false)
      setError("Sign-in timed out. The popup may have been blocked or closed. Please try again.")
    }, 60000) // 60 second timeout

    try {
      const tokenClient = window.google.accounts.oauth2.initTokenClient({
        client_id: clientId,
        scope: SCOPES,
        callback: (response) => {
          // Clear timeout since we got a response
          if (timeoutRef.current) {
            clearTimeout(timeoutRef.current)
          }
          
          setIsConnecting(false)
          
          if (response.error) {
            if (response.error === "popup_closed_by_user") {
              setError("Sign-in cancelled. Please try again.")
            } else {
              setError(`Sign-in failed: ${response.error}`)
            }
            return
          }
          
          if (response.access_token) {
            setAccessToken(response.access_token)
            // Save token with 1 hour expiry
            localStorage.setItem("google_access_token", response.access_token)
            localStorage.setItem(
              "google_token_expiry",
              String(Date.now() + 3600 * 1000)
            )
            setError(null)
          }
        },
      })

      tokenClient.requestAccessToken()
    } catch (err) {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
      setIsConnecting(false)
      setError("Failed to initialize sign-in. Please refresh and try again.")
    }
  }, [isGoogleLoaded])

  const handleSpreadsheetIdChange = (value: string) => {
    // Extract ID from URL if pasted
    const urlMatch = value.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/)
    const id = urlMatch ? urlMatch[1] : value
    setSpreadsheetId(id)
    localStorage.setItem("timeline_spreadsheet_id", id)
  }

  const handleConnect = () => {
    if (accessToken && spreadsheetId.trim()) {
      onConnected(accessToken, spreadsheetId.trim())
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && accessToken && spreadsheetId.trim()) {
      handleConnect()
    }
  }

  const canConnect = !!accessToken && !!spreadsheetId.trim()

  return (
    <Card className="border border-neutral-200/60 shadow-none">
      <CardContent className="p-5">
        <div className="flex items-start gap-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-neutral-100">
            <FileSpreadsheet className="h-5 w-5 text-neutral-600" />
          </div>
          <div className="flex-1 space-y-4">
            <div>
              <h3 className="text-[13px] font-medium text-neutral-900">
                Connect Google Sheets
              </h3>
              <p className="text-[11px] text-neutral-500 mt-0.5">
                Sign in with Google to sync your timeline spreadsheet
              </p>
            </div>

            {error && (
              <div className="flex items-start gap-2 text-[11px] text-red-600 bg-red-50 rounded-md px-3 py-2">
                <AlertCircle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <div className="space-y-3">
              {/* Step 1: Sign in */}
              <div className="flex items-center gap-3">
                <div className="flex h-5 w-5 items-center justify-center rounded-full bg-neutral-200 text-[10px] font-medium text-neutral-600">
                  1
                </div>
                {!accessToken ? (
                  <Button
                    onClick={handleSignIn}
                    disabled={isConnecting || !isGoogleLoaded}
                    variant="outline"
                    className="h-9 text-[12px] flex-1"
                  >
                    {isConnecting ? (
                      <>
                        <Loader2 className="h-3.5 w-3.5 mr-2 animate-spin" />
                        Waiting for sign-in...
                      </>
                    ) : !isGoogleLoaded ? (
                      <>
                        <Loader2 className="h-3.5 w-3.5 mr-2 animate-spin" />
                        Loading...
                      </>
                    ) : (
                      <>
                        <svg className="h-4 w-4 mr-2" viewBox="0 0 24 24">
                          <path
                            fill="#4285F4"
                            d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                          />
                          <path
                            fill="#34A853"
                            d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                          />
                          <path
                            fill="#FBBC05"
                            d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                          />
                          <path
                            fill="#EA4335"
                            d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                          />
                        </svg>
                        Sign in with Google
                      </>
                    )}
                  </Button>
                ) : (
                  <div className="flex items-center gap-2 text-[11px] text-emerald-600 flex-1">
                    <Check className="h-3.5 w-3.5" />
                    Signed in to Google
                    <button
                      onClick={() => {
                        setAccessToken(null)
                        localStorage.removeItem("google_access_token")
                        localStorage.removeItem("google_token_expiry")
                      }}
                      className="ml-auto text-neutral-400 hover:text-neutral-600 transition-colors text-[10px]"
                    >
                      Sign out
                    </button>
                  </div>
                )}
              </div>

              {/* Step 2: Enter spreadsheet ID */}
              <div className="flex items-start gap-3">
                <div className="flex h-5 w-5 items-center justify-center rounded-full bg-neutral-200 text-[10px] font-medium text-neutral-600 mt-2">
                  2
                </div>
                <div className="flex-1 space-y-1.5">
                  <label className="text-[11px] text-neutral-500 flex items-center gap-1">
                    <Link2 className="h-3 w-3" />
                    Spreadsheet ID or URL
                  </label>
                  <Input
                    type="text"
                    placeholder="Paste spreadsheet URL or ID"
                    value={spreadsheetId}
                    onChange={(e) => handleSpreadsheetIdChange(e.target.value)}
                    onKeyDown={handleKeyDown}
                    className="h-9 text-[12px] bg-white"
                  />
                  <p className="text-[10px] text-neutral-400">
                    Find this in your Google Sheets URL after /d/
                  </p>
                </div>
              </div>

              {/* Connect button */}
              <Button
                onClick={handleConnect}
                disabled={!canConnect}
                className="w-full h-9 text-[12px] bg-neutral-900 hover:bg-neutral-800"
              >
                Connect Spreadsheet
                <ArrowRight className="h-3.5 w-3.5 ml-2" />
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
