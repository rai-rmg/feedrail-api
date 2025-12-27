import 'dotenv/config';
import { prisma } from '../lib/prisma';

async function seed() {
  try {
    console.log('🌱 Initialisation des données de test...');

    // Créer un User de test
    const user = await prisma.user.upsert({
      where: { email: 'test@example.com' },
      update: {},
      create: {
        email: 'test@example.com',
        apiKey: 'test-api-key-12345', // Clé API pour les tests
      },
    });
    console.log('✅ User créé :', user.id);

    // Créer une Brand liée au User
    const brand = await prisma.brand.upsert({
      where: { userId_name: { userId: user.id, name: 'Test Brand' } },
      update: {},
      create: {
        name: 'Test Brand',
        clientRefId: 'client-001',
        userId: user.id,
      },
    });
    console.log('✅ Brand créée :', brand.id);

    // Créer des SocialAccounts fictifs (tokens chiffrés pour simulation)
    // Note : En prod, chiffrer les vrais tokens via crypto.encrypt()
    const fakeEncryptedToken = 'fake-encrypted-token'; // Remplacer par crypto.encrypt('real-token')
    
    // Facebook
    await prisma.socialAccount.upsert({
      where: { brandId_provider: { brandId: brand.id, provider: 'facebook' } },
      update: {},
      create: {
        provider: 'facebook',
        platformId: '1234567890123456', // ID de page Facebook fictif
        accessToken: fakeEncryptedToken,
        brandId: brand.id,
      },
    });

    // Instagram
    await prisma.socialAccount.upsert({
      where: { brandId_provider: { brandId: brand.id, provider: 'instagram' } },
      update: {},
      create: {
        provider: 'instagram',
        platformId: '1234567890123456', // ID de compte Instagram fictif
        accessToken: fakeEncryptedToken,
        brandId: brand.id,
      },
    });

    console.log('🎉 Données initialisées avec succès !');
    console.log('📋 Utilisez cette API Key pour tester : test-api-key-12345');
    console.log('📋 Brand ID :', brand.id);
  } catch (error) {
    console.error('❌ Erreur lors du seed :', error);
  } finally {
    await prisma.$disconnect();
  }
}

seed();