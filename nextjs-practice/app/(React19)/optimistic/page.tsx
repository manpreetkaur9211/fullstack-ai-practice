import { fetchMetrics } from "@/lib/data";
import { MetricList } from "./MetricList";

export default async function OptimisticPage() {
  const metrics = await fetchMetrics(); // Fetch metrics to display in the list

  return (
    <div>
      <h1>Optimistic UI</h1>
      <p>
        This page will demonstrate an optimistic UI update when deleting a
        metric.(useOptimistic and useTransition)
      </p>
      <MetricList metrics={metrics}  />
    </div>
  );
};
