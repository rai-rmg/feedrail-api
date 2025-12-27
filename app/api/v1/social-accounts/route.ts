import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { encrypt } from "@/lib/crypto";

interface AuthenticatedRequest extends NextRequest {
  user?: { id: string; email: string };
}

export async function POST(req: AuthenticatedRequest) {
  try {
    const user = req.user!;
    const body = await req.json();
    const { provider, code, brandId } = body;

    if (!provider || !code || !brandId) {
      return NextResponse.json({ error: "Missing required fields: provider, code, brandId" }, { status: 400 });
    }

    if (!['facebook', 'instagram'].includes(provider)) {
      return NextResponse.json({ error: "Invalid provider" }, { status: 400 });
    }

    // Vérifier la propriété de la Brand
    const brand = await prisma.brand.findFirst({
      where: { id: brandId, userId: user.id }
    });

    if (!brand) {
      return NextResponse.json({ error: "Brand not found or access denied" }, { status: 403 });
    }

    // Échanger le code contre un access token
    const appId = process.env.META_APP_ID;
    const appSecret = process.env.META_APP_SECRET;
    const redirectUri = process.env.META_REDIRECT_URI;

    if (!appId || !appSecret || !redirectUri) {
      return NextResponse.json({ error: "Meta API not configured" }, { status: 500 });
    }

    const tokenUrl = `https://graph.facebook.com/v18.0/oauth/access_token?client_id=${appId}&redirect_uri=${encodeURIComponent(redirectUri)}&client_secret=${appSecret}&code=${code}`;

    const tokenResponse = await fetch(tokenUrl);
    const tokenData = await tokenResponse.json();

    if (!tokenResponse.ok || !tokenData.access_token) {
      return NextResponse.json({ error: "Failed to exchange code for token", details: tokenData }, { status: 400 });
    }

    // Pour Facebook, obtenir l'ID de la page si nécessaire
    let platformId = '';
    if (provider === 'facebook') {
      const pagesResponse = await fetch(`https://graph.facebook.com/v18.0/me/accounts?access_token=${tokenData.access_token}`);
      const pagesData = await pagesResponse.json();
      if (pagesData.data && pagesData.data.length > 0) {
        platformId = pagesData.data[0].id; // Prendre la première page
      } else {
        return NextResponse.json({ error: "No Facebook pages found" }, { status: 400 });
      }
    } else if (provider === 'instagram') {
      // Pour Instagram, utiliser l'ID du compte
      const igResponse = await fetch(`https://graph.facebook.com/v18.0/me?fields=id&access_token=${tokenData.access_token}`);
      const igData = await igResponse.json();
      platformId = igData.id;
    }

    // Chiffrer le token
    const encryptedToken = encrypt(tokenData.access_token);

    // Créer le SocialAccount
    const socialAccount = await prisma.socialAccount.upsert({
      where: { brandId_provider: { brandId, provider } },
      update: { accessToken: encryptedToken, platformId },
      create: {
        provider,
        platformId,
        accessToken: encryptedToken,
        brandId
      }
    });

    return NextResponse.json({
      success: true,
      data: {
        id: socialAccount.id,
        provider: socialAccount.provider,
        platformId: socialAccount.platformId
      }
    });

  } catch (error: unknown) {
    console.error("Create social account error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}