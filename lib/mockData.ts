import type { ConjunctionEvent } from "./types"
import { CANADIAN_SATELLITES } from "./canadianSatellites"

// Generate mock conjunction events for demonstration
export function generateMockConjunctions(): ConjunctionEvent[] {
  const events: ConjunctionEvent[] = []
  const now = new Date()

  // Create some realistic conjunction scenarios
  const conjunctionScenarios = [
    {
      sat1: CANADIAN_SATELLITES[0], // SAPPHIRE
      sat2: CANADIAN_SATELLITES[1], // RADARSAT-2
      minRange: 2.5,
      probability: 0.00001,
      hoursFromNow: 12,
    },
    {
      sat1: CANADIAN_SATELLITES[2], // RCM-1
      sat2: CANADIAN_SATELLITES[3], // RCM-2
      minRange: 5.8,
      probability: 0.000001,
      hoursFromNow: 24,
    },
    {
      sat1: CANADIAN_SATELLITES[1], // RADARSAT-2
      sat2: CANADIAN_SATELLITES[6], // CASSIOPE
      minRange: 1.2,
      probability: 0.0001,
      hoursFromNow: 6,
    },
    {
      sat1: CANADIAN_SATELLITES[4], // RCM-3
      sat2: CANADIAN_SATELLITES[5], // SCISAT-1
      minRange: 8.5,
      probability: 0.0000001,
      hoursFromNow: 48,
    },
    {
      sat1: CANADIAN_SATELLITES[0], // SAPPHIRE
      sat2: CANADIAN_SATELLITES[8], // M3MSAT
      minRange: 0.8,
      probability: 0.001,
      hoursFromNow: 3,
    },
  ]

  conjunctionScenarios.forEach((scenario, index) => {
    const tca = new Date(now.getTime() + scenario.hoursFromNow * 3600 * 1000)

    let riskLevel: "low" | "medium" | "high" = "low"
    if (scenario.probability > 0.0001) riskLevel = "high"
    else if (scenario.probability > 0.00001) riskLevel = "medium"

    events.push({
      id: `conj-${index + 1}`,
      satellite1: scenario.sat1.name,
      satellite2: scenario.sat2.name,
      noradId1: scenario.sat1.noradId,
      noradId2: scenario.sat2.noradId,
      tca,
      minRange: scenario.minRange,
      probability: scenario.probability,
      relativeVelocity: 10 + Math.random() * 5,
      riskLevel,
    })
  })

  return events.sort((a, b) => a.tca.getTime() - b.tca.getTime())
}
