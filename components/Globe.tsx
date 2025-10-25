"use client"

import { useEffect, useRef } from "react"
import GlobeGL from "globe.gl"
import type { SatellitePosition, OrbitPath, ConjunctionEvent } from "@/lib/types"

interface GlobeProps {
  satellites: SatellitePosition[]
  orbits: OrbitPath[]
  conjunctions: ConjunctionEvent[]
  selectedSatellite: number | null
  onSatelliteClick: (noradId: number) => void
  timeOffset: number
}

export default function Globe({
  satellites,
  orbits,
  conjunctions,
  selectedSatellite,
  onSatelliteClick,
  timeOffset,
}: GlobeProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const globeRef = useRef<any>(null)

  // Initialize globe
  useEffect(() => {
    if (!containerRef.current || globeRef.current) return

    const globe = GlobeGL()
    globeRef.current = globe

    globe(containerRef.current)
      .globeImageUrl("//unpkg.com/three-globe/example/img/earth-blue-marble.jpg")
      .bumpImageUrl("//unpkg.com/three-globe/example/img/earth-topology.png")
      .backgroundImageUrl("//unpkg.com/three-globe/example/img/night-sky.png")
      .width(containerRef.current.offsetWidth)
      .height(containerRef.current.offsetHeight)
      .atmosphereColor("#3b82f6")
      .atmosphereAltitude(0.15)

    // Set initial camera position
    globe.pointOfView({ lat: 45, lng: -75, altitude: 2.5 }, 0)

    // Handle window resize
    const handleResize = () => {
      if (containerRef.current && globeRef.current) {
        globeRef.current.width(containerRef.current.offsetWidth).height(containerRef.current.offsetHeight)
      }
    }

    window.addEventListener("resize", handleResize)

    return () => {
      window.removeEventListener("resize", handleResize)
      if (globeRef.current) {
        globeRef.current._destructor()
        globeRef.current = null
      }
    }
  }, [])

  // Update satellite points
  useEffect(() => {
    if (!globeRef.current || satellites.length === 0) return

    const pointsData = satellites.map((sat) => ({
      lat: sat.latitude,
      lng: sat.longitude,
      alt: sat.altitude / 6371, // Normalize to Earth radii
      noradId: sat.noradId,
      name: sat.name,
      velocity: sat.velocity,
      isSelected: sat.noradId === selectedSatellite,
    }))

    globeRef.current
      .pointsData(pointsData)
      .pointLat("lat")
      .pointLng("lng")
      .pointAltitude("alt")
      .pointColor((d: any) => {
        if (d.isSelected) return "#10b981" // Accent color for selected
        return "#3b82f6" // Primary color
      })
      .pointRadius((d: any) => (d.isSelected ? 0.8 : 0.5))
      .pointLabel((d: any) => {
        return `
          <div style="background: rgba(10, 15, 35, 0.95); padding: 12px; border-radius: 8px; border: 1px solid rgb(59, 130, 246); color: rgb(240, 250, 255); font-family: system-ui; max-width: 250px;">
            <div style="font-weight: bold; font-size: 14px; margin-bottom: 8px; color: rgb(59, 130, 246);">${d.name}</div>
            <div style="font-size: 12px; line-height: 1.6;">
              <div><strong>NORAD ID:</strong> ${d.noradId}</div>
              <div><strong>Altitude:</strong> ${(d.alt * 6371).toFixed(1)} km</div>
              <div><strong>Velocity:</strong> ${d.velocity.toFixed(2)} km/s</div>
              <div><strong>Position:</strong> ${d.lat.toFixed(2)}°, ${d.lng.toFixed(2)}°</div>
            </div>
          </div>
        `
      })
      .onPointClick((point: any) => {
        onSatelliteClick(point.noradId)
      })
  }, [satellites, selectedSatellite, onSatelliteClick])

  // Update orbital paths
  useEffect(() => {
    if (!globeRef.current || orbits.length === 0) return

    const pathsData = orbits.map((orbit) => ({
      coords: orbit.positions.map((pos) => [pos.lat, pos.lng, pos.alt / 6371]),
      noradId: orbit.noradId,
      isSelected: orbit.noradId === selectedSatellite,
    }))

    globeRef.current
      .pathsData(pathsData)
      .pathPoints("coords")
      .pathPointLat((p: any) => p[0])
      .pathPointLng((p: any) => p[1])
      .pathPointAlt((p: any) => p[2])
      .pathColor((d: any) => (d.isSelected ? "#10b981" : "#3b82f680"))
      .pathStroke((d: any) => (d.isSelected ? 2 : 1))
      .pathDashLength(0.5)
      .pathDashGap(0.2)
      .pathDashAnimateTime(20000)
      .pathTransitionDuration(0)
  }, [orbits, selectedSatellite])

  // Update conjunction arcs
  useEffect(() => {
    if (!globeRef.current || conjunctions.length === 0 || satellites.length === 0) return

    const arcsData = conjunctions
      .filter((conj) => {
        const sat1 = satellites.find((s) => s.noradId === conj.noradId1)
        const sat2 = satellites.find((s) => s.noradId === conj.noradId2)
        return sat1 && sat2
      })
      .map((conj) => {
        const sat1 = satellites.find((s) => s.noradId === conj.noradId1)!
        const sat2 = satellites.find((s) => s.noradId === conj.noradId2)!

        return {
          startLat: sat1.latitude,
          startLng: sat1.longitude,
          endLat: sat2.latitude,
          endLng: sat2.longitude,
          riskLevel: conj.riskLevel,
          minRange: conj.minRange,
          probability: conj.probability,
          satellite1: conj.satellite1,
          satellite2: conj.satellite2,
        }
      })

    globeRef.current
      .arcsData(arcsData)
      .arcStartLat("startLat")
      .arcStartLng("startLng")
      .arcEndLat("endLat")
      .arcEndLng("endLng")
      .arcColor((d: any) => {
        if (d.riskLevel === "high") return "#ef4444"
        if (d.riskLevel === "medium") return "#f59e0b"
        return "#6b7280"
      })
      .arcStroke((d: any) => {
        if (d.riskLevel === "high") return 2
        if (d.riskLevel === "medium") return 1.5
        return 1
      })
      .arcDashLength(0.4)
      .arcDashGap(0.2)
      .arcDashAnimateTime(3000)
      .arcLabel((d: any) => {
        return `
          <div style="background: rgba(10, 15, 35, 0.95); padding: 12px; border-radius: 8px; border: 1px solid ${d.riskLevel === "high" ? "#ef4444" : d.riskLevel === "medium" ? "#f59e0b" : "#6b7280"}; color: rgb(240, 250, 255); font-family: system-ui; max-width: 280px;">
            <div style="font-weight: bold; font-size: 14px; margin-bottom: 8px; color: ${d.riskLevel === "high" ? "#ef4444" : d.riskLevel === "medium" ? "#f59e0b" : "#6b7280"};">Conjunction Alert</div>
            <div style="font-size: 12px; line-height: 1.6;">
              <div><strong>${d.satellite1}</strong> ↔ <strong>${d.satellite2}</strong></div>
              <div style="margin-top: 6px;"><strong>Min Range:</strong> ${d.minRange.toFixed(2)} km</div>
              <div><strong>Probability:</strong> ${(d.probability * 100).toExponential(2)}%</div>
              <div><strong>Risk:</strong> ${d.riskLevel.toUpperCase()}</div>
            </div>
          </div>
        `
      })
  }, [conjunctions, satellites])

  return <div ref={containerRef} className="h-full w-full" />
}
