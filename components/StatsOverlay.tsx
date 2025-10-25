"use client"

import { motion } from "framer-motion"
import { Satellite, AlertTriangle, Activity, Globe } from "lucide-react"
import type { SatellitePosition, ConjunctionEvent } from "@/lib/types"

interface StatsOverlayProps {
  satellites: SatellitePosition[]
  conjunctions: ConjunctionEvent[]
}

export default function StatsOverlay({ satellites, conjunctions }: StatsOverlayProps) {
  const activeSatellites = satellites.length
  const highRiskConjunctions = conjunctions.filter((c) => c.riskLevel === "high").length
  const averageAltitude = satellites.reduce((sum, sat) => sum + sat.altitude, 0) / satellites.length || 0
  const averageVelocity = satellites.reduce((sum, sat) => sum + sat.velocity, 0) / satellites.length || 0

  const stats = [
    {
      icon: Satellite,
      label: "Active Satellites",
      value: activeSatellites,
      color: "text-primary",
    },
    {
      icon: AlertTriangle,
      label: "High Risk Events",
      value: highRiskConjunctions,
      color: "text-destructive",
    },
    {
      icon: Globe,
      label: "Avg Altitude",
      value: `${averageAltitude.toFixed(0)} km`,
      color: "text-accent",
    },
    {
      icon: Activity,
      label: "Avg Velocity",
      value: `${averageVelocity.toFixed(2)} km/s`,
      color: "text-secondary",
    },
  ]

  return (
    <motion.div
      initial={{ x: 100, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      transition={{ delay: 0.2 }}
      className="absolute right-6 top-6 space-y-3"
    >
      {stats.map((stat, index) => (
        <motion.div
          key={stat.label}
          initial={{ x: 50, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          transition={{ delay: 0.2 + index * 0.1 }}
          className="rounded-lg border border-border bg-card/95 p-3 shadow-lg backdrop-blur-sm"
        >
          <div className="flex items-center gap-3">
            <div className={`rounded-lg bg-muted p-2 ${stat.color}`}>
              <stat.icon className="h-4 w-4" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">{stat.label}</p>
              <p className="text-lg font-bold text-foreground">{stat.value}</p>
            </div>
          </div>
        </motion.div>
      ))}
    </motion.div>
  )
}
