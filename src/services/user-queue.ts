const userQueues = new Map<string, Promise<void>>();

export function enqueueForUser<T>(
  userId: string,
  task: () => Promise<T>
): Promise<T> {
  const previous = userQueues.get(userId) ?? Promise.resolve();

  const current = previous.catch(() => {}).then(task);

  const queued = current.then(
    () => {},
    () => {}
  );

  userQueues.set(userId, queued);

  // Remove a entrada do Map quando a fila esvazia, mas só se ainda
  // apontar para esta Promise — evita apagar uma fila substituída por
  // uma mensagem nova que chegou em paralelo.
  current.finally(() => {
    if (userQueues.get(userId) === queued) {
      userQueues.delete(userId);
    }
  });

  return current;
}
