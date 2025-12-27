import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma"; // Notre singleton
import { qstash } from "@/lib/queue"; // Notre client QStash configuré
import { POST_STATUSES } from "@/lib/constants";

interface AuthenticatedRequest extends NextRequest {
  user?: { id: string; email: string };
}

export async function POST(req: AuthenticatedRequest) {
  try {
    // Authentification gérée par middleware
    const user = req.user!;

    // ---------------------------------------------------------
    // 2. VALIDATION DE LA REQUÊTE
    // ---------------------------------------------------------
    const body = await req.json();
    const { content, mediaUrls, platforms, brandId } = body;

    // Validation basique des champs requis
    if (!content || !brandId || !platforms || !Array.isArray(platforms)) {
      return NextResponse.json({ 
        error: "Missing required fields: content, brandId, platforms (array)" 
      }, { status: 400 });
    }

    if (platforms.length === 0) {
      return NextResponse.json({ error: "At least one platform is required" }, { status: 400 });
    }

    // ---------------------------------------------------------
    // 3. VÉRIFICATION DE LA PROPRIÉTÉ (MULTI-TENANT)
    // ---------------------------------------------------------
    // Crucial : On vérifie que la marque demandée appartient bien à l'utilisateur
    // Cela empêche un client A de poster sur les comptes d'un client B
    const brand = await prisma.brand.findFirst({
      where: { 
        id: brandId,
        userId: user.id 
      }
    });

    if (!brand) {
      return NextResponse.json({ 
        error: "Brand not found or you do not have permission to access it" 
      }, { status: 403 });
    }

    // ---------------------------------------------------------
    // 4. PERSISTANCE (BASE DE DONNÉES)
    // ---------------------------------------------------------
    // On crée le post avec le statut "QUEUED"
    const post = await prisma.post.create({
      data: {
        content,
        // Prisma gère le JSON, on s'assure que c'est propre
        targets: platforms, 
        mediaUrls: mediaUrls || [],
        brandId: brand.id,
        status: POST_STATUSES.QUEUED,
        results: {} // Vide pour l'instant
      }
    });

    // ---------------------------------------------------------
    // 5. DÉLÉGATION (QSTASH)
    // ---------------------------------------------------------
    // C'est ici que la magie opère. On envoie l'ID du post à notre worker.
    // QStash va appeler notre API worker de manière asynchrone.
    
    const workerUrl = `${req.nextUrl.origin}/api/workers/publish`;

    // En développement, QStash ne permet pas les URLs localhost. On simule la queue.
    const isLocalhost = workerUrl.includes('localhost') || workerUrl.includes('127.0.0.1') || workerUrl.includes('::1');
    if (process.env.NODE_ENV !== 'production' && isLocalhost) {
      console.log(`🚀 Simulating queue for post ${post.id} (localhost detected)`);
      // En dev, on marque directement comme COMPLETED pour les tests
      await prisma.post.update({
        where: { id: post.id },
        data: { status: POST_STATUSES.COMPLETED, results: { simulated: true, message: "Simulated in dev mode" } }
      });
    } else {
      console.log(`🚀 Queueing post ${post.id} for processing at ${workerUrl}`);

      try {
        await qstash.publishJSON({
          url: workerUrl,
          body: { postId: post.id },
          // Options avancées possibles :
          // delay: 3600, // Pour programmer dans le futur (1h)
          retries: 3,    // Réessayer 3 fois si le worker plante
        });
      } catch (queueError) {
        console.error("⚠️ Failed to queue job in QStash:", queueError);
        // En cas d'erreur critique de l'infra (QStash down), on met à jour la DB
        await prisma.post.update({
          where: { id: post.id },
          data: { status: POST_STATUSES.FAILED, results: { error: "Queueing failed" } }
        });
        return NextResponse.json({ error: "Failed to queue post" }, { status: 500 });
      }
    }

    // ---------------------------------------------------------
    // 6. RÉPONSE IMMÉDIATE
    // ---------------------------------------------------------
    // On ne fait pas attendre l'utilisateur pendant l'upload vers Twitter
    return NextResponse.json({
      success: true,
      data: {
        id: post.id,
        status: "queued",
        message: "Post has been scheduled for processing."
      }
    }, { status: 202 }); // 202 Accepted

  } catch (error: unknown) {
    console.error("API Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}