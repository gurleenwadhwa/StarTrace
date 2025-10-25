"use client"

import { useState, useEffect, useCallback } from "react"
import { motion, AnimatePresence } from "framer-motion"
import GlobeViewer from "./GlobeViewer"
import Dashboard from "./Dashboard"
import Header from "./Header"
import TimeControls from "./TimeControls"
import StatsOverlay from "./StatsOverlay"
import InfoPanel from "./InfoPanel"
import LoadingScreen from "./LoadingScreen"
import { CANADIAN_SATELLITES } from "@/lib/canadianSatellites"
import { propagateSatellite, generateOrbitPath } from "@/lib/satelliteUtils"
import type { SatellitePosition, OrbitPath, ConjunctionEvent, Satellite } from "@/lib/types"

export default function SatelliteViewer() {
  const [satellites, setSatellites] = useState<SatellitePosition[]>([])
  const [orbits, setOrbits] = useState<OrbitPath[]>([])
  const [conjunctions, setConjunctions] = useState<ConjunctionEvent[]>([])
  const [selectedSatellite, setSelectedSatellite] = useState<number | null>(null)
  const [searchQuery, setSearchQuery] = useState("")
  const [timeOffset, setTimeOffset] = useState(0) // minutes from now
  const [isPlaying, setIsPlaying] = useState(true)
  const [showDashboard, setShowDashboard] = useState(true)
  const [loading, setLoading] = useState(true)
  const [satelliteData, setSatelliteData] = useState<Satellite[]>([])

  useEffect(() => {
    const fetchData = async () => {
      try {
        console.log("[v0] Fetching satellite data from API...")

        const satellitesResponse = await fetch("/api/satellites")
        const satellitesData: Satellite[] = await satellitesResponse.json()
        console.log("[v0] Fetched satellites:", satellitesData.length)
        setSatelliteData(satellitesData)

        console.log("[v0] Fetching conjunction data from API...")
        const conjunctionsResponse = await fetch("/api/conjunctions")
        const conjunctionsData: ConjunctionEvent[] = await conjunctionsResponse.json()
        console.log("[v0] Fetched conjunctions:", conjunctionsData.length)
        setConjunctions(conjunctionsData)

        const currentDate = new Date()
        const positions = satellitesData
          .map((sat) => propagateSatellite(sat, currentDate))
          .filter((pos): pos is SatellitePosition => pos !== null)

        console.log("[v0] Generated positions:", positions.length)
        setSatellites(positions)

        const paths = satellitesData.map((sat) => generateOrbitPath(sat, currentDate))
        setOrbits(paths)

        setTimeout(() => {
          setLoading(false)
        }, 1500)
      } catch (error) {
        console.error("[v0] Error fetching data:", error)
        setLoading(false)
      }
    }

    fetchData()
  }, [])

  useEffect(() => {
    if (loading || satelliteData.length === 0) return

    const updatePositions = () => {
      const currentDate = new Date(Date.now() + timeOffset * 60 * 1000)

      const positions = satelliteData
        .map((sat) => propagateSatellite(sat, currentDate))
        .filter((pos): pos is SatellitePosition => pos !== null)

      setSatellites(positions)

      if (selectedSatellite) {
        const selectedSat = satelliteData.find((s) => s.noradId === selectedSatellite)
        if (selectedSat) {
          const path = generateOrbitPath(selectedSat, currentDate)
          setOrbits([path])
        }
      } else {
        const paths = satelliteData.map((sat) => generateOrbitPath(sat, currentDate))
        setOrbits(paths)
      }
    }

    updatePositions()
  }, [timeOffset, selectedSatellite, loading, satelliteData])

  useEffect(() => {
    if (!isPlaying) return

    const interval = setInterval(() => {
      setTimeOffset((prev) => prev + 0.5)
    }, 1000)

    return () => clearInterval(interval)
  }, [isPlaying])

  const handleSatelliteClick = useCallback((noradId: number) => {
    setSelectedSatellite((prev) => (prev === noradId ? null : noradId))
  }, [])

  const handleSearch = useCallback((query: string) => {
    setSearchQuery(query)
  }, [])

  const filteredSatellites = satellites.filter(
    (sat) => sat.name.toLowerCase().includes(searchQuery.toLowerCase()) || sat.noradId.toString().includes(searchQuery),
  )

  const selectedSatelliteData = selectedSatellite
    ? CANADIAN_SATELLITES.find((s) => s.noradId === selectedSatellite)
    : null

  if (loading) {
    return <LoadingScreen />
  }

  return (
    <div className="relative h-screen w-full overflow-hidden bg-background">
      <Header
        onSearch={handleSearch}
        searchQuery={searchQuery}
        onToggleDashboard={() => setShowDashboard(!showDashboard)}
      />

      <div className="flex h-[calc(100vh-64px)] w-full">
        <AnimatePresence>
          {showDashboard && (
            <motion.div
              initial={{ x: -400, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: -400, opacity: 0 }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="h-full w-96 flex-shrink-0 border-r border-border bg-card"
            >
              <Dashboard
                satellites={filteredSatellites}
                conjunctions={conjunctions}
                selectedSatellite={selectedSatellite}
                onSatelliteSelect={handleSatelliteClick}
                satelliteDetails={selectedSatelliteData}
              />
            </motion.div>
          )}
        </AnimatePresence>

        <div className="relative flex-1">
          <GlobeViewer
            satellites={satellites}
            orbits={orbits}
            conjunctions={conjunctions}
            selectedSatellite={selectedSatellite}
            onSatelliteClick={handleSatelliteClick}
            timeOffset={timeOffset}
          />

          <StatsOverlay satellites={satellites} conjunctions={conjunctions} />

          <TimeControls
            timeOffset={timeOffset}
            isPlaying={isPlaying}
            onTimeChange={setTimeOffset}
            onPlayPause={() => setIsPlaying(!isPlaying)}
            onReset={() => setTimeOffset(0)}
          />

          <InfoPanel />
        </div>
      </div>
    </div>
  )
}
