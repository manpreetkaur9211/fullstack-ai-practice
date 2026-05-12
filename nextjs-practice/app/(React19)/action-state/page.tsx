
import { LogMetric } from "@/lib/types";
import { LogMetricForm } from "./LogMetricForm";
export  type FormState = {
    success?: LogMetric;
    error?: string;
 };
  // show green box on state.success, red box on state.error
export default function LogMetricPage() {
    return (
        <div>   
            <h1>Log a Metric</h1>
            <p>This page will have a form to log a new health metric using an action function.</p>
            <LogMetricForm />
        </div>
    );
  }