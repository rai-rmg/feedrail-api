import { Client } from "@upstash/qstash";

// Récupération du token depuis les variables d'environnement
const token = process.env.QSTASH_TOKEN;

// Alerte en dev si la config est absente
if (!token) {
  console.warn("⚠️ ATTENTION : QSTASH_TOKEN est manquant dans le fichier .env. Les tâches d'arrière-plan ne fonctionneront pas.");
}

/**
 * Instance unique du client QStash.
 * On utilise un token "fallback" vide pour éviter de faire planter le build 
 * si la variable d'env n'est pas encore définie (ex: lors du déploiement initial).
 */
export const qstash = new Client({ 
  token: token || "missing_token_placeholder" 
});