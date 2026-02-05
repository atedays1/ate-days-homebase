"use client"

import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { 
  Palette, 
  Users, 
  TrendingUp, 
  Target, 
  Lightbulb, 
  BarChart3, 
  CheckCircle2, 
  Clock, 
  Circle,
  ArrowRight,
  Loader2,
} from "lucide-react"
import { useTimeline } from "@/hooks/use-timeline"
import { filterByWorkstream, getCompletionStats } from "@/lib/timeline-parser"
import { GanttChartMini } from "@/components/gantt-chart"

const researchAreas = [
  {
    title: "Brand Identity",
    description: "Visual language, tone of voice, and brand positioning",
    icon: Palette,
    items: ["Logo variations", "Color palette", "Typography system", "Photography style"],
  },
  {
    title: "Target Audience",
    description: "Customer personas and demographic insights",
    icon: Users,
    items: ["Primary persona: Health-conscious millennials", "Secondary: Fitness enthusiasts", "Tertiary: Wellness professionals"],
  },
  {
    title: "Market Analysis",
    description: "Industry trends and competitive landscape",
    icon: TrendingUp,
    items: ["$52B supplement market", "12% YoY growth", "DTC channel expanding", "Clean label trend"],
  },
  {
    title: "Positioning",
    description: "Unique value proposition and differentiation",
    icon: Target,
    items: ["Premium quality focus", "Science-backed formulas", "Sustainable packaging", "Transparency first"],
  },
]

export default function BrandResearchPage() {
  const { tasks, isLoading, isConnected } = useTimeline()
  
  // Filter to brand workstream
  const brandTasks = filterByWorkstream(tasks, "brand")
  const brandStats = getCompletionStats(brandTasks)

  return (
    <div className="p-6 lg:p-10 max-w-7xl">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-xl font-semibold text-neutral-900">
          Brand Research
        </h1>
        <p className="mt-1 text-[13px] text-neutral-500">
          Market insights and brand strategy documentation
        </p>
      </div>

      {/* Quick Stats */}
      <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: "Market Size", value: "$52B", icon: BarChart3 },
          { label: "Target TAM", value: "$4.2B", icon: Target },
          { label: "Personas Defined", value: "3", icon: Users },
          { label: "Competitors Analyzed", value: "12", icon: TrendingUp },
        ].map((stat) => (
          <Card key={stat.label} className="border border-neutral-200/60 shadow-none">
            <CardContent className="flex items-center gap-4 p-4">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-neutral-100">
                <stat.icon className="h-4 w-4 text-neutral-600" />
              </div>
              <div>
                <p className="text-xl font-semibold text-neutral-900">
                  {stat.value}
                </p>
                <p className="text-[11px] text-neutral-500">{stat.label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Brand Timeline */}
      {isConnected && (
        <Card className="border border-neutral-200/60 shadow-none mb-8">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-[13px] font-medium text-neutral-900">
                  Brand Workstream Timeline
                </CardTitle>
                <CardDescription className="text-[11px] text-neutral-400">
                  {brandStats.total} tasks • {brandStats.completed} completed • {brandStats.inProgress} in progress
                </CardDescription>
              </div>
              <Link
                href="/timeline"
                className="text-[11px] text-neutral-500 hover:text-neutral-900 flex items-center gap-1"
              >
                Full timeline
                <ArrowRight className="h-3 w-3" />
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-5 w-5 animate-spin text-neutral-400" />
              </div>
            ) : brandTasks.length === 0 ? (
              <div className="text-[12px] text-neutral-500 py-4">
                No brand tasks found in timeline
              </div>
            ) : (
              <div className="space-y-4">
                {/* Mini Gantt */}
                <div className="overflow-x-auto -mx-4 px-4">
                  <GanttChartMini tasks={brandTasks} filterWorkstream="brand" />
                </div>
                
                {/* Task List */}
                <div className="grid gap-2 md:grid-cols-2 lg:grid-cols-3 pt-4 border-t border-neutral-100">
                  {brandTasks.slice(0, 6).map((task) => (
                    <div
                      key={task.id}
                      className="flex items-center gap-2 text-[12px]"
                    >
                      {task.status === "completed" ? (
                        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                      ) : task.status === "in-progress" ? (
                        <Clock className="h-3.5 w-3.5 text-amber-500 shrink-0" />
                      ) : (
                        <Circle className="h-3.5 w-3.5 text-neutral-300 shrink-0" />
                      )}
                      <span className={task.status === "completed" ? "text-neutral-400" : "text-neutral-600"}>
                        {task.name}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Research Areas */}
      <div className="grid gap-5 md:grid-cols-2">
        {researchAreas.map((area) => (
          <Card key={area.title} className="border border-neutral-200/60 shadow-none">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-neutral-100">
                  <area.icon className="h-4 w-4 text-neutral-600" />
                </div>
                <div>
                  <CardTitle className="text-[13px] font-medium text-neutral-900">
                    {area.title}
                  </CardTitle>
                  <CardDescription className="text-[11px] text-neutral-400">
                    {area.description}
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2">
                {area.items.map((item, idx) => (
                  <li
                    key={idx}
                    className="flex items-center gap-2 text-[12px] text-neutral-600"
                  >
                    <Lightbulb className="h-3 w-3 text-neutral-400" />
                    {item}
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Connection Notice */}
      {!isConnected && (
        <div className="mt-8 rounded-lg border border-dashed border-neutral-300 bg-neutral-50 p-5 text-center">
          <p className="text-[12px] text-neutral-600">
            <Link href="/timeline" className="text-neutral-900 font-medium hover:underline">
              Connect your Google Sheets timeline
            </Link>{" "}
            to see brand workstream progress and tasks.
          </p>
        </div>
      )}
    </div>
  )
}
