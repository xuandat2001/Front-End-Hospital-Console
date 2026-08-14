const cache = new Map();

export async function appointmentQuery({ key, queryFn, staleTime = 30_000, force = false }) {
  const cacheKey = typeof key === "string" ? key : JSON.stringify(key);
  const current = cache.get(cacheKey);
  const now = Date.now();

  if (!force && current?.data !== undefined && now - current.updatedAt < staleTime) {
    return current.data;
  }
  if (current?.promise) return current.promise;

  const promise = Promise.resolve().then(queryFn).then((data) => {
    cache.set(cacheKey, { data, updatedAt: Date.now(), promise: null });
    return data;
  }).catch((error) => {
    if (current?.data !== undefined) cache.set(cacheKey, { ...current, promise: null });
    else cache.delete(cacheKey);
    throw error;
  });

  cache.set(cacheKey, { data: current?.data, updatedAt: current?.updatedAt || 0, promise });
  return promise;
}

export function invalidateAppointmentQueries(prefix) {
  const serializedPrefix = typeof prefix === "string" ? prefix : JSON.stringify(prefix).slice(0, -1);
  for (const key of cache.keys()) {
    if (key.startsWith(serializedPrefix)) cache.delete(key);
  }
}

export function setAppointmentQueryData(key, updater) {
  const cacheKey = typeof key === "string" ? key : JSON.stringify(key);
  const current = cache.get(cacheKey);
  if (current?.data === undefined) return false;
  cache.set(cacheKey, {
    ...current,
    data: updater(current.data),
    updatedAt: Date.now(),
    promise: null,
  });
  return true;
}

export function clearAppointmentQueryCache() {
  cache.clear();
}
