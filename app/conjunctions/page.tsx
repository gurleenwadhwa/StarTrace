"use client";

import { useState, useEffect, useMemo } from "react";
import { motion } from "framer-motion";
import { 
  AlertTriangle, 
  Clock, 
  TrendingUp, 
  Filter,
  Download,
  RefreshCw,
  Search,
  Calendar,
  BarChart3
} from "lucide-react";
import { format } from "date-fns";
import type { ConjunctionEvent } from "@/lib/types";
import { CANADIAN_SATELLITES } from "@/lib/canadianSatellites";
import ConjunctionTable from "@/components/ConjunctionTable";
import RiskChart from "@/components/RiskChart";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";

export default function ConjunctionAnalysisPage() {
  const [conjunctions, setConjunctions] = useState<ConjunctionEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedSatellite, setSelectedSatellite] = useState<number | null>(null);
  
  // Filter states
  const [searchQuery, setSearchQuery] = useState("");
  const [riskFilter, setRiskFilter] = useState<string>("all");
  const [timeFilter, setTimeFilter] = useState<string>("all");
  const [sortBy, setSortBy] = useState<string>("probability");

  // Fetch conjunctions
  useEffect(() => {
    const fetchConjunctions = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await fetch("/api/conjunctions", {
          cache: "no-store",
        });
        if (!response.ok) {
          throw new Error("Failed to fetch conjunctions");
        }
        const data = await response.json();
        // Convert date strings to Date objects
        const processedData = data.map((conj: any) => ({
          ...conj,
          tca: new Date(conj.tca),
        }));
        setConjunctions(processedData);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load conjunctions");
        console.error("Error fetching conjunctions:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchConjunctions();
    
    // Refresh every 5 minutes
    const interval = setInterval(fetchConjunctions, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  // Filter and sort conjunctions
  const filteredConjunctions = useMemo(() => {
    let filtered = [...conjunctions];

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (conj) =>
          conj.satellite1.toLowerCase().includes(query) ||
          conj.satellite2.toLowerCase().includes(query) ||
          conj.noradId1.toString().includes(query) ||
          conj.noradId2.toString().includes(query)
      );
    }

    // Risk filter
    if (riskFilter !== "all") {
      filtered = filtered.filter((conj) => conj.riskLevel === riskFilter);
    }

    // Time filter
    if (timeFilter !== "all") {
      const now = new Date();
      filtered = filtered.filter((conj) => {
        const hoursUntil = (conj.tca.getTime() - now.getTime()) / (1000 * 60 * 60);
        switch (timeFilter) {
          case "0-6h":
            return hoursUntil >= 0 && hoursUntil < 6;
          case "6-24h":
            return hoursUntil >= 6 && hoursUntil < 24;
          case "24-48h":
            return hoursUntil >= 24 && hoursUntil < 48;
          case "48h+":
            return hoursUntil >= 48;
          default:
            return true;
        }
      });
    }

    // Sort
    filtered.sort((a, b) => {
      switch (sortBy) {
        case "probability":
          return b.probability - a.probability;
        case "minRange":
          return a.minRange - b.minRange;
        case "tca":
          return a.tca.getTime() - b.tca.getTime();
        case "relativeVelocity":
          return b.relativeVelocity - a.relativeVelocity;
        default:
          return 0;
      }
    });

    return filtered;
  }, [conjunctions, searchQuery, riskFilter, timeFilter, sortBy]);

  // Statistics
  const stats = useMemo(() => {
    const total = conjunctions.length;
    const high = conjunctions.filter((c) => c.riskLevel === "high").length;
    const medium = conjunctions.filter((c) => c.riskLevel === "medium").length;
    const low = conjunctions.filter((c) => c.riskLevel === "low").length;
    const now = new Date();
    const urgent = conjunctions.filter((c) => {
      const hoursUntil = (c.tca.getTime() - now.getTime()) / (1000 * 60 * 60);
      return hoursUntil <= 24 && c.riskLevel === "high";
    }).length;
    const maxProbability = total > 0 
      ? Math.max(...conjunctions.map((c) => c.probability))
      : 0;

    return { total, high, medium, low, urgent, maxProbability };
  }, [conjunctions]);

  const formatProbability = (probability: number): string => {
    if (probability <= 0) return "0";
    if (probability >= 1) return "1 in 1";
    const inverse = Math.round(1 / probability);
    return `1 in ${inverse.toLocaleString()}`;
  };

  const handleRefresh = async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/conjunctions", {
        cache: "no-store",
      });
      if (!response.ok) {
        throw new Error("Failed to fetch conjunctions");
      }
      const data = await response.json();
      const processedData = data.map((conj: any) => ({
        ...conj,
        tca: new Date(conj.tca),
      }));
      setConjunctions(processedData);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to refresh conjunctions");
    } finally {
      setLoading(false);
    }
  };

  const handleExport = () => {
    const csv = [
      ["Satellite 1", "Satellite 2", "NORAD ID 1", "NORAD ID 2", "TCA", "Min Range (km)", "Probability", "Relative Velocity (km/s)", "Risk Level"].join(","),
      ...filteredConjunctions.map((c) =>
        [
          c.satellite1,
          c.satellite2,
          c.noradId1,
          c.noradId2,
          format(c.tca, "yyyy-MM-dd HH:mm:ss"),
          c.minRange.toFixed(3),
          c.probability.toExponential(6),
          c.relativeVelocity.toFixed(3),
          c.riskLevel,
        ].join(",")
      ),
    ].join("\n");

    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `conjunction-analysis-${format(new Date(), "yyyy-MM-dd-HHmm")}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  if (loading && conjunctions.length === 0) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-center">
          <RefreshCw className="mx-auto h-8 w-8 animate-spin text-muted-foreground mb-4" />
          <p className="text-muted-foreground">Loading conjunction data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-3">
                <Link href="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
                  <AlertTriangle className="h-6 w-6 text-primary" />
                  <h1 className="text-2xl font-bold text-foreground">
                    Conjunction Analysis
                  </h1>
                </Link>
              </div>
              <p className="text-sm text-muted-foreground mt-1">
                Comprehensive collision risk assessment and monitoring
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleRefresh}
                disabled={loading}
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
                Refresh
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleExport}
                disabled={filteredConjunctions.length === 0}
              >
                <Download className="h-4 w-4 mr-2" />
                Export CSV
              </Button>
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-6 py-6">
        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total Conjunctions
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-foreground">{stats.total}</div>
              <p className="text-xs text-muted-foreground mt-1">Active events</p>
            </CardContent>
          </Card>

          <Card className="border-destructive/20 bg-destructive/5">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-destructive">
                High Risk
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-destructive">{stats.high}</div>
              <p className="text-xs text-destructive/70 mt-1">
                {stats.total > 0 ? `${((stats.high / stats.total) * 100).toFixed(1)}%` : "0%"} of total
              </p>
            </CardContent>
          </Card>

          <Card className="border-yellow-500/20 bg-yellow-500/5">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-yellow-600">
                Urgent (< 24h)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-yellow-600">{stats.urgent}</div>
              <p className="text-xs text-yellow-600/70 mt-1">High risk within 24h</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Max Probability
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-foreground">
                {(stats.maxProbability * 100).toExponential(2)}%
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {stats.maxProbability > 0 ? formatProbability(stats.maxProbability) : "N/A"}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Filter className="h-5 w-5" />
              Filters & Search
            </CardTitle>
            <CardDescription>
              Filter and sort conjunction events by various criteria
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search satellites..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>

              <Select value={riskFilter} onValueChange={setRiskFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Risk Level" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Risk Levels</SelectItem>
                  <SelectItem value="high">High Risk</SelectItem>
                  <SelectItem value="medium">Medium Risk</SelectItem>
                  <SelectItem value="low">Low Risk</SelectItem>
                </SelectContent>
              </Select>

              <Select value={timeFilter} onValueChange={setTimeFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Time to TCA" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Timeframes</SelectItem>
                  <SelectItem value="0-6h">0-6 hours</SelectItem>
                  <SelectItem value="6-24h">6-24 hours</SelectItem>
                  <SelectItem value="24-48h">24-48 hours</SelectItem>
                  <SelectItem value="48h+">48+ hours</SelectItem>
                </SelectContent>
              </Select>

              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger>
                  <SelectValue placeholder="Sort By" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="probability">Probability (High→Low)</SelectItem>
                  <SelectItem value="minRange">Min Range (Close→Far)</SelectItem>
                  <SelectItem value="tca">Time to TCA (Soon→Later)</SelectItem>
                  <SelectItem value="relativeVelocity">Relative Velocity (High→Low)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {filteredConjunctions.length !== conjunctions.length && (
              <div className="mt-4">
                <Badge variant="secondary">
                  Showing {filteredConjunctions.length} of {conjunctions.length} conjunctions
                </Badge>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Error State */}
        {error && (
          <Card className="mb-6 border-destructive">
            <CardContent className="pt-6">
              <div className="flex items-center gap-2 text-destructive">
                <AlertTriangle className="h-5 w-5" />
                <p>{error}</p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Main Content Tabs */}
        <Tabs defaultValue="table" className="space-y-4">
          <TabsList>
            <TabsTrigger value="table">
              <BarChart3 className="h-4 w-4 mr-2" />
              Conjunction Table
            </TabsTrigger>
            <TabsTrigger value="analytics">
              <TrendingUp className="h-4 w-4 mr-2" />
              Analytics
            </TabsTrigger>
          </TabsList>

          <TabsContent value="table" className="space-y-4">
            {filteredConjunctions.length === 0 ? (
              <Card>
                <CardContent className="pt-6">
                  <div className="text-center py-8">
                    <AlertTriangle className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                    <h3 className="text-lg font-semibold text-foreground mb-2">
                      No Conjunctions Found
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      {conjunctions.length === 0
                        ? "No conjunction events are currently available."
                        : "Try adjusting your filters to see more results."}
                    </p>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <ConjunctionTable
                conjunctions={filteredConjunctions}
                onSatelliteSelect={setSelectedSatellite}
              />
            )}
          </TabsContent>

          <TabsContent value="analytics" className="space-y-4">
            {filteredConjunctions.length === 0 ? (
              <Card>
                <CardContent className="pt-6">
                  <div className="text-center py-8">
                    <BarChart3 className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                    <h3 className="text-lg font-semibold text-foreground mb-2">
                      No Data for Analytics
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      {conjunctions.length === 0
                        ? "No conjunction events are currently available for analysis."
                        : "Try adjusting your filters to see analytics."}
                    </p>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <RiskChart conjunctions={filteredConjunctions} />
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}


