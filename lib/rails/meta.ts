// lib/rails/meta.ts
import { IRail } from './types';

export class MetaRail implements IRail {
  private baseUrl = 'https://graph.facebook.com/v18.0';

  async publish(content: string, mediaUrls: string[], accessToken: string, platformId: string): Promise<{ success: boolean; postId?: string; error?: string }> {
    try {
      // Pour Facebook/Instagram, platformId est l'ID de la page/compte
      const endpoint = `${this.baseUrl}/${platformId}/feed`;

      const body: any = { message: content };
      if (mediaUrls.length > 0) {
        // Pour simplifier, on suppose une seule image/vidéo
        // En réalité, il faudrait uploader les médias d'abord
        body.link = mediaUrls[0]; // Ou utiliser /photos pour upload
      }

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...body,
          access_token: accessToken,
        }),
      });

      const data = await response.json();

      if (response.ok && data.id) {
        return { success: true, postId: data.id };
      } else {
        return { success: false, error: data.error?.message || 'Unknown error' };
      }
    } catch (error) {
      console.error('MetaRail publish error:', error);
      return { success: false, error: 'Network or API error' };
    }
  }
}