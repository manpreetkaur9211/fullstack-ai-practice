import { getDailySummary, getLiveMetrics, getUserProfile } from "@/lib/data";
import { revalidateProfile } from "./actions";
import { RevalidateButton } from "./components/RevalidateButton";
export default async function CacheDemoPage() {
  const liveData = await getLiveMetrics();
  const recentData = await getDailySummary();
  const profileData = await getUserProfile();
    
    return (    
        <div>

            <h1>Cache Demo</h1>
            <h2>Live Metrics (no cache)</h2>
            <pre>{JSON.stringify(liveData, null, 2)}</pre>

            <h2>Daily Summary (cache for 60s)</h2>
            <pre>{JSON.stringify(recentData, null, 2)}</pre>

            <h2>User Profile (cache until revalidated)</h2>
            <pre>{JSON.stringify(profileData, null, 2)}</pre>
           < RevalidateButton />
        </div>
    );
}