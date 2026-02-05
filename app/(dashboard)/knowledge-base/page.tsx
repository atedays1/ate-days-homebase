"use client"

import { useState } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { SourceCitation, Source } from "@/components/source-citation"
import { Send, FileText, Sparkles, FolderOpen, Loader2 } from "lucide-react"

interface Message {
  id: string
  role: "user" | "assistant"
  content: string
  sources?: Source[]
  isLoading?: boolean
}

export default function KnowledgeBasePage() {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState("")
  const [isLoading, setIsLoading] = useState(false)

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
        body: JSON.stringify({ query: userMessage.content }),
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
      <div className="border-b border-slate-200 bg-white px-8 py-4">
        <div className="flex items-center justify-between">
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
        <div className="mx-auto max-w-3xl px-8 py-6">
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
      <div className="border-t border-slate-200 bg-white px-8 py-4">
        <form
          onSubmit={handleSubmit}
          className="mx-auto flex max-w-3xl items-center gap-3"
        >
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
        <p className="mx-auto mt-2 max-w-3xl text-center text-xs text-slate-400">
          Responses are generated based on your uploaded company documents
        </p>
      </div>
    </div>
  )
}
