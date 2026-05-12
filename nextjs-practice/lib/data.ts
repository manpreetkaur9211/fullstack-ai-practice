import { AIInsight, Metric } from "@/lib/types";

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