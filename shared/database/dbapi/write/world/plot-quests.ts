// shared/database/dbapi/write/world/plot-quests.ts
import { db } from '../../../index.ts';
import { logAudit } from '../audit/log.ts';
import { NotFoundError, ValidationError } from '@core/errors';
import type { PlotQuestStatus } from '@prisma/client';

const STATUSES: PlotQuestStatus[] = ['DRAFT', 'ACTIVE', 'COMPLETED', 'FAILED', 'ABANDONED'];

function parseStatus(raw: string | undefined | null): PlotQuestStatus | undefined {
	if (raw == null || raw === '') return undefined;
	const s = raw.toUpperCase() as PlotQuestStatus;
	if (!STATUSES.includes(s)) throw new ValidationError(`Invalid plot quest status: ${raw}`);
	return s;
}

function parseDeadlineDay(raw: number | string | null | undefined): number | null {
	if (raw == null || raw === '') return null;
	const n = typeof raw === 'number' ? raw : Number(raw);
	if (!Number.isFinite(n) || !Number.isInteger(n)) {
		throw new ValidationError('deadlineDay must be an integer absolute day.');
	}
	return n;
}

async function assertWorld(worldId: string) {
	const world = await db.world.findUnique({ where: { id: worldId }, select: { id: true } });
	if (!world) throw new NotFoundError('World', worldId);
}

async function assertQuestInWorld(worldId: string, questId: string) {
	const regionIds = (await db.region.findMany({
		where: { worldId },
		select: { id: true },
	})).map(r => r.id);
	if (!regionIds.length) throw new ValidationError('Quest not found in this world.');
	const q = await db.quest.findFirst({
		where: { id: questId, regionId: { in: regionIds } },
		select: { id: true },
	});
	if (!q) throw new ValidationError('Quest not found in this world.');
}

export async function createPlotQuest(
	worldId: string,
	input: {
		title: string;
		summary?: string | null;
		description?: string | null;
		status?: string;
		deadlineDay?: number | null;
		sortOrder?: number;
	},
	actorId: string,
) {
	await assertWorld(worldId);
	const title = input.title?.trim();
	if (!title) throw new ValidationError('Title is required.');

	const deadlineDay = parseDeadlineDay(input.deadlineDay);

	const plot = await db.plotQuest.create({
		data: {
			worldId,
			title,
			summary: input.summary?.trim() || null,
			description: input.description?.trim() || null,
			status: parseStatus(input.status) ?? 'DRAFT',
			deadlineDay,
			sortOrder: Number.isFinite(input.sortOrder) ? Number(input.sortOrder) : 0,
			createdBy: actorId,
		},
	});
	await logAudit(db, {
		actorId,
		action: 'CREATE',
		resourceKey: 'PlotQuest',
		resourceId: plot.id,
		after: plot,
	});
	return plot;
}

export async function updatePlotQuest(
	id: string,
	input: {
		title?: string;
		summary?: string | null;
		description?: string | null;
		status?: string;
		deadlineDay?: number | null;
		failureTimeoutDay?: number | null;
		sortOrder?: number;
	},
	actorId: string,
) {
	const existing = await db.plotQuest.findUnique({ where: { id } });
	if (!existing) throw new NotFoundError('PlotQuest', id);

	const data: Record<string, unknown> = {};
	if (input.title !== undefined) {
		const title = input.title.trim();
		if (!title) throw new ValidationError('Title is required.');
		data.title = title;
	}
	if (input.summary !== undefined) data.summary = input.summary?.trim() || null;
	if (input.description !== undefined) data.description = input.description?.trim() || null;
	if (input.status !== undefined) data.status = parseStatus(input.status);
	if (input.deadlineDay !== undefined) {
		data.deadlineDay = parseDeadlineDay(input.deadlineDay);
	}
	if (input.failureTimeoutDay !== undefined) {
		data.failureTimeoutDay = parseDeadlineDay(input.failureTimeoutDay);
	}
	if (input.sortOrder !== undefined) data.sortOrder = Number(input.sortOrder) || 0;

	const plot = await db.plotQuest.update({ where: { id }, data });
	await logAudit(db, {
		actorId,
		action: 'UPDATE',
		resourceKey: 'PlotQuest',
		resourceId: id,
		before: existing,
		after: plot,
	});
	return plot;
}

export async function deletePlotQuest(id: string, actorId: string) {
	const existing = await db.plotQuest.findUnique({ where: { id } });
	if (!existing) throw new NotFoundError('PlotQuest', id);

	await db.$transaction(async (tx) => {
		await tx.factionQuest.deleteMany({ where: { plotQuestId: id } });
		await tx.npcQuest.deleteMany({ where: { plotQuestId: id } });
		await tx.plotQuest.delete({ where: { id } });
		await logAudit(tx, {
			actorId,
			action: 'DELETE',
			resourceKey: 'PlotQuest',
			resourceId: id,
			before: existing,
		});
	});
	return { ok: true };
}

export async function linkSystemQuestToPlot(
	plotQuestId: string,
	questId: string,
	actorId: string,
) {
	const plot = await db.plotQuest.findUnique({ where: { id: plotQuestId } });
	if (!plot) throw new NotFoundError('PlotQuest', plotQuestId);
	await assertQuestInWorld(plot.worldId, questId);

	try {
		const link = await db.plotQuestQuest.create({
			data: { plotQuestId, questId },
		});
		await logAudit(db, {
			actorId,
			action: 'CREATE',
			resourceKey: 'PlotQuest',
			resourceId: plotQuestId,
			after: link,
			metadata: { kind: 'plot_quest_quest' },
		});
		return link;
	} catch (e: any) {
		if (e?.code === 'P2002') throw new ValidationError('This quest is already linked to the plot quest.');
		throw e;
	}
}

export async function unlinkSystemQuestFromPlot(linkId: string, actorId: string) {
	const link = await db.plotQuestQuest.findUnique({ where: { id: linkId } });
	if (!link) throw new NotFoundError('PlotQuestQuest', linkId);

	await db.plotQuestQuest.delete({ where: { id: linkId } });
	await logAudit(db, {
		actorId,
		action: 'DELETE',
		resourceKey: 'PlotQuest',
		resourceId: link.plotQuestId,
		before: link,
		metadata: { kind: 'plot_quest_quest' },
	});
	return link;
}
