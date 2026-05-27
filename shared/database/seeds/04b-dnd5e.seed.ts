// shared/database/seeds/04b-dnd5e.seed.ts
// D&D 5e data is imported via Admin → Game Systems → Import
// No data seeded here — schema only.
 
import type { PrismaClient } from '@prisma/client';
 
export async function seedDnd5e(db: PrismaClient) {
    console.log('  └─ D&D 5e: no seed data — use Admin Import.');
}
 