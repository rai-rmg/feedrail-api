// lib/constants.ts
export const POST_STATUSES = {
  QUEUED: "QUEUED",
  PROCESSING: "PROCESSING",
  COMPLETED: "COMPLETED",
  FAILED: "FAILED",
} as const;

export type PostStatus = typeof POST_STATUSES[keyof typeof POST_STATUSES];