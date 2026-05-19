import { fetchMetrics, fetchUserProfile } from "@/lib/data";
import { Suspense } from "react";
import { ProfileSection } from "./ProfileSection";
import { MetricsSection } from "./MetricSection";
import { AIInsightWrapper } from "../(React19)/parallel-fetching/components/AIInsightWrapper";

export default function DashboardPage() {   
    // page.tsx — Server Component
const profilePromise = fetchUserProfile();
const metricsPromise = fetchMetrics();



return (
  <>
    <Suspense fallback={<div className="p-4 bg-gray-100 rounded-md animate-pulse">Loading profile...</div>}>
      <ProfileSection profilePromise={profilePromise} />
    </Suspense>
    <Suspense fallback={<div className="p-4 bg-gray-100 rounded-md animate-pulse">Loading metrics...</div>}>
      <MetricsSection metricsPromise={metricsPromise} />
    </Suspense>
    <Suspense fallback={<div className="p-4 bg-gray-100 rounded-md animate-pulse">Loading AI insight...</div>}>
      <AIInsightWrapper />
    </Suspense>
  </>
);}