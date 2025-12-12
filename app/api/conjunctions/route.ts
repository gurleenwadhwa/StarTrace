import { type NextRequest, NextResponse } from "next/server";
import { dataService } from "@/lib/dataService";
import { CANADIAN_SATELLITES } from "@/lib/canadianSatellites";
import type { ConjunctionEvent } from "@/lib/types";

// Risk level priority for sorting
function getRiskPriority(level: string): number {
  switch (level) {
    case "high":
      return 3;
    case "medium":
      return 2;
    case "low":
      return 1;
    default:
      return 0;
  }
}

function generateMockConjunctions(): ConjunctionEvent[] {
  const events: ConjunctionEvent[] = [];
  const now = new Date();

  // Create conjunctions between different Canadian satellites
  const conjunctionScenarios = [
    {
      sat1Idx: 0,
      sat2Idx: 6,
      minRange: 2.5,
      probability: 0.00001,
      hoursFromNow: 12,
      riskLevel: "high" as const,
    },
    {
      sat1Idx: 1,
      sat2Idx: 2,
      minRange: 5.8,
      probability: 0.000001,
      hoursFromNow: 24,
      riskLevel: "medium" as const,
    },
    {
      sat1Idx: 2,
      sat2Idx: 3,
      minRange: 1.2,
      probability: 0.0001,
      hoursFromNow: 6,
      riskLevel: "high" as const,
    },
    {
      sat1Idx: 4,
      sat2Idx: 5,
      minRange: 8.5,
      probability: 0.0000001,
      hoursFromNow: 48,
      riskLevel: "low" as const,
    },
    {
      sat1Idx: 6,
      sat2Idx: 7,
      minRange: 0.8,
      probability: 0.001,
      hoursFromNow: 3,
      riskLevel: "high" as const,
    },
    {
      sat1Idx: 8,
      sat2Idx: 9,
      minRange: 3.2,
      probability: 0.00001,
      hoursFromNow: 18,
      riskLevel: "medium" as const,
    },
    {
      sat1Idx: 10,
      sat2Idx: 11,
      minRange: 6.7,
      probability: 0.000001,
      hoursFromNow: 36,
      riskLevel: "low" as const,
    },
    {
      sat1Idx: 11,
      sat2Idx: 12,
      minRange: 1.5,
      probability: 0.00005,
      hoursFromNow: 9,
      riskLevel: "high" as const,
    },
  ];

  conjunctionScenarios.forEach((scenario, index) => {
    const sat1 = CANADIAN_SATELLITES[scenario.sat1Idx];
    const sat2 = CANADIAN_SATELLITES[scenario.sat2Idx];

    if (!sat1 || !sat2) return;

    const tca = new Date(now.getTime() + scenario.hoursFromNow * 3600 * 1000);

    events.push({
      id: `conj-${index + 1}`,
      satellite1: sat1.name,
      satellite2: sat2.name,
      noradId1: sat1.noradId,
      noradId2: sat2.noradId,
      tca,
      minRange: scenario.minRange,
      probability: scenario.probability,
      relativeVelocity: 10 + Math.random() * 5,
      riskLevel: scenario.riskLevel,
    });
  });

  // Sort by collision risk (probability descending, then min range ascending)
  return events.sort((a, b) => {
    // Primary sort: probability (descending - highest risk first)
    const probDiff = b.probability - a.probability;
    if (probDiff !== 0) return probDiff;

    // Secondary sort: minimum range (ascending - closest first)
    return a.minRange - b.minRange;
  });
}

/**
 * Filter conjunctions based on query parameters
 */
