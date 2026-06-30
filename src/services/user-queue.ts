const userQueues = new Map<string, Promise<void>>();

export function enqueueForUser<T>(
  userId: string,
  task: () => Promise<T>
): Promise<T> {
  const previous = userQueues.get(userId) ?? Promise.resolve();

  const current = previous
    .catch(() => {})
    .then(task);

  userQueues.set(
    userId,
    current.then(
      () => {},
      () => {}
    )
  );

  return current;
}
