// // Component to build: MetricsDashboard use useState + useEffect
// //   - Fetches a list of health metrics from a mock API
// //   - Shows a loading spinner while fetching
// //   - Shows an error message if fetch fails
// //   - Renders a list of metrics when loaded

// "use client";

// import { use, useEffect, useState } from "react";
// import { MetricFeed } from "./MetricFeed";
// import { Metric } from "@/lib/types";
// import { fetchMetrics } from "@/lib/data";

// // useState + useEffect to fetch metrics
// // Manual loading boolean, manual error state
// // You've written this a hundred times
// export default function MetricsDashboard() {
//     const [metrics, setMetrics] = useState<Metric[] | null>(null);
//     const [loading, setLoading] = useState(true);
//     const [error, setError] = useState<string | null>(null);

//     useEffect(() => {
//             try {   
//                 // setLoading(true);
//                 // setError(null); 
//                 fetchMetrics()
//                     .then(data => setMetrics(data))
//                     .catch(err => setError("Failed to fetch metrics"))
//                     .finally(() => setLoading(false));
//             } catch (err) {
//                 // setError("An unexpected error occurred");
//                 // setLoading(false);
//             }   
//     }, []);
    
//     return (
//         <div>
//             <h1>Metrics Dashboard</h1>
//             <p>This component will fetch and display health metrics using useState and useEffect.</p>
//             {/* <MetricFeed metrics={metrics} loading={loading} error={error} /> */}
//         </div>
//     );
// }