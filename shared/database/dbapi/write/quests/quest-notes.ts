// shared/database/dbapi/write/quests/quest-notes.ts
// One WorldJournal per quest; DM notes = DM_ONLY section, player notes = WORLD section.
import { db } from '../../../index.ts';
import { NotFoundError, ValidationError } from '@core/errors';
import { logAudit } from '../audit/log.ts';
import {
	createWorldJournal,
	createWorldJournalPage,
	createWorldJournalSection,
	updateWorldJournal,
	updateWorldJournalPage,
} from '../news/world-journals.ts';

export type QuestNoteKind = 'dm' | 'player';

export type QuestNoteView = {
	journalId: string;
	pageId: string;
	sectionId: string;
	content: string;
	title: string;
	/** Journal-level publish — gates player visibility of the player section. */
	isPublished: boolean;
	visibility: string;
};

export type QuestNotesBundle = {
	worldId: string;
	worldSlug: string | null;
	worldName: string | null;
	journalId: string;
	journalTitle: string;
	isPublished: boolean;
	dm: QuestNoteView | null;
	player: QuestNoteView | null;
};

const DM_SECTION_TITLE = 'DM Notes';
const PLAYER_SECTION_TITLE = 'Player Notes';

async function resolveQuestWorld(quest: { regionId: string | null }): Promise<{
	worldId: string;
	worldSlug: string | null;
	worldName: string | null;
} | null> {
	if (!quest.regionId) return null;
	const region = await db.region.findUnique({
		where: { id: quest.regionId },
		select: { worldId: true, world: { select: { slug: true, name: true } } },
	});
	if (!region?.worldId) return null;
	return {
		worldId: region.worldId,
		worldSlug: region.world?.slug ?? null,
		worldName: region.world?.name ?? null,
	};
}

type JournalWithSections = {
	id: string;
	title: string;
	isPublished: boolean;
	visibility: string;
	worldId: string;
	sections: Array<{
		id: string;
		title: string;
		visibility: string;
		sortOrder: number;
		pages: Array<{ id: string; content: string; sortOrder: number }>;
	}>;
};

function noteFromSection(
	journal: JournalWithSections,
	section: JournalWithSections['sections'][0] | undefined,
): QuestNoteView | null {
	const page = section?.pages[0];
	if (!section || !page) return null;
	return {
		journalId: journal.id,
		pageId: page.id,
		sectionId: section.id,
		content: page.content ?? '',
		title: section.title,
		isPublished: journal.isPublished,
		visibility: section.visibility,
	};
}

function findDmSection(journal: JournalWithSections) {
	return journal.sections.find(s => s.visibility === 'DM_ONLY')
		?? journal.sections.find(s => s.title === DM_SECTION_TITLE)
		?? journal.sections[0];
}

function findPlayerSection(journal: JournalWithSections) {
	return journal.sections.find(s => s.visibility === 'WORLD' || s.visibility === 'PUBLIC')
		?? journal.sections.find(s => s.title === PLAYER_SECTION_TITLE)
		?? journal.sections.find(s => s.id !== findDmSection(journal)?.id);
}

async function loadJournal(journalId: string | null | undefined): Promise<JournalWithSections | null> {
	if (!journalId) return null;
	return db.worldJournal.findUnique({
		where: { id: journalId },
		include: {
			sections: {
				orderBy: { sortOrder: 'asc' },
				include: { pages: { orderBy: { sortOrder: 'asc' } } },
			},
		},
	});
}

async function ensureSection(
	journalId: string,
	title: string,
	visibility: 'DM_ONLY' | 'WORLD',
	sortOrder: number,
	actorId: string,
): Promise<{ sectionId: string; pageId: string }> {
	const existing = await db.worldJournalSection.findFirst({
		where: {
			journalId,
			OR: [{ visibility }, { title }],
		},
		include: { pages: { orderBy: { sortOrder: 'asc' }, take: 1 } },
	});
	if (existing) {
		if (existing.visibility !== visibility || existing.title !== title) {
			await db.worldJournalSection.update({
				where: { id: existing.id },
				data: { visibility, title, sortOrder },
			});
		}
		let pageId = existing.pages[0]?.id;
		if (!pageId) {
			const page = await createWorldJournalPage(
				{ sectionId: existing.id, title: 'Notes', content: '' },
				actorId,
			);
			pageId = page.id;
		}
		return { sectionId: existing.id, pageId };
	}
	const section = await createWorldJournalSection(
		{ journalId, title, visibility, sortOrder },
		actorId,
	);
	const page = await createWorldJournalPage(
		{ sectionId: section.id, title: 'Notes', content: '' },
		actorId,
	);
	return { sectionId: section.id, pageId: page.id };
}

async function createQuestNotesJournal(input: {
	worldId: string;
	title: string;
	actorId: string;
}): Promise<string> {
	const journal = await createWorldJournal(
		{
			worldId: input.worldId,
			title: input.title,
			visibility: 'WORLD',
			description: 'Quest notes (DM section private; player section world-visible when published)',
		},
		input.actorId,
	);
	// Unpublished until DM opts in for players; DMs still edit via quest page by id.
	await updateWorldJournal(journal.id, { isPublished: false }, input.actorId);
	await ensureSection(journal.id, DM_SECTION_TITLE, 'DM_ONLY', 0, input.actorId);
	await ensureSection(journal.id, PLAYER_SECTION_TITLE, 'WORLD', 1, input.actorId);
	return journal.id;
}

