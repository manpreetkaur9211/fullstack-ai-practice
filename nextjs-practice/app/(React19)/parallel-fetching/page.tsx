//Build a UserHealthDashboard that fetches 3 data sources in PARALLEL:
//   - User profile
//   - Today's metrics
//   - AI-generated insight (slow — 2 seconds)

// Requirements:
//   - All 3 fetches start simultaneously (no waterfall)
//   - Profile and metrics show as soon as they load
//   - Insight has its own Suspense boundary with a skeleton loader
//   - If insight fetch fails, show "Unable to generate insight" (not a crash)
//   - Add a "Refresh Insight" button that refetches only the AI insight
//
// Compare the Network tab: with parallel fetching, total time = slowest fetch.
// Without parallel fetching, total time = sum of all fetches.
// Document the timing difference in a comment.

import { fetchUserProfile, fetchTodaysMetrics } from "@/lib/data";
import { Suspense } from "react";
import { UserProfile } from "./components/UserProfile";
import { TodaysMetrics } from "./components/TodaysMetrics";
import { AIInsightWrapper } from "./components/AIInsightWrapper";

export default async function UserHealthDashboard() {
    // Start all fetches in parallel
    const [userProfile, todaysMetrics] = await Promise.all([fetchUserProfile(), fetchTodaysMetrics()]);
   

    return (
        <div className="max-w-4xl mx-auto p-6 bg-white dark:bg-gray-900 rounded-lg shadow-lg">
            <h1 className="text-3xl font-bold text-gray-800 dark:text-white mb-6">User Health Dashboard</h1>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                <Suspense fallback={<div className="p-4 bg-gray-100 rounded-md animate-pulse">Loading profile...</div>}>
                    <UserProfile {...userProfile} />
                </Suspense>
                <Suspense fallback={<div className="p-4 bg-gray-100 rounded-md animate-pulse">Loading metrics...</div>}>
                    <TodaysMetrics metrics={todaysMetrics} />
                </Suspense> 
            </div>
            <AIInsightWrapper />
            {/* 
                Timing difference:
                With parallel fetching, total time = slowest fetch.
                Without parallel fetching, total time = sum of all fetches.
            */}
        </div>
    );
}

