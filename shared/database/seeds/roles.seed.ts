import { type PrismaClient } from '@prisma/client';

export async function seedRoles(db: PrismaClient) {
  console.log('  └─ Seeding Roles...');
  
  const roles = [
    { name: 'SUPERADMIN', description: 'Full system access' },
    { name: 'USER', description: 'Standard user access' }
  ];

for (const role of roles) {
  const createdRole = await db.role.upsert({
    where: { name: role.name },
    update: {},
    create: role,
  });

  // If it's SUPERADMIN, give it ALL permissions on a 'System' resource
  if (createdRole.name === 'SUPERADMIN') {
    await db.rolePermission.upsert({
      where: { roleId_resource: { roleId: createdRole.id, resource: 'System' } },
      update: {},
      create: {
        roleId: createdRole.id,
        resource: 'System',
        canCreate: 'ALL',
        canRead: 'ALL',
        canUpdate: 'ALL',
        canDelete: 'ALL',
      },
    });
  }
}
}
