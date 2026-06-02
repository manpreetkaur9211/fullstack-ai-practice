import { AIInsight, Metric, User } from "@/lib/types";

export async function fetchMetrics(): Promise<Metric[]> {
  await new Promise(r => setTimeout(r, 1000));
  return [
    { id: "1", type: "heart_rate", value: 72, recordedAt: new Date() },
    { id: "2", type: "steps",      value: 8400, recordedAt: new Date() },
  ];
}
export const fetchUserProfile = async () => {
  await new Promise(r => setTimeout(r, 1000));
  return {
    name: "John Doe",
    age: 30,
    email: "john.doe@example.com"
  };
};  

export const fetchTodaysMetrics = async () : Promise<Metric[]> => { 
  await new Promise(r => setTimeout(r, 1000));
  return [
    { id: "1", type: "heart_rate", value: 72, recordedAt: new Date() }, 
    { id: "2", type: "steps",      value: 8400, recordedAt: new Date() },
    { id: "3", type: "calories",   value: 2200, recordedAt: new Date() }, 
  ];
};

export const fetchAIInsight = async () : Promise<AIInsight> => {
  await new Promise(r => setTimeout(r, 2000));
  const random= Math.random();
  if(random < 0.2) {
    throw new Error("Failed to fetch AI insight"); // Simulate a failure with a 20% chance
  }
  return {
    id: "1",
    title: "Your Daily Health Summary",
    content: "You're doing great! Keep up the good work.",
    attempt: random
  };
};
export async function getUser(id: string) : Promise<User> {
  await new Promise(r => setTimeout(r, 500));
  return { id, name: "Jane Doe", email: "jane@example.com", bio: "TypeScript fan" };
}

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL ?? "http://localhost:3000";

// 1. No cache — always fresh
export const getLiveMetrics = async () => {
  const liveData = await fetch(`${BASE_URL}/api/live-metrics`, { cache: "no-store" });
  return liveData.json();
};

// 2. Cache for 60s (ISR-style)
export const getDailySummary = async () => {
  const recentData = await fetch(`${BASE_URL}/api/daily-summary`, { next: { revalidate: 60 } });
  return recentData.json();
};

// 3. Cache until explicitly revalidated
export const getUserProfile = async () => {
  const profileData = await fetch(`${BASE_URL}/api/user-profile`, { next: { tags: ["user-profile"] } });
  return profileData.json();
};
