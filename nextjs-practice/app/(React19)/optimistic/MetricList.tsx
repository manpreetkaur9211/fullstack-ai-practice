"use client";
import { Metric } from "@/lib/types";
import { useEffect, useOptimistic, useState, useTransition } from "react";
import { deleteMetric } from "./actions";
//useOptimistic and useTransition are for handling optimistic UI updates and transitions, not for data fetching.
//Build a MetricList component where:
//   - Metrics display with a "Delete" button each
//   - Clicking Delete immediately removes it from the UI (optimistic)
//   - The actual delete runs in the background (2-second delay to simulate)
//   - If delete fails (add a 20% random failure rate), the metric reappears
//   - Show a toast notification on failure: "Failed to delete metric"
export const MetricList = ({ metrics }: { metrics: Metric[] }) => {
  const [isPending, startTransition] = useTransition(); // This is needed to use useOptimistic, but we won't actually use the transition state in this example since we're doing an optimistic update without a pending state.
  const [optimisticMetrics, removeMetricOptimistically] = useOptimistic(
    metrics,
    (currentState, id) => {
      return currentState.filter((metric) => metric.id !== id);
    },
  );
  const [toastmsg, setToast] = useState<string | null>(null); // State to manage toast messages
  useEffect(() => {
    if(!toastmsg) return; // If there's no message, don't set a timer
    const timer = setTimeout(() => {
      // Clear the toast message after 3 seconds
      setToast(null);
    }, 3000);
    return () => clearTimeout(timer);
  }, [toastmsg]);
  
  const onDelete = async (id: string) => {
    startTransition(async () => {
      removeMetricOptimistically(id); // Optimistically remove the metric from the UI
      //If delete fails (add a 20% random failure rate), the metric reappears
      //Show a toast notification on failure: "Failed to delete metric"
      try {
        await deleteMetric(id); //
      } catch (error) {
        setToast("Failed to delete metric"); // Show a toast notification on failure
        console.error("Failed to delete metric:", error);
        // Here you would typically show a toast notification
      }
    });
  };
  return (
    <div className="max-w-4xl mx-auto p-6 bg-white dark:bg-gray-900 rounded-lg shadow-lg">
      <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-4">
        Metric List
      </h2>
      <p className="text-gray-600 dark:text-gray-300 mb-6">
        This component will display a list of health metrics.
      </p>
      <div className="space-y-4">
        {optimisticMetrics.map((metric) => (
          <div
            key={metric.id}
            className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700 hover:shadow-md transition-shadow duration-200"
          >
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                    {metric.type}
                  </span>
                  <span className="text-sm text-gray-500 dark:text-gray-400">
                    {metric.recordedAt.toLocaleTimeString()}
                  </span>
                </div>
                <p className="text-lg font-semibold text-gray-900 dark:text-white">
                  {metric.value}
                </p>
              </div>
              <button
                disabled={isPending}
                onClick={() => onDelete(metric.id)}
                className="ml-4 px-4 py-2 bg-red-500 hover:bg-red-600 disabled:bg-red-300 disabled:cursor-not-allowed text-white font-medium rounded-md transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
              >
                Delete
              </button>
            </div>
          </div>
        ))}
      </div>
      {toastmsg && (
        <div className="fixed bottom-4 left-1/2 transform -translate-x-1/2 bg-red-100 text-red-700 px-4 py-2 rounded-md shadow-md">
          {toastmsg}
        </div>
      )}
      {optimisticMetrics.length === 0 && (
        <div className="text-center py-8 text-gray-500 dark:text-gray-400">
          No metrics available
        </div>
      )}
    </div>
  );
};
