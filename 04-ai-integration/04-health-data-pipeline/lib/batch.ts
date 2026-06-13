export const processBatch = async <T, U>(
  items: T[],
  processor: (item: T) => Promise<U>,
  options: { concurrency: number; delayMs: number },
): Promise<{ item: T; result: U | Error }[]> => {
  const results: { item: T; result: U | Error }[] = [];
  for (let i = 0; i < items.length; i += options.concurrency) {
    const batch = items.slice(i, i + options.concurrency);
    console.log(
      `Processing batch ${Math.floor(i / options.concurrency) + 1}/${Math.ceil(items.length / options.concurrency)} (${batch.length} items)...`,
    );

    const batchResults = await Promise.all(
      batch.map(async (item) => {
        try {
          const result = await processor(item);
          return { item, result }; 
          }
           catch (error) {
          return {
            item,
            result: error instanceof Error ? error : new Error(String(error)),
          };
        }
      }),
    );

    results.push(...batchResults);
    if (i + options.concurrency < items.length) {
      await new Promise((resolve) => setTimeout(resolve, options.delayMs));
    }
  }
  return results;
};