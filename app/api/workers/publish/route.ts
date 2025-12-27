import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { decrypt } from "@/lib/crypto";
import { createRail } from "@/lib/rails";
import { RailResult } from "@/lib/rails/types";
import { Prisma } from "@prisma/client";
import { POST_STATUSES } from "@/lib/constants";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { postId } = body;

    if (!postId) {
      return NextResponse.json({ error: "Missing postId" }, { status: 400 });
    }

    // Récupérer le post avec les détails
    const post = await prisma.post.findUnique({
      where: { id: postId },
      include: { brand: { include: { socialAccounts: true } } }
    });

    if (!post) {
      return NextResponse.json({ error: "Post not found" }, { status: 404 });
    }

    if (post.status !== POST_STATUSES.QUEUED) {
      return NextResponse.json({ error: "Post not in QUEUED status" }, { status: 400 });
    }

    // Mettre à jour le statut en PROCESSING
    await prisma.post.update({
      where: { id: postId },
      data: { status: "PROCESSING" }
    });

    const results: Record<string, RailResult> = {};

    // Pour chaque plateforme ciblée
    for (const platform of post.targets as string[]) {
      const socialAccount = post.brand.socialAccounts.find(acc => acc.provider === platform);

      if (!socialAccount) {
        results[platform] = { success: false, error: "No social account configured" };
        continue;
      }

      // Décrypter le token
      const accessToken = decrypt(socialAccount.accessToken);

      // Créer le Rail
      const rail = createRail(platform);
      if (!rail) {
        results[platform] = { success: false, error: "Platform not supported" };
        continue;
      }

      // Publier
      const publishResult = await rail.publish(
        post.content,
        post.mediaUrls,
        accessToken,
        socialAccount.platformId
      );

      results[platform] = publishResult;
    }

    // Mettre à jour le post avec les résultats
    const allSuccess = Object.values(results).every((r) => r.success);
    await prisma.post.update({
      where: { id: postId },
      data: {
        status: allSuccess ? POST_STATUSES.COMPLETED : POST_STATUSES.FAILED,
        results: results as unknown as Prisma.InputJsonValue
      }
    });

    return NextResponse.json({ success: true, results });

  } catch (error: unknown) {
    console.error("Worker error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}