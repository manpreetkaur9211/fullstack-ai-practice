export interface Metric{
  id: string;
  type: string;
  value: number;
  recordedAt: Date;
}
export interface LogMetric {
  userId: string;
  type: string;
  value: number;
  notes: string;
}
export interface AIInsight {
  id: string;
  title: string;
  content: string;
  attempt: number; // This field is just to demonstrate that the insight can change on each fetch
}