import { NextResponse } from "next/server"
import { CANADIAN_SATELLITES, generateRealisticTLE } from "@/lib/canadianSatellites"
import { dataService } from "@/lib/dataService"

export async function GET() {
  try {
    console.log("[v0 API] Fetching satellite TLE data...")

    const noradIds = CANADIAN_SATELLITES.map((sat) => sat.noradId)
    const realTLEData = await dataService.fetchBatchTLE(noradIds)

    console.log("[v0 API] Fetched real TLE data for", realTLEData.size, "satellites")

    const satellites = CANADIAN_SATELLITES.map((sat) => {
      const realData = realTLEData.get(sat.noradId)
      if (realData) {
        console.log("[v0 API] Using real TLE for", sat.name)
        return {
          ...sat,
          line1: realData.line1,
          line2: realData.line2,
        }
      }
      console.log("[v0 API] Using generated TLE for", sat.name)
      return generateRealisticTLE(sat)
    })

    return NextResponse.json(satellites)
  } catch (error) {
    console.error("[v0 API] Error in satellites API:", error)
    console.log("[v0 API] Falling back to generated TLE data")
    const satellites = CANADIAN_SATELLITES.map(generateRealisticTLE)
    return NextResponse.json(satellites)
  }
}
