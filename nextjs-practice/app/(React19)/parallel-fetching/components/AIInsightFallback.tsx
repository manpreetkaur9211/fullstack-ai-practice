// somewhere reusable, e.g. in components/AIInsightErrorFallback.tsx
"use client";
import { useErrorBoundary } from "react-error-boundary";

export const AIInsightErrorFallback = () => {
  const { resetBoundary } = useErrorBoundary();
  return (
    <div className="p-4 bg-red-100 rounded-md text-red-700">
      <p>Unable to generate insight</p>
      <button onClick={resetBoundary} className="mt-2 underline">
        Try again
      </button>
    </div>
  );
};
