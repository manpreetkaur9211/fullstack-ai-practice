"use client";

import { useActionState } from "react";
import { logMetric } from "./actions";
// Requirements:
//   - Fields: userId, metricType (dropdown), value (number), notes
//   - Server Action that validates input and "saves" it (console.log is fine)
//   - While pending: disable the submit button, show "Saving..."
//   - On success: show a green success message with the saved metric details
//   - On error (e.g., value out of range): show a red error message
//   - Form should RESET after successful submission
export const LogMetricForm = () => {
    const [ state, logMetricAction,isPending] = useActionState(logMetric,{});
    const successKey = state.success ? JSON.stringify(state.success) : "no-success"; // This will force the form to reset when there's a new success result
    return (
        <div>
            <form key={successKey} action={logMetricAction}>
                <input type="text" name="userId" placeholder="User ID" required />
                <select name="type" required>
                    <option value="">Select metric type</option>
                    <option value="heart_rate">Heart Rate</option>
                    <option value="steps">Steps</option>
                    <option value="sleep">Sleep Hours</option>
                </select>
                <input type="number" name="value" placeholder="Value" required />
                    <textarea name="notes" placeholder="Notes (optional)" />

                <button type="submit" disabled={isPending}>
                    {isPending ? "Logging..." : "Log Metric"}
                </button>
            </form>
            {state.success && (
                <div style={{ color: "green" }}>
                    {`Successfully logged metric for user ${state.success.userId}: ${state.success.type} = ${state.success.value}. Notes: ${state.success.notes}`}
                </div>
            )}
            {state.error && (
                <div style={{ color: "red" }}>
                    Error: {state.error}
                </div>
            )}
        </div>
    );
}