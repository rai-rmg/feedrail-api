// lib/rails/types.ts
export interface IRail {
  publish(content: string, mediaUrls: string[], accessToken: string, platformId: string): Promise<{ success: boolean; postId?: string; error?: string }>;
}

export interface RailResult {
  success: boolean;
  postId?: string;
  error?: string;
}