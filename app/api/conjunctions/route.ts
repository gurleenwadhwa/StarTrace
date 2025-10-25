import { type NextRequest, NextResponse } from "next/server"
import { dataService } from "@/lib/dataService"

export async function GET(request: NextRequest) {
  try {
    console.log("[v0 API] Fetching conjunction data...")

    const keyNoradIds = [39089, 32382] // SAPPHIRE and RADARSAT-2
    const allConjunctions: any[] = []

    for (const noradId of keyNoradIds) {
      try {
        console.log("[v0 API] Fetching conjunctions for NORAD", noradId)
        const csvData = await dataService.fetchConjunctionsFromCelestrak(noradId)
        if (csvData) {
          const conjunctions = dataService.parseSOCRATESData(csvData)
          console.log("[v0 API] Found", conjunctions.length, "conjunctions for NORAD", noradId)
          allConjunctions.push(...conjunctions)
        }
      } catch (error) {
        console.log("[v0 API] Failed to fetch conjunctions for NORAD", noradId)
      }
    }

    if (allConjunctions.length > 0) {
      console.log("[v0 API] Returning", allConjunctions.length, "real conjunction events")
      return NextResponse.json(allConjunctions)
    }

    console.log("[v0 API] No real conjunction data available")
    return NextResponse.json([])
  } catch (error) {
    console.error("[v0 API] Error in conjunctions API:", error)
    console.log("[v0 API] Error occurred, returning empty array")
    return NextResponse.json([])
  }
}
