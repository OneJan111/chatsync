export const createIntervalQueue = (intervalMs: number) => {
  let tail: Promise<void> = Promise.resolve();
  let lastStartedAt = 0;

  return <T>(task: () => Promise<T>): Promise<T> => {
    const result = tail.then(async () => {
      const waitMs = Math.max(0, intervalMs - (Date.now() - lastStartedAt));
      if (waitMs > 0) {
        await new Promise((resolve) => setTimeout(resolve, waitMs));
      }
      lastStartedAt = Date.now();
      return task();
    });
    tail = result.then(() => undefined, () => undefined);
    return result;
  };
};
