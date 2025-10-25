import { type NextRequest, NextResponse } from "next/server";
import { dataService } from "@/lib/dataService";

export async function GET(request: NextRequest) {
  try {
    console.log("[v0 API] Fetching conjunction data...");

    // Canadian satellites to fetch conjunction data for
    const canadianSatellites = [
      { noradId: 39088, name: "SAPPHIRE" },
      { noradId: 27843, name: "SCISAT-1" },
      { noradId: 32382, name: "RADARSAT-2" },
      { noradId: 46484, name: "RCM-1" },
      { noradId: 46485, name: "RCM-2" },
      { noradId: 46486, name: "RCM-3" },
      { noradId: 43616, name: "M3MSat" },
      { noradId: 26861, name: "Anik F1" },
      { noradId: 25740, name: "Nimiq 1" },
      { noradId: 27632, name: "Nimiq 2" },
      { noradId: 23846, name: "MSAT" },
      { noradId: 21726, name: "Anik E1" },
      { noradId: 21222, name: "Anik E2" },
      { noradId: 40895, name: "CASSIOPE" },
      { noradId: 39089, name: "NEOSSat" },
    ];

    const allConjunctions: any[] = [];

    // Fetch conjunctions for each Canadian satellite
    for (const satellite of canadianSatellites) {
      try {
        console.log(
          `[v0 API] Fetching conjunctions for ${satellite.name} (NORAD ${satellite.noradId})`
        );
        const csvData = await dataService.fetchConjunctionsFromCelestrak(
          satellite.noradId
        );
        if (csvData) {
          const conjunctions = dataService.parseSOCRATESData(
            csvData,
            satellite.name,
            satellite.noradId
          );
          console.log(
            `[v0 API] Found ${conjunctions.length} conjunctions for ${satellite.name}`
          );
          allConjunctions.push(...conjunctions);
        }
      } catch (error) {
        console.log(
          `[v0 API] Failed to fetch conjunctions for ${satellite.name} (NORAD ${satellite.noradId}):`,
          error
        );
      }
    }

    if (allConjunctions.length > 0) {
      console.log(
        "[v0 API] Returning",
        allConjunctions.length,
        "real conjunction events"
      );
      return NextResponse.json(allConjunctions);
    }

    console.log(
      "[v0 API] No real conjunction data available, returning empty array"
    );
    return NextResponse.json([], { status: 200 });
  } catch (error) {
    console.error("[v0 API] Error in conjunctions API:", error);
    console.log("[v0 API] Error occurred, returning empty array");
    return NextResponse.json([]);
  }
}
