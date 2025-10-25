"use client"

import { useMemo } from "react"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts"
import { TrendingUp, AlertCircle } from "lucide-react"
import type { ConjunctionEvent } from "@/lib/types"

interface RiskChartProps {
  conjunctions: ConjunctionEvent[]
}

export default function RiskChart({ conjunctions }: RiskChartProps) {
  const riskDistribution = useMemo(() => {
    const distribution = { high: 0, medium: 0, low: 0 }
    conjunctions.forEach((conj) => {
      distribution[conj.riskLevel]++
    })
    return [
      { name: "High Risk", value: distribution.high, color: "#ef4444" },
      { name: "Medium Risk", value: distribution.medium, color: "#f59e0b" },
      { name: "Low Risk", value: distribution.low, color: "#6b7280" },
    ]
  }, [conjunctions])

  const timelineData = useMemo(() => {
    const now = new Date()
    const buckets = [
      { name: "0-6h", count: 0 },
      { name: "6-12h", count: 0 },
      { name: "12-24h", count: 0 },
      { name: "24-48h", count: 0 },
      { name: "48h+", count: 0 },
    ]

    conjunctions.forEach((conj) => {
      const hoursUntil = (conj.tca.getTime() - now.getTime()) / (1000 * 60 * 60)
      if (hoursUntil < 6) buckets[0].count++
      else if (hoursUntil < 12) buckets[1].count++
      else if (hoursUntil < 24) buckets[2].count++
      else if (hoursUntil < 48) buckets[3].count++
      else buckets[4].count++
    })

    return buckets
  }, [conjunctions])

  const totalRisk = conjunctions.reduce((sum, conj) => sum + conj.probability, 0)

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-lg border border-border bg-card p-4">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <AlertCircle className="h-4 w-4" />
            <span>Total Events</span>
          </div>
          <p className="mt-2 text-2xl font-bold text-foreground">{conjunctions.length}</p>
        </div>

        <div className="rounded-lg border border-border bg-card p-4">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <TrendingUp className="h-4 w-4" />
            <span>Cumulative Risk</span>
          </div>
          <p className="mt-2 text-2xl font-bold text-foreground">{(totalRisk * 100).toExponential(2)}%</p>
        </div>
      </div>

      <div className="rounded-lg border border-border bg-card p-4">
        <h3 className="mb-4 text-sm font-semibold text-foreground">Risk Distribution</h3>
        <ResponsiveContainer width="100%" height={200}>
          <PieChart>
            <Pie
              data={riskDistribution}
              cx="50%"
              cy="50%"
              innerRadius={50}
              outerRadius={80}
              paddingAngle={5}
              dataKey="value"
            >
              {riskDistribution.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip
              contentStyle={{
                backgroundColor: "rgb(10, 15, 35)",
                border: "1px solid rgb(30, 41, 59)",
                borderRadius: "8px",
                color: "rgb(240, 250, 255)",
              }}
            />
          </PieChart>
        </ResponsiveContainer>
        <div className="mt-4 space-y-2">
          {riskDistribution.map((item) => (
            <div key={item.name} className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <div className="h-3 w-3 rounded" style={{ backgroundColor: item.color }} />
                <span className="text-muted-foreground">{item.name}</span>
              </div>
              <span className="font-medium text-foreground">{item.value}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-lg border border-border bg-card p-4">
        <h3 className="mb-4 text-sm font-semibold text-foreground">Time to Closest Approach</h3>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={timelineData}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgb(30, 41, 59)" />
            <XAxis dataKey="name" stroke="rgb(156, 163, 175)" style={{ fontSize: "12px" }} />
            <YAxis stroke="rgb(156, 163, 175)" style={{ fontSize: "12px" }} />
            <Tooltip
              contentStyle={{
                backgroundColor: "rgb(10, 15, 35)",
                border: "1px solid rgb(30, 41, 59)",
                borderRadius: "8px",
                color: "rgb(240, 250, 255)",
              }}
            />
            <Bar dataKey="count" fill="rgb(59, 130, 246)" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
