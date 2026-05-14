
"use client";
import { Suspense } from "react";
import { ErrorBoundary } from "react-error-boundary";
import { AIInsight } from "./AIInsight";
import { fetchAIInsight } from "@/lib/data";
import { AIInsightErrorFallback } from "./AIInsightFallback";

export const AIInsightWrapper = () => {
  const aiInsightPromise = fetchAIInsight();
  return (
    <ErrorBoundary FallbackComponent={AIInsightErrorFallback}>
      <Suspense
        fallback={
          <div className="p-4 bg-gray-100 rounded-md animate-pulse">
            Loading AI insight...
          </div>
        }
      >
        <AIInsight aiInsightPromise={aiInsightPromise} />
      </Suspense>{" "}
    </ErrorBoundary>
  );
};
