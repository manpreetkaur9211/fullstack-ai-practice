import { Metric } from "@/lib/types";

export const TodaysMetrics = ({metrics}: { metrics: Metric[] }) => {
    return (
        <div className="p-4 bg-white rounded-md shadow-md">

            <h2 className="text-xl font-semibold text-gray-800 mb-2">
                Today&apos;s Metrics</h2>
            <p className="text-gray-700">This component will display today&apos;s health metrics for the user.</p>
            <ul className="list-disc list-inside text-gray-700 mt-2">
                {metrics.map((metric, index) => (
                    <li key={index}>{metric.type}: {metric.value}</li>
                ))}
            </ul>
        </div>
    );
}