import { RawMetricEvent } from "../types/raw-event";

export const groupEventsByUser = (events: RawMetricEvent[]): Record<string, RawMetricEvent[]> => {// Group events by user_id
  const eventsByUser: Record<string, RawMetricEvent[]> = {};
  for (const event of events) {
    if (!eventsByUser[event.user_id]) {
      eventsByUser[event.user_id] = [];
    }
    eventsByUser[event.user_id].push(event);
  }

  return eventsByUser;
}