function filterConjunctions(
  conjunctions: ConjunctionEvent[],
  params: URLSearchParams
): ConjunctionEvent[] {
  let filtered = [...conjunctions];

  // Filter by risk level
  const riskLevel = params.get("riskLevel");
  if (riskLevel && riskLevel !== "all") {
    filtered = filtered.filter((c) => c.riskLevel === riskLevel);
  }

  // Filter by NORAD ID (satellite1 or satellite2)
  const noradId = params.get("noradId");
  if (noradId) {
    const id = Number.parseInt(noradId);
    if (!Number.isNaN(id)) {
      filtered = filtered.filter(
        (c) => c.noradId1 === id || c.noradId2 === id
      );
    }
  }

  // Filter by minimum probability threshold
  const minProbability = params.get("minProbability");
  if (minProbability) {
    const prob = Number.parseFloat(minProbability);
    if (!Number.isNaN(prob)) {
      filtered = filtered.filter((c) => c.probability >= prob);
    }
  }

  // Filter by maximum minimum range
  const maxMinRange = params.get("maxMinRange");
  if (maxMinRange) {
    const range = Number.parseFloat(maxMinRange);
    if (!Number.isNaN(range)) {
      filtered = filtered.filter((c) => c.minRange <= range);
    }
  }

  // Filter by time window (hours from now)
  const hoursFromNow = params.get("hoursFromNow");
  if (hoursFromNow) {
    const hours = Number.parseFloat(hoursFromNow);
    if (!Number.isNaN(hours)) {
      const now = new Date();
      const targetTime = new Date(now.getTime() + hours * 3600 * 1000);
      filtered = filtered.filter((c) => c.tca <= targetTime);
    }
  }

  // Filter by date range
  const startDate = params.get("startDate");
  const endDate = params.get("endDate");
  if (startDate) {
    const start = new Date(startDate);
    if (!Number.isNaN(start.getTime())) {
      filtered = filtered.filter((c) => c.tca >= start);
    }
  }
  if (endDate) {
    const end = new Date(endDate);
    if (!Number.isNaN(end.getTime())) {
      filtered = filtered.filter((c) => c.tca <= end);
    }
  }

  return filtered;
}

/**
 * Sort conjunctions based on query parameters
 */
function sortConjunctions(
  conjunctions: ConjunctionEvent[],
  sortBy?: string
): ConjunctionEvent[] {
  const sorted = [...conjunctions];

  switch (sortBy) {
    case "probability":
      sorted.sort((a, b) => b.probability - a.probability);
      break;
    case "minRange":
      sorted.sort((a, b) => a.minRange - b.minRange);
      break;
    case "tca":
      sorted.sort((a, b) => a.tca.getTime() - b.tca.getTime());
      break;
    case "relativeVelocity":
      sorted.sort((a, b) => b.relativeVelocity - a.relativeVelocity);
      break;
    case "riskLevel":
      sorted.sort((a, b) => getRiskPriority(b.riskLevel) - getRiskPriority(a.riskLevel));
      break;
    default:
      // Default: probability descending, then min range ascending
      sorted.sort((a, b) => {
        const probDiff = b.probability - a.probability;
        if (probDiff !== 0) return probDiff;
        return a.minRange - b.minRange;
      });
  }

  return sorted;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    
    // Use the actual CANADIAN_SATELLITES list directly
    const allConjunctions: ConjunctionEvent[] = [];

    // Fetch conjunctions for each Canadian satellite using their actual names
    for (const satellite of CANADIAN_SATELLITES) {
      try {
        const csvData = await dataService.fetchConjunctionsFromCelestrak(
          satellite.name,
          satellite.noradId
        );
        if (csvData) {
          const conjunctions = dataService.parseSOCRATESData(
            csvData,
            satellite.name,
            satellite.noradId
          );
          allConjunctions.push(...conjunctions);
        }
      } catch (error) {
        // Silently continue if one satellite fails
      }
    }

    // Use mock data if no real data available
    const conjunctions =
      allConjunctions.length > 0
        ? allConjunctions
        : generateMockConjunctions();

    // Apply filters
    const filtered = filterConjunctions(conjunctions, searchParams);

    // Apply sorting
    const sortBy = searchParams.get("sortBy");
    const sorted = sortConjunctions(filtered, sortBy || undefined);

    // Limit results if specified
    const limit = searchParams.get("limit");
    const limitNum = limit ? Number.parseInt(limit) : undefined;
    const finalResults =
      limitNum && limitNum > 0 ? sorted.slice(0, limitNum) : sorted;

    // Set cache control headers to prevent any caching
    return NextResponse.json(finalResults, {
      headers: {
        "Cache-Control":
          "no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0",
        Pragma: "no-cache",
        Expires: "0",
      },
    });
  } catch (error) {
    console.error("Error in conjunctions API:", error);

    const mockConjunctions = generateMockConjunctions();
    const { searchParams } = new URL(request.url);
    const filtered = filterConjunctions(mockConjunctions, searchParams);
    const sortBy = searchParams.get("sortBy");
    const sorted = sortConjunctions(filtered, sortBy || undefined);

    return NextResponse.json(sorted, {
      headers: {
        "Cache-Control":
          "no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0",
        Pragma: "no-cache",
        Expires: "0",
      },
    });
  }
}

