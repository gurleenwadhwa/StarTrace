import { type NextRequest, NextResponse } from "next/server"
import { dataService } from "@/lib/dataService"
import { CANADIAN_SATELLITES, generateRealisticTLE } from "@/lib/canadianSatellites"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { noradIds } = body

    if (!Array.isArray(noradIds)) {
      return NextResponse.json({ error: "noradIds must be an array" }, { status: 400 })
    }

    // Try to fetch from Space-Track if credentials are available
    try {
      const satellites = await dataService.fetchBatchTLE(noradIds)
      if (satellites.size > 0) {
        return NextResponse.json(Object.fromEntries(satellites))
      }
    } catch (error) {
      console.log("Space-Track unavailable, using fallback data")
    }

    // Fallback to local data
    const results: Record<number, any> = {}
    noradIds.forEach((id: number) => {
      const localSatellite = CANADIAN_SATELLITES.find((s) => s.noradId === id)
      if (localSatellite) {
        results[id] = generateRealisticTLE(localSatellite)
      }
    })

    return NextResponse.json(results)
  } catch (error) {
    console.error("Error in batch TLE API:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
