"use client"

import { useEffect, useState, useCallback } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/lib/auth-context"
import { DiscoveryList, Discovery } from "@/components/discovery-list"
import { Button } from "@/components/ui/button"
import { 
  Sparkles, 
  Loader2, 
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  ArrowLeft
} from "lucide-react"
import Link from "next/link"

export default function AdminCompetitorsPage() {
  const router = useRouter()
  const { userAccess } = useAuth()
  const isAdmin = userAccess?.role === "admin"
  
  const [discoveries, setDiscoveries] = useState<Discovery[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isScanning, setIsScanning] = useState(false)
  const [scanResult, setScanResult] = useState<{
    success: boolean
    message: string
  } | null>(null)
  
  // Redirect if not admin
  useEffect(() => {
    if (userAccess && !isAdmin) {
      router.push("/competitors")
    }
  }, [userAccess, isAdmin, router])
  
  const fetchDiscoveries = useCallback(async () => {
    try {
      const response = await fetch("/api/competitors/discoveries")
      if (response.ok) {
        const data = await response.json()
        setDiscoveries(data.discoveries || [])
      }
    } catch (error) {
      console.error("Failed to fetch discoveries:", error)
    } finally {
      setIsLoading(false)
    }
  }, [])
  
  useEffect(() => {
    if (isAdmin) {
      fetchDiscoveries()
    }
  }, [isAdmin, fetchDiscoveries])
  
  const handleScan = async () => {
    setIsScanning(true)
    setScanResult(null)
    
    try {
      const response = await fetch("/api/competitors/discover", {
        method: "POST",
      })
      
      const data = await response.json()
      
      if (response.ok) {
        setScanResult({
          success: true,
          message: `Found ${data.new_discoveries} new potential competitors`,
        })
        fetchDiscoveries()
      } else {
        setScanResult({
          success: false,
          message: data.error || "Scan failed",
        })
      }
    } catch (error) {
      setScanResult({
        success: false,
        message: error instanceof Error ? error.message : "Scan failed",
      })
    } finally {
      setIsScanning(false)
    }
  }
  
  const handleAdd = async (id: string) => {
    try {
      const response = await fetch(`/api/competitors/discoveries/${id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "add" }),
      })
      
      if (response.ok) {
        // Remove from list
        setDiscoveries(prev => prev.filter(d => d.id !== id))
      }
    } catch (error) {
      console.error("Failed to add competitor:", error)
    }
  }
  
  const handleDismiss = async (id: string, reason?: string) => {
    try {
      const response = await fetch(`/api/competitors/discoveries/${id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "dismiss", reason }),
      })
      
      if (response.ok) {
        // Remove from list
        setDiscoveries(prev => prev.filter(d => d.id !== id))
      }
    } catch (error) {
      console.error("Failed to dismiss discovery:", error)
    }
  }
  
  if (!isAdmin) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <Loader2 className="h-6 w-6 animate-spin text-neutral-400" />
      </div>
    )
  }
  
  return (
    <div className="p-4 sm:p-6 lg:p-10 max-w-4xl">
      {/* Back link */}
      <Link
        href="/competitors"
        className="inline-flex items-center gap-1.5 text-[12px] text-neutral-500 hover:text-neutral-700 mb-4"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Back to Competitors
      </Link>
      
      {/* Header */}
      <div className="mb-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <p className="text-[10px] font-medium uppercase tracking-[0.2em] text-neutral-400">
              Admin
            </p>
            <h1 className="mt-2 text-xl sm:text-2xl font-light tracking-tight text-neutral-900">
              Competitor Discovery
            </h1>
            <p className="mt-1 text-[13px] text-neutral-500">
              Review and add newly discovered competitors from Tavily scans
            </p>
          </div>
          
          <Button
            onClick={handleScan}
            disabled={isScanning}
            className="gap-2 bg-neutral-900 hover:bg-neutral-800"
          >
            {isScanning ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Sparkles className="h-4 w-4" />
            )}
            {isScanning ? "Scanning..." : "Run Discovery Scan"}
          </Button>
        </div>
      </div>
      
      {/* Scan Result Alert */}
      {scanResult && (
        <div
          className={`mb-6 p-4 rounded-lg flex items-start gap-3 ${
            scanResult.success
              ? "bg-emerald-50 border border-emerald-100"
              : "bg-red-50 border border-red-100"
          }`}
        >
          {scanResult.success ? (
            <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />
          ) : (
            <AlertCircle className="h-5 w-5 text-red-600 shrink-0" />
          )}
          <div>
            <p
              className={`text-[13px] font-medium ${
                scanResult.success ? "text-emerald-800" : "text-red-800"
              }`}
            >
              {scanResult.success ? "Scan Complete" : "Scan Failed"}
            </p>
            <p
              className={`text-[12px] mt-0.5 ${
                scanResult.success ? "text-emerald-700" : "text-red-700"
              }`}
            >
              {scanResult.message}
            </p>
          </div>
          <button
            onClick={() => setScanResult(null)}
            className="ml-auto text-neutral-400 hover:text-neutral-600"
          >
            ×
          </button>
        </div>
      )}
      
      {/* Info box */}
      <div className="mb-6 p-4 bg-blue-50 border border-blue-100 rounded-lg">
        <p className="text-[12px] text-blue-800">
          <strong>How it works:</strong> Tavily searches the web for new supplement brands
          in the sleep, focus, and calm market. Results are filtered to exclude known
          competitors and shown here for review. A weekly scan runs automatically every Monday.
        </p>
      </div>
      
      {/* Stats */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-[14px] font-medium text-neutral-900">
          Pending Discoveries
        </h2>
        <div className="flex items-center gap-2">
          <span className="text-[12px] text-neutral-500">
            {discoveries.length} pending
          </span>
          <Button
            variant="ghost"
            size="sm"
            onClick={fetchDiscoveries}
            className="h-7 w-7 p-0"
          >
            <RefreshCw className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
      
      {/* Discoveries List */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-neutral-400" />
        </div>
      ) : (
        <DiscoveryList
          discoveries={discoveries}
          onAdd={handleAdd}
          onDismiss={handleDismiss}
        />
      )}
    </div>
  )
}
