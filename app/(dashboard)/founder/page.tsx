"use client"

import Link from "next/link"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  FlaskConical,
  TrendingUp,
  Palette,
  AlertCircle,
  ExternalLink,
  CircleDot,
  CheckCircle2,
  ArrowRight,
  Loader2,
  Clock,
} from "lucide-react"
import { useTimeline, getActionableTasks } from "@/hooks/use-timeline"
import { getCompletionStats, filterByWorkstream } from "@/lib/timeline-parser"
import { WORKSTREAMS } from "@/lib/timeline-types"

const brandLinks = [
  { name: "Figma Design System", url: "#", type: "Figma" },
  { name: "Brand Guidelines v2.1", url: "#", type: "PDF" },
  { name: "Logo Assets", url: "#", type: "Folder" },
  { name: "Photography Style Guide", url: "#", type: "PDF" },
]

export default function FounderPage() {
  const { tasks, isLoading, isConnected } = useTimeline()
  
  // Get stats from timeline
  const stats = getCompletionStats(tasks)
  const productTasks = filterByWorkstream(tasks, "product")
  const productStats = getCompletionStats(productTasks)
  
  // Get current product task (in progress)
  const currentProductTask = productTasks.find(t => t.status === "in-progress")
  
  // Get urgent action items (in-progress tasks ending soon)
  const actionItems = getActionableTasks(tasks).slice(0, 4)
  
  const today = new Date()
  const formattedDate = today.toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  })

  return (
    <div className="p-6 lg:p-10 max-w-7xl">
      {/* Header */}
      <div className="mb-10">
        <p className="text-[10px] font-medium uppercase tracking-[0.2em] text-neutral-400">
          Dashboard
        </p>
        <h1 className="mt-2 text-2xl font-light tracking-tight text-neutral-900">
          Founder View
        </h1>
        <p className="mt-1 text-[13px] text-neutral-500">
          Strategic overview for {formattedDate}
        </p>
      </div>

      {/* Cards Grid - 2x2 */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Product Status */}
        <Card className="border border-neutral-200/60 shadow-none bg-white">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <p className="text-[10px] font-medium uppercase tracking-[0.15em] text-neutral-400">
                Product Status
              </p>
              <FlaskConical className="h-4 w-4 text-neutral-300" />
            </div>
            <CardTitle className="mt-3 text-xl font-light tracking-tight text-neutral-900">
              {currentProductTask?.name || "Product Development"}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-5 pt-2">
            {isLoading ? (
              <div className="flex items-center justify-center py-6">
                <Loader2 className="h-5 w-5 animate-spin text-neutral-400" />
              </div>
            ) : (
              <>
                <div className="inline-flex items-center gap-2 rounded-full bg-amber-50 px-3 py-1.5">
                  <div className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                  <span className="text-[12px] font-medium text-amber-800">
                    {currentProductTask ? "In Progress" : "Planning"}
                  </span>
                </div>

                <div className="space-y-2.5 border-t border-neutral-100 pt-5">
                  <div className="flex items-center justify-between">
                    <span className="text-[12px] text-neutral-500">Completed Tasks</span>
                    <span className="text-[12px] font-medium text-neutral-700">
                      {productStats.completed} of {productStats.total}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[12px] text-neutral-500">In Progress</span>
                    <span className="text-[12px] font-medium text-neutral-700">
                      {productStats.inProgress}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[12px] text-neutral-500">Upcoming</span>
                    <span className="text-[12px] font-medium text-emerald-600">
                      {productStats.upcoming}
                    </span>
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* GTM Progress */}
        <Card className="border border-neutral-200/60 shadow-none bg-white">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <p className="text-[10px] font-medium uppercase tracking-[0.15em] text-neutral-400">
                GTM Progress
              </p>
              <TrendingUp className="h-4 w-4 text-neutral-300" />
            </div>
            <CardTitle className="mt-3 text-xl font-light tracking-tight text-neutral-900">
              {isLoading ? (
                <Loader2 className="h-5 w-5 animate-spin text-neutral-400" />
              ) : (
                <>
                  <span className="text-3xl font-normal text-emerald-600">
                    {stats.percentComplete}%
                  </span>
                  <span className="ml-2 text-lg text-neutral-400">to Launch</span>
                </>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-2">
            {/* Progress Bar */}
            <div className="mb-5">
              <div className="h-1.5 overflow-hidden rounded-full bg-neutral-100">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-emerald-600 transition-all"
                  style={{ width: `${stats.percentComplete}%` }}
                />
              </div>
            </div>

            {/* Workstream breakdown */}
            {isLoading ? (
              <div className="flex items-center justify-center py-4">
                <Loader2 className="h-4 w-4 animate-spin text-neutral-400" />
              </div>
            ) : !isConnected ? (
              <div className="text-[12px] text-neutral-500 py-2">
                <Link href="/timeline" className="text-neutral-900 hover:underline">
                  Connect timeline
                </Link>{" "}
                to see GTM progress
              </div>
            ) : (
              <div className="space-y-2.5">
                {WORKSTREAMS.map((ws) => {
                  const wsTasks = filterByWorkstream(tasks, ws.id)
                  const wsStats = getCompletionStats(wsTasks)
                  if (wsStats.total === 0) return null
                  return (
                    <div key={ws.id} className="flex items-center gap-3">
                      {wsStats.percentComplete === 100 ? (
                        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                      ) : wsStats.inProgress > 0 ? (
                        <Clock className="h-3.5 w-3.5 text-amber-500" />
                      ) : (
                        <CircleDot className="h-3.5 w-3.5 text-neutral-300" />
                      )}
                      <span className="text-[12px] text-neutral-600 flex-1">
                        {ws.label}
                      </span>
                      <span className="text-[11px] text-neutral-400">
                        {wsStats.completed}/{wsStats.total}
                      </span>
                    </div>
                  )
                })}
              </div>
            )}

            <Link
              href="/timeline"
              className="mt-4 flex items-center gap-1 text-[11px] text-neutral-500 hover:text-neutral-900 transition-colors"
            >
              View full timeline
              <ArrowRight className="h-3 w-3" />
            </Link>
          </CardContent>
        </Card>

        {/* Brand Identity */}
        <Card className="border border-neutral-200/60 shadow-none bg-white">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <p className="text-[10px] font-medium uppercase tracking-[0.15em] text-neutral-400">
                Brand Identity
              </p>
              <Palette className="h-4 w-4 text-neutral-300" />
            </div>
            <CardTitle className="mt-3 text-xl font-light tracking-tight text-neutral-900">
              Quick Access
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-3">
            <div className="space-y-1.5">
              {brandLinks.map((link) => (
                <a
                  key={link.name}
                  href={link.url}
                  className="group flex items-center justify-between rounded-lg border border-neutral-100 bg-neutral-50/50 px-3 py-2.5 transition-all hover:border-neutral-200 hover:bg-white"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-[12px] font-medium text-neutral-700 group-hover:text-neutral-900">
                      {link.name}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-neutral-400">{link.type}</span>
                    <ExternalLink className="h-3 w-3 text-neutral-300 transition-colors group-hover:text-neutral-500" />
                  </div>
                </a>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Action Required */}
        <Card className="border border-neutral-200/60 shadow-none bg-white">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <p className="text-[10px] font-medium uppercase tracking-[0.15em] text-neutral-400">
                Action Required
              </p>
              <AlertCircle className="h-4 w-4 text-amber-400" />
            </div>
            <CardTitle className="mt-3 text-xl font-light tracking-tight text-neutral-900">
              Current Priorities
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-3">
            {isLoading ? (
              <div className="flex items-center justify-center py-6">
                <Loader2 className="h-4 w-4 animate-spin text-neutral-400" />
              </div>
            ) : !isConnected ? (
              <div className="text-[12px] text-neutral-500 py-2">
                <Link href="/timeline" className="text-neutral-900 hover:underline">
                  Connect timeline
                </Link>{" "}
                to see action items
              </div>
            ) : actionItems.length === 0 ? (
              <div className="text-[12px] text-neutral-500 py-2">
                No urgent items right now
              </div>
            ) : (
              <div className="space-y-3">
                {actionItems.map((task, index) => (
                  <div
                    key={task.id}
                    className="group relative rounded-lg border border-neutral-100 bg-neutral-50/50 p-3 transition-all hover:border-neutral-200 hover:bg-white"
                  >
                    <div className="flex items-start gap-3">
                      <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-neutral-200 text-[10px] font-medium text-neutral-600">
                        {index + 1}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[12px] font-medium text-neutral-800 truncate">
                          {task.name}
                        </p>
                        <p className="mt-0.5 text-[10px] text-neutral-500 capitalize">
                          {task.workstream} workstream
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
            
            <Link
              href="/timeline"
              className="mt-4 flex items-center gap-1 text-[11px] text-neutral-500 hover:text-neutral-900 transition-colors"
            >
              View all tasks
              <ArrowRight className="h-3 w-3" />
            </Link>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
