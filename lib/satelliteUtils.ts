import * as satellite from "satellite.js"
import type { Satellite, SatellitePosition, OrbitPath } from "./types"

export function propagateSatellite(sat: Satellite, date: Date = new Date()): SatellitePosition | null {
  try {
    const satrec = satellite.twoline2satrec(sat.line1, sat.line2)
    const positionAndVelocity = satellite.propagate(satrec, date)

    if (typeof positionAndVelocity.position === "boolean" || typeof positionAndVelocity.velocity === "boolean") {
      return null
    }

    const positionEci = positionAndVelocity.position
    const velocityEci = positionAndVelocity.velocity

    if (!positionEci || !velocityEci) return null

    const gmst = satellite.gstime(date)
    const positionGd = satellite.eciToGeodetic(positionEci, gmst)

    const velocity = Math.sqrt(
      velocityEci.x * velocityEci.x + velocityEci.y * velocityEci.y + velocityEci.z * velocityEci.z,
    )

    return {
      noradId: sat.noradId,
      name: sat.name,
      latitude: satellite.degreesLat(positionGd.latitude),
      longitude: satellite.degreesLong(positionGd.longitude),
      altitude: positionGd.height,
      velocity,
      timestamp: date,
    }
  } catch (error) {
    console.error(`Error propagating satellite ${sat.name}:`, error)
    return null
  }
}

export function generateOrbitPath(
  sat: Satellite,
  startDate: Date = new Date(),
  durationMinutes = 100,
  steps = 100,
): OrbitPath {
  const positions: OrbitPath["positions"] = []
  const stepMs = (durationMinutes * 60 * 1000) / steps

  for (let i = 0; i < steps; i++) {
    const date = new Date(startDate.getTime() + i * stepMs)
    const position = propagateSatellite(sat, date)

    if (position) {
      positions.push({
        lat: position.latitude,
        lng: position.longitude,
        alt: position.altitude,
      })
    }
  }

  return {
    noradId: sat.noradId,
    positions,
  }
}

export function calculateDistance(pos1: SatellitePosition, pos2: SatellitePosition): number {
  // Simple Euclidean distance in 3D space (km)
  const R = 6371 // Earth radius in km

  const lat1 = (pos1.latitude * Math.PI) / 180
  const lon1 = (pos1.longitude * Math.PI) / 180
  const lat2 = (pos2.latitude * Math.PI) / 180
  const lon2 = (pos2.longitude * Math.PI) / 180

  const x1 = (R + pos1.altitude) * Math.cos(lat1) * Math.cos(lon1)
  const y1 = (R + pos1.altitude) * Math.cos(lat1) * Math.sin(lon1)
  const z1 = (R + pos1.altitude) * Math.sin(lat1)

  const x2 = (R + pos2.altitude) * Math.cos(lat2) * Math.cos(lon2)
  const y2 = (R + pos2.altitude) * Math.cos(lat2) * Math.sin(lon2)
  const z2 = (R + pos2.altitude) * Math.sin(lat2)

  return Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2) + Math.pow(z2 - z1, 2))
}
