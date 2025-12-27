// lib/rails/index.ts
import { MetaRail } from './meta';
import { IRail } from './types';

// Factory pour créer le bon Rail selon la plateforme
export function createRail(provider: string): IRail | null {
  switch (provider.toLowerCase()) {
    case 'facebook':
    case 'instagram':
      return new MetaRail();
    default:
      return null; // Pas encore implémenté
  }
}