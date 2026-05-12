"use server";

export const deleteMetric = async (id: string): Promise<void> => {
  // Simulate server processing and deletion
  await new Promise((r) => setTimeout(r, 2000)); // Simulate network delay
  console.log(`Deleted metric with id: ${id}`);
  if (Math.random() < 0.2) {
    throw new Error("Failed to delete metric"); // Simulate a failure with a 20% chance
  }
}
