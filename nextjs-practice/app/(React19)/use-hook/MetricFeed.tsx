"use client";

import { Metric } from "@/lib/types";
import { use } from "react";

export const MetricFeed = ({metricsPromise}:{metricsPromise: Promise<Metric[]>}) => {
    const metrics = use(metricsPromise);// wait here for the promise to resolve, then render the metrics
    return (
        <div>
            <h2>Metric Feed</h2>
            <p>This component will display a list of health metrics.</p>
            {metrics.map(metric => (
                <div key={metric.id}>
                    <strong>{metric.type}</strong>: {metric.value} (recorded at {metric.recordedAt.toLocaleTimeString()})
                </div>
            ))}
        </div>
    );
}