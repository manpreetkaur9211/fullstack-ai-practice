"use client";
import { Metric } from "@/lib/types";
import { use } from "react";

export const MetricsSection = ({ metricsPromise }: { metricsPromise: Promise<Metric[]> }) => {
    const metrics = use(metricsPromise);
    return (
        <div>
            <h2>Metrics</h2>
            <ul>
                {metrics.map((metric) => (
                    <li key={metric.id}>
                        {metric.type}: {metric.value}
                    </li>
                ))}
            </ul>
        </div>
    );
};