function toBundle(
	world: { worldId: string; worldSlug: string | null; worldName: string | null },
	journal: JournalWithSections,
	opts?: { forPlayer?: boolean },
): QuestNotesBundle {
	const dm = opts?.forPlayer ? null : noteFromSection(journal, findDmSection(journal));
	let player = noteFromSection(journal, findPlayerSection(journal));
	if (opts?.forPlayer && (!journal.isPublished || !player)) player = null;
	return {
		worldId: world.worldId,
		worldSlug: world.worldSlug,
		worldName: world.worldName,
		journalId: journal.id,
		journalTitle: journal.title,
		isPublished: journal.isPublished,
		dm,
		player,
	};
}

/**
 * Ensure one quest notes journal exists with DM + player sections.
 */
export async function ensureQuestNotes(questId: string, actorId: string): Promise<QuestNotesBundle> {
	const quest = await db.quest.findUnique({ where: { id: questId } });
	if (!quest) throw new NotFoundError('Quest', questId);

	const world = await resolveQuestWorld(quest);
	if (!world) {
		throw new ValidationError('Quest notes require a world — set World / Region on the quest first.');
	}

	let notesJournalId = quest.notesJournalId;
	if (notesJournalId) {
		const existing = await db.worldJournal.findUnique({
			where: { id: notesJournalId },
			select: { worldId: true },
		});
		if (!existing || existing.worldId !== world.worldId) notesJournalId = null;
	}

	if (!notesJournalId) {
		notesJournalId = await createQuestNotesJournal({
			worldId: world.worldId,
			title: `${quest.title} — Quest Notes`,
			actorId,
		});
		await db.quest.update({
			where: { id: questId },
			data: { notesJournalId },
		});
		await logAudit(db, {
			actorId,
			action: 'UPDATE',
			resourceKey: 'Quest',
			resourceId: questId,
			metadata: { ensureQuestNotes: true, notesJournalId },
		});
	} else {
		// Repair missing sections on an existing linked journal
		await ensureSection(notesJournalId, DM_SECTION_TITLE, 'DM_ONLY', 0, actorId);
		await ensureSection(notesJournalId, PLAYER_SECTION_TITLE, 'WORLD', 1, actorId);
	}

	const journal = await loadJournal(notesJournalId);
	if (!journal) throw new ValidationError('Quest notes journal is missing.');
	return toBundle(world, journal);
}

/** Load linked notes without creating. Returns null when quest has no world. */
export async function getQuestNotes(
	questId: string,
	opts?: { forPlayer?: boolean },
): Promise<QuestNotesBundle | null> {
	const quest = await db.quest.findUnique({ where: { id: questId } });
	if (!quest) return null;

	const world = await resolveQuestWorld(quest);
	if (!world) return null;

	const journal = await loadJournal(quest.notesJournalId);
	if (!journal) {
		return {
			worldId: world.worldId,
			worldSlug: world.worldSlug,
			worldName: world.worldName,
			journalId: '',
			journalTitle: '',
			isPublished: false,
			dm: null,
			player: null,
		};
	}
	return toBundle(world, journal, opts);
}

export async function updateQuestNoteContent(
	questId: string,
	kind: QuestNoteKind,
	content: string,
	actorId: string,
	opts?: { publishPlayerNotes?: boolean },
): Promise<QuestNotesBundle> {
	const bundle = await ensureQuestNotes(questId, actorId);
	const note = kind === 'dm' ? bundle.dm : bundle.player;
	if (!note) throw new ValidationError('Quest note section is missing.');

	await updateWorldJournalPage(note.pageId, { content }, actorId);

	if (kind === 'player' && opts?.publishPlayerNotes !== undefined) {
		await updateWorldJournal(
			bundle.journalId,
			{ isPublished: opts.publishPlayerNotes },
			actorId,
		);
	}

	const refreshed = await getQuestNotes(questId);
	if (!refreshed) throw new ValidationError('Quest notes unavailable after save.');
	return refreshed;
}

/** Clear journal FK when quest loses its world or moves to another world. */
export async function clearQuestNotesIfWorldChanged(
	questId: string,
	previousRegionId: string | null | undefined,
	nextRegionId: string | null | undefined,
	actorId: string,
): Promise<void> {
	if (previousRegionId === nextRegionId) return;
	const quest = await db.quest.findUnique({
		where: { id: questId },
		select: { notesJournalId: true },
	});
	if (!quest?.notesJournalId) return;

	const prevWorld = previousRegionId
		? await db.region.findUnique({ where: { id: previousRegionId }, select: { worldId: true } })
		: null;
	const nextWorld = nextRegionId
		? await db.region.findUnique({ where: { id: nextRegionId }, select: { worldId: true } })
		: null;

	if ((prevWorld?.worldId ?? null) === (nextWorld?.worldId ?? null) && nextWorld?.worldId) {
		return;
	}

	await db.quest.update({
		where: { id: questId },
		data: { notesJournalId: null },
	});
	await logAudit(db, {
		actorId,
		action: 'UPDATE',
		resourceKey: 'Quest',
		resourceId: questId,
		metadata: { clearedQuestNotes: true, reason: 'world_changed_or_cleared' },
	});
}
