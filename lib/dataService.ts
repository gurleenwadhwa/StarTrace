import axios from "axios"
import type { Satellite, ConjunctionEvent } from "./types"

// Cache for TLE data
const tleCache: Map<number, { data: Satellite; timestamp: number }> = new Map()
const CACHE_DURATION = 1000 * 60 * 60 // 1 hour

export class DataService {
  private static instance: DataService
  private spaceTrackToken: string | null = null

  private constructor() {}

  static getInstance(): DataService {
    if (!DataService.instance) {
      DataService.instance = new DataService()
    }
    return DataService.instance
  }

  /**
   * Fetch TLE data from Space-Track.org
   * Requires SPACE_TRACK_USERNAME and SPACE_TRACK_PASSWORD env vars
   */
  async fetchTLEFromSpaceTrack(noradId: number): Promise<Satellite | null> {
    try {
      // Check cache first
      const cached = tleCache.get(noradId)
      if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
        console.log(`[v0 DataService] Using cached TLE for NORAD ${noradId}`)
        return cached.data
      }

      // Authenticate if needed
      if (!this.spaceTrackToken) {
        await this.authenticateSpaceTrack()
      }

      console.log(`[v0 DataService] Fetching TLE for NORAD ${noradId} from Space-Track.org`)

      // Fetch TLE data
      const response = await axios.get(
        `https://www.space-track.org/basicspacedata/query/class/gp/NORAD_CAT_ID/${noradId}/orderby/EPOCH%20desc/limit/1/format/json`,
        {
          headers: {
            Cookie: `spacetrack_csrf_token=${this.spaceTrackToken}`,
          },
          timeout: 10000,
        },
      )

      if (response.data && response.data.length > 0) {
        const data = response.data[0]
        const satellite: Satellite = {
          noradId: Number.parseInt(data.NORAD_CAT_ID),
          name: data.OBJECT_NAME,
          line1: data.TLE_LINE1,
          line2: data.TLE_LINE2,
          status: "active",
        }

        // Cache the result
        tleCache.set(noradId, { data: satellite, timestamp: Date.now() })
        console.log(`[v0 DataService] Successfully fetched TLE for ${satellite.name}`)
        return satellite
      }

      return null
    } catch (error) {
      console.error(`[v0 DataService] Error fetching TLE for NORAD ${noradId}:`, error)
      return null
    }
  }

  private async authenticateSpaceTrack(): Promise<void> {
    const username = process.env.SPACE_TRACK_USERNAME
    const password = process.env.SPACE_TRACK_PASSWORD

    if (!username || !password) {
      console.log("[v0 DataService] Space-Track credentials not configured, skipping authentication")
      throw new Error("Space-Track credentials not configured")
    }

    try {
      console.log("[v0 DataService] Authenticating with Space-Track.org...")

      const response = await axios.post(
        "https://www.space-track.org/ajaxauth/login",
        new URLSearchParams({
          identity: username,
          password: password,
        }),
        {
          headers: {
            "Content-Type": "application/x-www-form-urlencoded",
          },
          timeout: 10000,
        },
      )

      // Extract token from cookies
      const cookies = response.headers["set-cookie"]
      if (cookies) {
        const tokenCookie = cookies.find((c: string) => c.includes("spacetrack_csrf_token"))
        if (tokenCookie) {
          this.spaceTrackToken = tokenCookie.split("=")[1].split(";")[0]
          console.log("[v0 DataService] Successfully authenticated with Space-Track.org")
        }
      }
    } catch (error) {
      console.error("[v0 DataService] Space-Track authentication failed:", error)
      throw error
    }
  }

  /**
   * Fetch conjunction data from Celestrak SOCRATES
   * Returns CSV data that needs to be parsed
   */
  async fetchConjunctionsFromCelestrak(noradId: number): Promise<string | null> {
    try {
      console.log(`[v0 DataService] Fetching conjunctions for NORAD ${noradId} from Celestrak SOCRATES`)

      const response = await axios.get(`https://celestrak.org/SOCRATES/search-results.php?IDENT=${noradId}`, {
        headers: {
          Accept: "text/csv",
        },
        timeout: 10000,
      })

      console.log(`[v0 DataService] Successfully fetched conjunction data from Celestrak`)
      return response.data
    } catch (error) {
      console.error(`[v0 DataService] Error fetching conjunctions for NORAD ${noradId}:`, error)
      return null
    }
  }

  /**
   * Parse SOCRATES CSV data into conjunction events
   */
  parseSOCRATESData(csvData: string): ConjunctionEvent[] {
    const events: ConjunctionEvent[] = []

    try {
      const lines = csvData.split("\n")
      const headers = lines[0].split(",")

      for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim()
        if (!line) continue

        const values = line.split(",")
        if (values.length < headers.length) continue

        // Parse conjunction data (adjust indices based on actual SOCRATES format)
        const event: ConjunctionEvent = {
          id: `socrates-${i}`,
          satellite1: values[0] || "Unknown",
          satellite2: values[1] || "Unknown",
          noradId1: Number.parseInt(values[2]) || 0,
          noradId2: Number.parseInt(values[3]) || 0,
          tca: new Date(values[4] || Date.now()),
          minRange: Number.parseFloat(values[5]) || 0,
          probability: Number.parseFloat(values[6]) || 0,
          relativeVelocity: Number.parseFloat(values[7]) || 0,
          riskLevel: this.calculateRiskLevel(Number.parseFloat(values[5]), Number.parseFloat(values[6])),
        }

        events.push(event)
      }
    } catch (error) {
      console.error("Error parsing SOCRATES data:", error)
    }

    return events
  }

  private calculateRiskLevel(minRange: number, probability: number): "low" | "medium" | "high" {
    if (probability > 0.0001 || minRange < 1) return "high"
    if (probability > 0.00001 || minRange < 5) return "medium"
    return "low"
  }

  /**
   * Fetch TLE data for multiple satellites in batch
   */
  async fetchBatchTLE(noradIds: number[]): Promise<Map<number, Satellite>> {
    const results = new Map<number, Satellite>()

    console.log(`[v0 DataService] Fetching TLE data for ${noradIds.length} satellites in batch`)

    // Process in parallel with rate limiting
    const batchSize = 5
    for (let i = 0; i < noradIds.length; i += batchSize) {
      const batch = noradIds.slice(i, i + batchSize)
      const promises = batch.map((id) => this.fetchTLEFromSpaceTrack(id))
      const batchResults = await Promise.all(promises)

      batchResults.forEach((result, index) => {
        if (result) {
          results.set(batch[index], result)
        }
      })

      // Rate limiting delay
      if (i + batchSize < noradIds.length) {
        await new Promise((resolve) => setTimeout(resolve, 1000))
      }
    }

    console.log(`[v0 DataService] Successfully fetched ${results.size} TLE records`)
    return results
  }

  /**
   * Clear the TLE cache
   */
  clearCache(): void {
    tleCache.clear()
  }
}

export const dataService = DataService.getInstance()
