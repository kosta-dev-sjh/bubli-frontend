import type { ActivityLogResponse } from "@/types/api/activity";

function parseTimestamp(value?: string | null) {
  if (!value) return null;
  const timestamp = new Date(value).getTime();
  return Number.isFinite(timestamp) ? timestamp : null;
}

function activityInterval(log: ActivityLogResponse) {
  const startedAt = parseTimestamp(log.startedAt);
  const endedAt = parseTimestamp(log.endedAt);

  if (startedAt === null || endedAt === null || endedAt <= startedAt) {
    return null;
  }

  return { endedAt, startedAt };
}

export function getActivityLogDurationSeconds(log: ActivityLogResponse) {
  if (typeof log.durationSeconds === "number" && log.durationSeconds >= 0) {
    return log.durationSeconds;
  }

  const interval = activityInterval(log);
  if (!interval) return 0;

  return Math.floor((interval.endedAt - interval.startedAt) / 1000);
}

export function getDeoverlappedActivityDurationSeconds(logs: ActivityLogResponse[]) {
  const intervals: Array<{ endedAt: number; startedAt: number }> = [];
  let fallbackSeconds = 0;

  for (const log of logs) {
    const interval = activityInterval(log);
    if (interval) {
      intervals.push(interval);
      continue;
    }

    fallbackSeconds += getActivityLogDurationSeconds(log);
  }

  intervals.sort((left, right) => left.startedAt - right.startedAt || left.endedAt - right.endedAt);

  let mergedSeconds = 0;
  let currentStart: number | null = null;
  let currentEnd: number | null = null;

  for (const interval of intervals) {
    if (currentStart === null || currentEnd === null) {
      currentStart = interval.startedAt;
      currentEnd = interval.endedAt;
      continue;
    }

    if (interval.startedAt <= currentEnd) {
      currentEnd = Math.max(currentEnd, interval.endedAt);
      continue;
    }

    mergedSeconds += Math.floor((currentEnd - currentStart) / 1000);
    currentStart = interval.startedAt;
    currentEnd = interval.endedAt;
  }

  if (currentStart !== null && currentEnd !== null) {
    mergedSeconds += Math.floor((currentEnd - currentStart) / 1000);
  }

  return Math.max(0, mergedSeconds + fallbackSeconds);
}
