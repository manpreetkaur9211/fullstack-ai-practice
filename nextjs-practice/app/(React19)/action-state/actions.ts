"use server";
import { FormState } from "./page";
//Server Action that validates input and "saves" it (console.log is fine)
export const logMetric = async (
  prevState: FormState,
  formData: FormData,
): Promise<FormState> => {
  const userId = formData.get("userId") as string;
  const type = formData.get("type") as string;
  const value = formData.get("value") as string;
  const notes = formData.get("notes") as string;

  // Simulate server processing and validation
  // In a real app, you'd save to a database here and handle errors properly
  //
  await new Promise((r) => setTimeout(r, 1000)); // Simulate network delay
  if (!userId || !type || !value || isNaN(Number(value))) {
    return { error: "Invalid input- userId, type, and a numeric value are required." };
  }
  console.log("Logged metric:", { userId, type, value: Number(value), notes });
  return { success:  { userId, type, value: Number(value), notes } };
};