/**
 * POST endpoint for advanced conjunction analysis
 * Accepts analysis parameters in the request body
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const {
      filters = {},
      analysis = {},
    }: {
      filters?: {
        riskLevel?: string;
        noradId?: number;
        minProbability?: number;
        maxMinRange?: number;
        hoursFromNow?: number;
        startDate?: string;
        endDate?: string;
      };
      analysis?: {
        groupBy?: "riskLevel" | "satellite" | "timeWindow";
        includeStats?: boolean;
      };
    } = body;

    // Fetch conjunctions
    const allConjunctions: ConjunctionEvent[] = [];

    for (const satellite of CANADIAN_SATELLITES) {
      try {
        const csvData = await dataService.fetchConjunctionsFromCelestrak(
          satellite.name,
          satellite.noradId
        );
        if (csvData) {
          const conjunctions = dataService.parseSOCRATESData(
            csvData,
            satellite.name,
            satellite.noradId
          );
          allConjunctions.push(...conjunctions);
        }
      } catch (error) {
        // Silently continue
      }
    }

    const conjunctions =
      allConjunctions.length > 0
        ? allConjunctions
        : generateMockConjunctions();

    // Apply filters
    const params = new URLSearchParams();
    if (filters.riskLevel) params.set("riskLevel", filters.riskLevel);
    if (filters.noradId) params.set("noradId", filters.noradId.toString());
    if (filters.minProbability)
      params.set("minProbability", filters.minProbability.toString());
    if (filters.maxMinRange)
      params.set("maxMinRange", filters.maxMinRange.toString());
    if (filters.hoursFromNow)
      params.set("hoursFromNow", filters.hoursFromNow.toString());
    if (filters.startDate) params.set("startDate", filters.startDate);
    if (filters.endDate) params.set("endDate", filters.endDate);

    const filtered = filterConjunctions(conjunctions, params);
    const sorted = sortConjunctions(filtered);

    // Perform analysis
    const result: any = {
      conjunctions: sorted,
      total: sorted.length,
    };

    if (analysis.includeStats) {
      const stats = {
        total: sorted.length,
        byRiskLevel: {
          high: sorted.filter((c) => c.riskLevel === "high").length,
          medium: sorted.filter((c) => c.riskLevel === "medium").length,
          low: sorted.filter((c) => c.riskLevel === "low").length,
        },
        maxProbability:
          sorted.length > 0
            ? Math.max(...sorted.map((c) => c.probability))
            : 0,
        minRange:
          sorted.length > 0
            ? Math.min(...sorted.map((c) => c.minRange))
            : 0,
        avgRelativeVelocity:
          sorted.length > 0
            ? sorted.reduce((sum, c) => sum + c.relativeVelocity, 0) /
              sorted.length
            : 0,
      };
      result.stats = stats;
    }

    if (analysis.groupBy === "riskLevel") {
      result.grouped = {
        high: sorted.filter((c) => c.riskLevel === "high"),
        medium: sorted.filter((c) => c.riskLevel === "medium"),
        low: sorted.filter((c) => c.riskLevel === "low"),
      };
    } else if (analysis.groupBy === "satellite") {
      const grouped: Record<number, ConjunctionEvent[]> = {};
      sorted.forEach((c) => {
        if (!grouped[c.noradId1]) grouped[c.noradId1] = [];
        if (!grouped[c.noradId2]) grouped[c.noradId2] = [];
        grouped[c.noradId1].push(c);
        grouped[c.noradId2].push(c);
      });
      result.grouped = grouped;
    } else if (analysis.groupBy === "timeWindow") {
      const now = new Date();
      result.grouped = {
        "0-6h": sorted.filter((c) => {
          const hours = (c.tca.getTime() - now.getTime()) / (1000 * 60 * 60);
          return hours >= 0 && hours < 6;
        }),
        "6-24h": sorted.filter((c) => {
          const hours = (c.tca.getTime() - now.getTime()) / (1000 * 60 * 60);
          return hours >= 6 && hours < 24;
        }),
        "24-48h": sorted.filter((c) => {
          const hours = (c.tca.getTime() - now.getTime()) / (1000 * 60 * 60);
          return hours >= 24 && hours < 48;
        }),
        "48h+": sorted.filter((c) => {
          const hours = (c.tca.getTime() - now.getTime()) / (1000 * 60 * 60);
          return hours >= 48;
        }),
      };
    }

    return NextResponse.json(result, {
      headers: {
        "Cache-Control":
          "no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0",
        Pragma: "no-cache",
        Expires: "0",
      },
    });
  } catch (error) {
    console.error("Error in conjunctions POST API:", error);
    return NextResponse.json(
      { error: "Failed to perform conjunction analysis" },
      { status: 500 }
    );
  }
}
