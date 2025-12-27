import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

interface AuthenticatedRequest extends NextRequest {
  user?: { id: string; email: string };
}

export async function authMiddleware(req: AuthenticatedRequest) {
  const apiKey = req.headers.get('x-api-key');

  if (!apiKey) {
    return NextResponse.json({ error: 'Missing x-api-key header' }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { apiKey },
    select: { id: true, email: true }
  });

  if (!user) {
    return NextResponse.json({ error: 'Invalid API Key' }, { status: 401 });
  }

  // Ajouter l'user à la request pour les routes
  req.user = user;

  return null; // Pas d'erreur, continuer
}