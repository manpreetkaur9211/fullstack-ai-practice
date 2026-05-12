// Component to build: MetricsDashboard:  use Server Component + use() + Suspense
//   - Fetches a list of health metrics from a mock API
//   - Shows a loading spinner while fetching
//   - Shows an error message if fetch fails
//   - Renders a list of metrics when loaded
// Server Component — no "use client"
// Start the fetch, pass the Promise down, don't await it
// Wrap the child in <Suspense fallback={<div>Loading...</div>}>
// Child component calls use(metricsPromise) — that's it

import { Suspense } from "react";
import { MetricFeed } from "./MetricFeed";
import { fetchMetrics } from "@/lib/data";



export default function MetricsDashboard() {
    const metricsPromise = fetchMetrics(); // Start fetching immediately, but don't wait here. Let the child handle it with use().
    return (
        <div>
            <h1>Metrics Dashboard</h1>
            <p>This component will fetch and display health metrics using use() and Suspense.</p>
            <Suspense fallback={<div>Loading...</div>}>
                <MetricFeed metricsPromise={metricsPromise} />
            </Suspense>
        </div>
    );
}