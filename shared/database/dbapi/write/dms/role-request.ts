// shared/database/dbapi/write/dms/role-request.ts
import { db } from '../../../index.ts';
import { logAudit } from '../audit/log.ts';
import { createNotificationsForAdmins } from '../notifications/notifications.ts';
import { NotFoundError, ConflictError, ValidationError } from '@core/errors';

function toSlug(name: string): string {
	return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

export async function createRoleRequest(
	userId: string,
	roleId: string,
	reason: string,
) {
	if (!reason?.trim()) throw new ValidationError('Reason is required.');

	const existing = await db.roleRequest.findFirst({
		where: { userId, status: 'PENDING' },
	});
	if (existing) throw new ConflictError('You already have a pending role request.');

	const created = await db.roleRequest.create({
		data: { userId, roleId, reason },
	});

	await createNotificationsForAdmins(
		'DM_REQUEST_PENDING',
		'New DM role request',
		'A player has submitted a request to become a DM.',
		'/role-requests',
	);

	return created;
}

/**
 * First-time DM approval: create a default world and assign the DM with canManage.
 * Re-approval when the profile already has WorldDM rows: skip world creation, notify admins.
 */
async function provisionDefaultWorldForNewDm(userId: string, actorId: string) {
	const profile = await db.dMProfile.findUnique({ where: { userId } });
	if (!profile) return;

	const priorCount = await db.worldDM.count({ where: { dmProfileId: profile.id } });
	const user = await db.user.findUnique({
		where: { id: userId },
		select: { name: true, email: true },
	});
	const label = user?.name?.trim() || user?.email || userId;

	if (priorCount > 0) {
		await createNotificationsForAdmins(
			'DM_REAPPROVED_WITH_WORLDS',
			'DM re-approved with existing worlds',
			`${label} was re-approved as DM and already has ${priorCount} world assignment(s). No default world was created.`,
			`/dms/${profile.id}`,
		);
		return;
	}

	const baseName = `${user?.name?.trim() || 'DM'}'s World`;
	let name = baseName;
	let world: { id: string } | null = null;

	for (let attempt = 0; attempt < 50; attempt++) {
		const slug = toSlug(name);
		const clash = await db.world.findUnique({ where: { slug }, select: { id: true } });
		if (!clash) {
			world = await db.$transaction(async (tx) => {
				const created = await tx.world.create({
					data: {
						name,
						slug,
						description: 'Default world created when the DM role was approved.',
					},
				});
				await tx.tavernChannel.create({
					data: { worldId: created.id, name: created.name },
				});
				await tx.worldDM.create({
					data: {
						worldId: created.id,
						dmProfileId: profile.id,
						canManage: true,
						assignedBy: actorId,
					},
				});
				await logAudit(tx, {
					actorId,
					action: 'CREATE',
					resourceKey: 'World',
					resourceId: created.id,
					after: created,
					metadata: { kind: 'default_world_on_dm_approval', userId },
				});
				return created;
			});
			break;
		}
		name = `${baseName} ${attempt + 2}`;
	}

	if (!world) {
		throw new ValidationError('Could not allocate a unique default world name.');
	}
}

export async function approveRoleRequest(id: string, reviewNote: string | undefined, actorId: string) {
	const request = await db.roleRequest.findUnique({ where: { id } });
	if (!request) throw new NotFoundError('RoleRequest', id);
	if (request.status !== 'PENDING') throw new ValidationError('Request is not pending.');

	const updated = await db.$transaction(async (tx) => {
		const row = await tx.roleRequest.update({
			where: { id },
			data: { status: 'APPROVED', reviewedBy: actorId, reviewNote: reviewNote ?? null },
		});

		const userRoles = await tx.userRole.findMany({ where: { userId: request.userId } });
		const hasRole = userRoles.some(ur => ur.roleId === request.roleId);
		if (!hasRole) {
			await tx.userRole.create({ data: { userId: request.userId, roleId: request.roleId } });
		}

		const role = await tx.role.findUnique({ where: { id: request.roleId } });
		if (role?.name === 'DM') {
			const existing = await tx.dMProfile.findUnique({ where: { userId: request.userId } });
			if (!existing) {
				await tx.dMProfile.create({ data: { userId: request.userId } });
			} else {
				await tx.dMProfile.update({ where: { userId: request.userId }, data: { isActive: true } });
			}
		}

		await logAudit(tx, {
			actorId,
			action: 'UPDATE',
			resourceKey: 'RoleRequest',
			resourceId: id,
			before: { status: 'PENDING' },
			after: { status: 'APPROVED' },
		});

		return { row, roleName: role?.name ?? null };
	});

	if (updated.roleName === 'DM') {
		await provisionDefaultWorldForNewDm(request.userId, actorId);
	}

	return updated.row;
}

export async function rejectRoleRequest(id: string, reviewNote: string, actorId: string) {
	const request = await db.roleRequest.findUnique({ where: { id } });
	if (!request) throw new NotFoundError('RoleRequest', id);
	if (request.status !== 'PENDING') throw new ValidationError('Request is not pending.');
	if (!reviewNote?.trim()) throw new ValidationError('Review note is required when rejecting.');

	return db.$transaction(async (tx) => {
		const updated = await tx.roleRequest.update({
			where: { id },
			data: { status: 'REJECTED', reviewedBy: actorId, reviewNote },
		});

		await logAudit(tx, {
			actorId,
			action: 'UPDATE',
			resourceKey: 'RoleRequest',
			resourceId: id,
			before: { status: 'PENDING' },
			after: { status: 'REJECTED', reviewNote },
		});

		return updated;
	});
}

export async function deleteRoleRequest(id: string, actorId: string) {
	const request = await db.roleRequest.findUnique({ where: { id } });
	if (!request) throw new NotFoundError('RoleRequest', id);

	return db.$transaction(async (tx) => {
		await logAudit(tx, {
			actorId,
			action: 'DELETE',
			resourceKey: 'RoleRequest',
			resourceId: id,
			before: request,
		});
		await tx.roleRequest.delete({ where: { id } });
	});
}
