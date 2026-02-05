"use client"

import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { 
  DollarSign, 
  TrendingUp, 
  TrendingDown, 
  Wallet, 
  CreditCard, 
  PiggyBank, 
  Receipt,
  ShoppingCart,
  CheckCircle2,
  Clock,
  Circle,
  ArrowRight,
  Loader2,
  AlertCircle,
} from "lucide-react"
import { useTimeline } from "@/hooks/use-timeline"
import { filterByWorkstream, getCompletionStats } from "@/lib/timeline-parser"

const financialMetrics = [
  {
    label: "Runway",
    value: "18 months",
    change: null,
    icon: Wallet,
  },
  {
    label: "Monthly Burn",
    value: "$45K",
    change: "-8%",
    trend: "down",
    icon: CreditCard,
  },
  {
    label: "Funding Raised",
    value: "$850K",
    change: null,
    icon: PiggyBank,
  },
  {
    label: "Pre-orders",
    value: "$28K",
    change: "+24%",
    trend: "up",
    icon: Receipt,
  },
]

const categories = [
  { name: "Product Development", budget: 150000, spent: 89000 },
  { name: "Marketing", budget: 200000, spent: 45000 },
  { name: "Operations", budget: 100000, spent: 67000 },
  { name: "Personnel", budget: 300000, spent: 180000 },
]

export default function FinancialPage() {
  const { tasks, isLoading, isConnected } = useTimeline()
  
  // Filter to ecommerce workstream
  const ecommerceTasks = filterByWorkstream(tasks, "ecommerce")
  const ecommerceStats = getCompletionStats(ecommerceTasks)

  return (
    <div className="p-6 lg:p-10 max-w-7xl">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-xl font-semibold text-neutral-900">
          Financial Views
        </h1>
        <p className="mt-1 text-[13px] text-neutral-500">
          Budget tracking and financial health metrics
        </p>
      </div>

      {/* Data Source Notice */}
      <div className="mb-6 flex items-center gap-3 rounded-lg border border-amber-200 bg-amber-50 p-4">
        <AlertCircle className="h-4 w-4 text-amber-600 shrink-0" />
        <div>
          <p className="text-[12px] font-medium text-amber-800">
            Live data coming October 2026
          </p>
          <p className="text-[11px] text-amber-700">
            Shopify, Stripe, and other integrations will be connected after launch. Currently showing placeholder data.
          </p>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {financialMetrics.map((metric) => (
          <Card key={metric.label} className="border border-neutral-200/60 shadow-none">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-neutral-100">
                  <metric.icon className="h-4 w-4 text-neutral-600" />
                </div>
                {metric.change && (
                  <div
                    className={`flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium ${
                      metric.trend === "up"
                        ? "bg-emerald-50 text-emerald-700"
                        : "bg-amber-50 text-amber-700"
                    }`}
                  >
                    {metric.trend === "up" ? (
                      <TrendingUp className="h-3 w-3" />
                    ) : (
                      <TrendingDown className="h-3 w-3" />
                    )}
                    {metric.change}
                  </div>
                )}
              </div>
              <p className="mt-3 text-xl font-semibold text-neutral-900">
                {metric.value}
              </p>
              <p className="text-[11px] text-neutral-500">{metric.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Budget by Category */}
        <Card className="border border-neutral-200/60 shadow-none">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-neutral-100">
                <DollarSign className="h-4 w-4 text-neutral-600" />
              </div>
              <div>
                <CardTitle className="text-[13px] font-medium text-neutral-900">
                  Budget by Category
                </CardTitle>
                <CardDescription className="text-[11px] text-neutral-400">
                  FY2026 allocation and spending
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {categories.map((category) => {
                const percentage = Math.round((category.spent / category.budget) * 100)
                return (
                  <div key={category.name}>
                    <div className="mb-1 flex items-center justify-between text-[12px]">
                      <span className="font-medium text-neutral-700">
                        {category.name}
                      </span>
                      <span className="text-neutral-500">
                        ${(category.spent / 1000).toFixed(0)}K / $
                        {(category.budget / 1000).toFixed(0)}K
                      </span>
                    </div>
                    <div className="h-1.5 overflow-hidden rounded-full bg-neutral-100">
                      <div
                        className={`h-full rounded-full transition-all ${
                          percentage > 80
                            ? "bg-amber-500"
                            : percentage > 60
                            ? "bg-neutral-600"
                            : "bg-emerald-500"
                        }`}
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                    <p className="mt-1 text-[10px] text-neutral-400">
                      {percentage}% utilized
                    </p>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>

        {/* Ecommerce Setup Tasks */}
        <Card className="border border-neutral-200/60 shadow-none">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-neutral-100">
                  <ShoppingCart className="h-4 w-4 text-neutral-600" />
                </div>
                <div>
                  <CardTitle className="text-[13px] font-medium text-neutral-900">
                    Ecommerce Setup
                  </CardTitle>
                  <CardDescription className="text-[11px] text-neutral-400">
                    {isConnected 
                      ? `${ecommerceStats.completed}/${ecommerceStats.total} tasks complete`
                      : "Connect timeline to view"
                    }
                  </CardDescription>
                </div>
              </div>
              {isConnected && (
                <Link
                  href="/timeline"
                  className="text-[11px] text-neutral-500 hover:text-neutral-900 flex items-center gap-1"
                >
                  View all
                  <ArrowRight className="h-3 w-3" />
                </Link>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center py-6">
                <Loader2 className="h-4 w-4 animate-spin text-neutral-400" />
              </div>
            ) : !isConnected ? (
              <div className="text-[12px] text-neutral-500 py-2">
                <Link href="/timeline" className="text-neutral-900 hover:underline">
                  Connect your timeline
                </Link>{" "}
                to see ecommerce setup progress
              </div>
            ) : ecommerceTasks.length === 0 ? (
              <div className="text-[12px] text-neutral-500 py-2">
                No ecommerce tasks found in timeline
              </div>
            ) : (
              <div className="space-y-2.5">
                {ecommerceTasks.slice(0, 8).map((task) => (
                  <div
                    key={task.id}
                    className="flex items-center gap-2.5 text-[12px]"
                  >
                    {task.status === "completed" ? (
                      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                    ) : task.status === "in-progress" ? (
                      <Clock className="h-3.5 w-3.5 text-amber-500 shrink-0" />
                    ) : (
                      <Circle className="h-3.5 w-3.5 text-neutral-300 shrink-0" />
                    )}
                    <span className={`truncate ${
                      task.status === "completed" 
                        ? "text-neutral-400 line-through" 
                        : "text-neutral-600"
                    }`}>
                      {task.name}
                    </span>
                  </div>
                ))}
                {ecommerceTasks.length > 8 && (
                  <p className="text-[10px] text-neutral-400 pt-1">
                    +{ecommerceTasks.length - 8} more tasks
                  </p>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Integration Info */}
      <div className="mt-8 rounded-lg border border-dashed border-neutral-300 bg-neutral-50 p-5">
        <h3 className="text-[12px] font-medium text-neutral-700 mb-2">
          Planned Integrations
        </h3>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { name: "Shopify", status: "October 2026" },
            { name: "Stripe", status: "October 2026" },
            { name: "QuickBooks", status: "November 2026" },
            { name: "Plaid", status: "Q1 2027" },
          ].map((integration) => (
            <div key={integration.name} className="flex items-center justify-between rounded-md border border-neutral-200 bg-white px-3 py-2">
              <span className="text-[11px] font-medium text-neutral-700">
                {integration.name}
              </span>
              <span className="text-[10px] text-neutral-400">
                {integration.status}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
