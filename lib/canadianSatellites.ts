import type { Satellite } from "./types"

// Sample Canadian satellites with real NORAD IDs
export const CANADIAN_SATELLITES: Satellite[] = [
  {
    noradId: 39089,
    name: "SAPPHIRE",
    line1: "1 39089U 13009A   24100.50000000  .00000000  00000-0  00000-0 0  9999",
    line2: "2 39089  98.0000 180.0000 0001000  90.0000 270.0000 14.00000000000000",
    launchDate: "2013-02-25",
    status: "active",
    operator: "Canadian Armed Forces",
    purpose: "Space Surveillance",
  },
  {
    noradId: 32382,
    name: "RADARSAT-2",
    line1: "1 32382U 07061A   24100.50000000  .00000000  00000-0  00000-0 0  9999",
    line2: "2 32382  98.6000 180.0000 0001200  90.0000 270.0000 14.30000000000000",
    launchDate: "2007-12-14",
    status: "active",
    operator: "MDA",
    purpose: "Earth Observation",
  },
  {
    noradId: 46484,
    name: "RADARSAT CONSTELLATION 1",
    line1: "1 46484U 19034A   24100.50000000  .00000000  00000-0  00000-0 0  9999",
    line2: "2 46484  97.7400 180.0000 0001100  90.0000 270.0000 14.98000000000000",
    launchDate: "2019-06-12",
    status: "active",
    operator: "Canadian Space Agency",
    purpose: "Earth Observation",
  },
  {
    noradId: 46485,
    name: "RADARSAT CONSTELLATION 2",
    line1: "1 46485U 19034B   24100.50000000  .00000000  00000-0  00000-0 0  9999",
    line2: "2 46485  97.7400 180.0000 0001100  90.0000 270.0000 14.98000000000000",
    launchDate: "2019-06-12",
    status: "active",
    operator: "Canadian Space Agency",
    purpose: "Earth Observation",
  },
  {
    noradId: 46486,
    name: "RADARSAT CONSTELLATION 3",
    line1: "1 46486U 19034C   24100.50000000  .00000000  00000-0  00000-0 0  9999",
    line2: "2 46486  97.7400 180.0000 0001100  90.0000 270.0000 14.98000000000000",
    launchDate: "2019-06-12",
    status: "active",
    operator: "Canadian Space Agency",
    purpose: "Earth Observation",
  },
  {
    noradId: 27843,
    name: "SCISAT-1",
    line1: "1 27843U 03036A   24100.50000000  .00000000  00000-0  00000-0 0  9999",
    line2: "2 27843  73.9000 180.0000 0004000  90.0000 270.0000 14.77000000000000",
    launchDate: "2003-08-12",
    status: "active",
    operator: "Canadian Space Agency",
    purpose: "Atmospheric Research",
  },
  {
    noradId: 40895,
    name: "CASSIOPE",
    line1: "1 40895U 15052A   24100.50000000  .00000000  00000-0  00000-0 0  9999",
    line2: "2 40895  80.9500 180.0000 0015000  90.0000 270.0000 14.85000000000000",
    launchDate: "2013-09-29",
    status: "active",
    operator: "Canadian Space Agency",
    purpose: "Communications & Science",
  },
  {
    noradId: 25063,
    name: "RADARSAT-1",
    line1: "1 25063U 97077A   24100.50000000  .00000000  00000-0  00000-0 0  9999",
    line2: "2 25063  98.6000 180.0000 0001200  90.0000 270.0000 14.30000000000000",
    launchDate: "1995-11-04",
    status: "inactive",
    operator: "Canadian Space Agency",
    purpose: "Earth Observation",
  },
  {
    noradId: 43616,
    name: "M3MSAT",
    line1: "1 43616U 18046A   24100.50000000  .00000000  00000-0  00000-0 0  9999",
    line2: "2 43616  97.5000 180.0000 0001500  90.0000 270.0000 15.10000000000000",
    launchDate: "2016-06-22",
    status: "active",
    operator: "Canadian Armed Forces",
    purpose: "Maritime Surveillance",
  },
  {
    noradId: 44878,
    name: "TELESAT TELSTAR 19V",
    line1: "1 44878U 19071A   24100.50000000  .00000000  00000-0  00000-0 0  9999",
    line2: "2 44878   0.0200 180.0000 0001000  90.0000 270.0000  1.00270000000000",
    launchDate: "2018-07-22",
    status: "active",
    operator: "Telesat",
    purpose: "Communications",
  },
]

// Generate more realistic TLE data based on current date
export function generateRealisticTLE(satellite: Satellite): Satellite {
  const now = new Date()
  const epochYear = now.getFullYear() % 100
  const dayOfYear = Math.floor((now.getTime() - new Date(now.getFullYear(), 0, 0).getTime()) / 86400000)
  const epochDay = dayOfYear + (now.getHours() * 3600 + now.getMinutes() * 60 + now.getSeconds()) / 86400

  // Update TLE with current epoch
  const line1Parts = satellite.line1.split(" ")
  line1Parts[3] = `${epochYear}${epochDay.toFixed(8).padStart(12, "0")}`

  return {
    ...satellite,
    line1: line1Parts.join(" "),
  }
}
