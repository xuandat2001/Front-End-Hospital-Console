const widgetCache = new Map();

export function createInitialWidgetState(widgetMap) {
  return Object.fromEntries(
    Object.keys(widgetMap).map((key) => [
      key,
      { data: null, loading: true, error: "" },
    ]),
  );
}

export function markWidgetStateLoading(current) {
  return Object.fromEntries(
    Object.entries(current).map(([key, value]) => [
      key,
      { ...value, loading: true, error: "" },
    ]),
  );
}

export function getCachedEmergencyWidgets(cacheKey, ttlMs) {
  const cached = widgetCache.get(cacheKey);
  if (!cached || Date.now() - cached.cachedAt > ttlMs) return null;
  return cloneWidgetState(cached.widgets);
}

export function clearEmergencyWidgetCache() {
  widgetCache.clear();
}

export async function loadEmergencyWidgets({
  widgetMap,
  cacheKey,
  ttlMs,
  signal,
  bypassCache = false,
}) {
  if (!bypassCache) {
    const cached = getCachedEmergencyWidgets(cacheKey, ttlMs);
    if (cached) return cached;
  }

  const entries = Object.entries(widgetMap);
  const settled = await Promise.allSettled(
    entries.map(([, request]) => request({ signal })),
  );

  if (signal?.aborted) {
    throw new DOMException("Emergency widget load aborted.", "AbortError");
  }

  const widgets = Object.fromEntries(
    entries.map(([key], index) => {
      const result = settled[index];
      if (result.status === "fulfilled") {
        return [key, { data: result.value, loading: false, error: "" }];
      }
      return [
        key,
        {
          data: null,
          loading: false,
          error:
            result.reason?.message ||
            "Unable to load emergency widget data.",
        },
      ];
    }),
  );

  if (settled.every((result) => result.status === "fulfilled")) {
    widgetCache.set(cacheKey, {
      cachedAt: Date.now(),
      widgets: cloneWidgetState(widgets),
    });
  }

  return widgets;
}

function cloneWidgetState(widgets) {
  return Object.fromEntries(
    Object.entries(widgets).map(([key, value]) => [key, { ...value }]),
  );
}
