"use client"

import { useState, useEffect, useRef } from "react"
import { createPortal } from "react-dom"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { SourceCitation, Source } from "@/components/source-citation"
import { Send, FileText, Sparkles, FolderOpen, Loader2, Filter, ChevronDown, X } from "lucide-react"
import { cn } from "@/lib/utils"

interface Message {
  id: string
  role: "user" | "assistant"
  content: string
  sources?: Source[]
  isLoading?: boolean
}

interface DocItem {
  id: string
  name: string
  created_at?: string
}

type ScopeFilter = "all" | "recent24" | "recent168"

export default function KnowledgeBasePage() {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [scopeFilter, setScopeFilter] = useState<ScopeFilter>("all")
  const [documentList, setDocumentList] = useState<DocItem[]>([])
  const [selectedDocumentIds, setSelectedDocumentIds] = useState<string[]>([])
  const [showDocumentPicker, setShowDocumentPicker] = useState(false)
  const documentPickerButtonRef = useRef<HTMLButtonElement>(null)
  const [pickerPosition, setPickerPosition] = useState<{ top?: number; bottom?: number; left: number } | null>(null)

  useEffect(() => {
    async function fetchDocuments() {
      try {
        const res = await fetch("/api/documents")
        if (res.ok) {
          const data = await res.json()
          setDocumentList(data.documents || [])
        }
      } catch (err) {
        console.error("Failed to fetch documents:", err)
      }
    }
    fetchDocuments()
  }, [])

  const getChatBody = (query: string) => {
    const base: { query: string; documentIds?: string[]; documentFilter?: { type: "recent"; hours: number } } = { query }
    if (scopeFilter === "recent24") {
      base.documentFilter = { type: "recent", hours: 24 }
    } else if (scopeFilter === "recent168") {
      base.documentFilter = { type: "recent", hours: 168 }
    } else if (selectedDocumentIds.length > 0) {
      base.documentIds = selectedDocumentIds
    }
    return base
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!input.trim() || isLoading) return

    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: input.trim(),
    }

    const loadingMessage: Message = {
      id: (Date.now() + 1).toString(),
      role: "assistant",
      content: "",
      isLoading: true,
    }

    setMessages((prev) => [...prev, userMessage, loadingMessage])
    setInput("")
    setIsLoading(true)

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(getChatBody(userMessage.content)),
      })

      const data = await response.json()

      // Replace loading message with actual response
      setMessages((prev) =>
        prev.map((msg) =>
          msg.isLoading
            ? {
                id: msg.id,
                role: "assistant",
                content: data.content || data.error || "Sorry, I couldn't process that request.",
                sources: data.sources || [],
              }
            : msg
        )
      )
    } catch (error) {
      // Replace loading message with error
      setMessages((prev) =>
        prev.map((msg) =>
          msg.isLoading
            ? {
                id: msg.id,
                role: "assistant",
                content: "Sorry, there was an error processing your request. Please try again.",
                sources: [],
              }
            : msg
        )
      )
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="border-b border-slate-200 bg-white px-4 sm:px-8 py-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-semibold text-slate-900">
              Knowledge Base
            </h1>
            <p className="text-sm text-slate-600">
              Chat with your company documents and data
            </p>
          </div>
          <Link href="/documents">
            <Button variant="outline" size="sm" className="gap-2">
              <FolderOpen className="h-4 w-4" />
              Manage Documents
            </Button>
          </Link>
        </div>
      </div>

      {/* Chat Area */}
      <ScrollArea className="flex-1">
        <div className="mx-auto max-w-3xl px-4 sm:px-8 py-6">
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-indigo-50">
                <Sparkles className="h-8 w-8 text-indigo-600" />
              </div>
              <h2 className="mt-6 text-lg font-semibold text-slate-900">
                Welcome to AteDays Homebase
              </h2>
              <p className="mt-2 max-w-md text-center text-sm text-slate-600">
                Ask questions about your company documents, brand guidelines,
                market research, and more. Your AI assistant will search your
                uploaded documents to provide accurate answers.
              </p>

              {/* Quick Actions */}
              <div className="mt-6">
                <Link href="/documents">
                  <Button variant="outline" size="sm" className="gap-2">
                    <FolderOpen className="h-4 w-4" />
                    Upload Documents First
                  </Button>
                </Link>
              </div>

              {/* Suggested prompts */}
              <div className="mt-8 grid gap-3 sm:grid-cols-2">
                {[
                  "What are our brand colors and fonts?",
                  "Summarize our market research findings",
                  "What's our product differentiation?",
                  "List our target customer personas",
                ].map((prompt) => (
                  <button
                    key={prompt}
                    onClick={() => setInput(prompt)}
                    className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-3 text-left text-sm text-slate-700 transition-colors hover:border-indigo-200 hover:bg-indigo-50"
                  >
                    <FileText className="h-4 w-4 text-slate-400" />
                    {prompt}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex ${
                    message.role === "user" ? "justify-end" : "justify-start"
                  }`}
                >
                  <div
                    className={`max-w-[80%] ${
                      message.role === "user"
                        ? "rounded-lg bg-indigo-600 px-4 py-3 text-white"
                        : ""
                    }`}
                  >
                    {message.isLoading ? (
                      <div className="flex items-center gap-2 rounded-lg border border-slate-100 bg-white px-4 py-3 shadow-sm">
                        <Loader2 className="h-4 w-4 animate-spin text-indigo-600" />
                        <span className="text-sm text-slate-600">
                          Searching documents...
                        </span>
                      </div>
                    ) : message.role === "assistant" ? (
                      <div className="rounded-lg border border-slate-100 bg-white px-4 py-3 shadow-sm">
                        <p className="text-sm text-slate-700 whitespace-pre-wrap">
                          {message.content}
                        </p>
                        {message.sources && message.sources.length > 0 && (
                          <SourceCitation sources={message.sources} />
                        )}
                      </div>
                    ) : (
                      <p className="text-sm">{message.content}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </ScrollArea>

      {/* Input Area */}
      <div className="border-t border-slate-200 bg-white px-4 sm:px-8 py-4">
        <div className="mx-auto max-w-3xl space-y-3">
          {/* Scope: quick filters + document picker */}
          <div className="flex flex-wrap items-center gap-2">
            <Filter className="h-3.5 w-3.5 text-slate-400" />
            <span className="text-xs text-slate-500">Search in:</span>
            <div className="flex flex-wrap items-center gap-1.5">
              {(["all", "recent24", "recent168"] as const).map((scope) => (
                <button
                  key={scope}
                  type="button"
                  onClick={() => {
                    setScopeFilter(scope)
                    if (scope !== "all") setSelectedDocumentIds([])
                  }}
                  className={cn(
                    "rounded-full px-3 py-1 text-xs font-medium transition-colors",
                    scopeFilter === scope
                      ? "bg-indigo-600 text-white"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  )}
                >
                  {scope === "all" ? "All documents" : scope === "recent24" ? "Last 24 hours" : "Last 7 days"}
                </button>
              ))}
              <div className="relative">
                <button
                  ref={documentPickerButtonRef}
                  type="button"
                  onClick={() => {
                    if (!showDocumentPicker && documentPickerButtonRef.current && typeof window !== "undefined") {
                      const rect = documentPickerButtonRef.current.getBoundingClientRect()
                      const dropHeight = 192
                      const spaceBelow = window.innerHeight - rect.bottom
                      const openUp = spaceBelow < dropHeight
                      setPickerPosition(
                        openUp
                          ? { bottom: window.innerHeight - rect.top + 4, left: rect.left }
                          : { top: rect.bottom + 4, left: rect.left }
                      )
                    }
                    setShowDocumentPicker(!showDocumentPicker)
                  }}
                  className={cn(
                    "rounded-full px-3 py-1 text-xs font-medium transition-colors flex items-center gap-1",
                    selectedDocumentIds.length > 0
                      ? "bg-indigo-100 text-indigo-700"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  )}
                >
                  Choose documents...
                  {selectedDocumentIds.length > 0 && (
                    <span className="bg-indigo-600 text-white rounded-full w-4 h-4 flex items-center justify-center text-[10px]">
                      {selectedDocumentIds.length}
                    </span>
                  )}
                  <ChevronDown className={cn("h-3 w-3", showDocumentPicker && "rotate-180")} />
                </button>
                {showDocumentPicker &&
                typeof document !== "undefined" &&
                pickerPosition &&
                createPortal(
                  <>
                    <div
                      className="fixed inset-0 z-[100]"
                      onClick={() => setShowDocumentPicker(false)}
                      aria-hidden
                    />
                    <div
                      className="fixed z-[101] max-h-48 w-64 overflow-y-auto rounded-lg border border-slate-200 bg-white py-2 shadow-lg"
                      style={{
                        ...(pickerPosition.top !== undefined ? { top: pickerPosition.top } : { bottom: pickerPosition.bottom }),
                        left: pickerPosition.left,
                      }}
                    >
                      {documentList.length === 0 ? (
                        <p className="px-3 py-2 text-xs text-slate-500">No documents yet</p>
                      ) : (
                        documentList.map((doc) => {
                          const isSelected = selectedDocumentIds.includes(doc.id)
                          return (
                            <button
                              key={doc.id}
                              type="button"
                              onClick={() => {
                                setSelectedDocumentIds((prev) =>
                                  isSelected ? prev.filter((id) => id !== doc.id) : [...prev, doc.id]
                                )
                                setScopeFilter("all")
                              }}
                              className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-xs text-slate-700 hover:bg-slate-50"
                            >
                              <span
                                className={cn(
                                  "inline-flex h-3.5 w-3.5 flex-shrink-0 items-center justify-center rounded border text-[10px] font-bold text-white",
                                  isSelected ? "border-indigo-600 bg-indigo-600" : "border-slate-300"
                                )}
                              >
                                {isSelected ? "✓" : ""}
                              </span>
                              <span className="truncate">{doc.name}</span>
                            </button>
                          )
                        })
                      )}
                      {selectedDocumentIds.length > 0 && (
                        <button
                          type="button"
                          onClick={() => setSelectedDocumentIds([])}
                          className="mt-2 flex w-full items-center gap-1 px-3 py-1.5 text-xs text-slate-500 hover:bg-slate-50"
                        >
                          <X className="h-3 w-3" />
                          Clear selection
                        </button>
                      )}
                    </div>
                  </>,
                  document.body
                )}
              </div>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="flex items-center gap-3">
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask anything about your company..."
              className="flex-1 border-slate-200 bg-slate-50 focus-visible:ring-indigo-500"
              disabled={isLoading}
            />
            <Button
              type="submit"
              size="icon"
              className="bg-indigo-600 hover:bg-indigo-700"
              disabled={isLoading || !input.trim()}
            >
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </Button>
          </form>
        </div>
        <p className="mx-auto mt-2 max-w-3xl text-center text-xs text-slate-400">
          {scopeFilter !== "all" || selectedDocumentIds.length > 0
            ? "Responses will use only the selected document(s)."
            : "Responses are generated based on your uploaded company documents"}
        </p>
      </div>
    </div>
  )
}
