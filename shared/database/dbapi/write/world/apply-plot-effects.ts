// shared/database/dbapi/write/world/apply-plot-effects.ts
// Thin applicator: PlotEffect records → existing faction renown / NPC / plot-quest APIs.
import { db } from '../../../index.ts';
import { setFactionRenown } from '../factions/renown.ts';
import { updateNpc } from '../factions/npcs.ts';
import { updatePlotQuest } from './plot-quests.ts';
import type { PlotEffectKind, NpcStatus } from '@prisma/client';

const NPC_STATUSES: NpcStatus[] = ['ALIVE', 'DEAD', 'MISSING', 'IMPRISONED', 'EXILED'];

export type AppliedEffectResult = {
	effectId: string;
	kind: PlotEffectKind;
	ok: boolean;
	detail: string;
};

function payloadObj(payload: unknown): Record<string, unknown> {
	if (payload && typeof payload === 'object' && !Array.isArray(payload)) {
		return payload as Record<string, unknown>;
	}
	return {};
}

export async function applyPlotEffectsForNode(
	nodeId: string,
	actorId: string,
): Promise<AppliedEffectResult[]> {
	const effects = await db.plotEffect.findMany({
		where: { ownerNodeId: nodeId },
		orderBy: { sortOrder: 'asc' },
	});
	const results: AppliedEffectResult[] = [];

	for (const ef of effects) {
		const p = payloadObj(ef.payload);
		try {
			switch (ef.kind) {
				case 'REPUTATION': {
					const factionId = String(p.factionId ?? '');
					const characterId = String(p.characterId ?? '');
					if (!factionId || !characterId) {
						results.push({
							effectId: ef.id, kind: ef.kind, ok: false,
							detail: 'REPUTATION requires payload.factionId and payload.characterId',
						});
						break;
					}
					let value: number;
					if (p.delta != null && Number.isFinite(Number(p.delta))) {
						const existing = await db.factionRenown.findUnique({
							where: { factionId_characterId: { factionId, characterId } },
							select: { value: true },
						});
						value = (existing?.value ?? 0) + Number(p.delta);
					} else if (p.value != null && Number.isFinite(Number(p.value))) {
						value = Number(p.value);
					} else {
						results.push({
							effectId: ef.id, kind: ef.kind, ok: false,
							detail: 'REPUTATION requires payload.value or payload.delta',
						});
						break;
					}
					await setFactionRenown(
						factionId,
						characterId,
						value,
						ef.label ?? `Plot effect on node ${nodeId}`,
						actorId,
					);
					results.push({ effectId: ef.id, kind: ef.kind, ok: true, detail: `Renown set to ${value}` });
					break;
				}
				case 'NPC_FLAG': {
					const npcId = String(p.npcId ?? '');
					const status = String(p.status ?? '').toUpperCase() as NpcStatus;
					if (!npcId || !NPC_STATUSES.includes(status)) {
						results.push({
							effectId: ef.id, kind: ef.kind, ok: false,
							detail: 'NPC_FLAG requires payload.npcId and payload.status (ALIVE|DEAD|MISSING|IMPRISONED|EXILED)',
						});
						break;
					}
					await updateNpc(npcId, { status }, actorId);
					results.push({ effectId: ef.id, kind: ef.kind, ok: true, detail: `NPC status → ${status}` });
					break;
				}
				case 'LOCK_PLOT_QUEST': {
					const plotQuestId = String(p.plotQuestId ?? '');
					if (!plotQuestId) {
						results.push({
							effectId: ef.id, kind: ef.kind, ok: false,
							detail: 'LOCK_PLOT_QUEST requires payload.plotQuestId',
						});
						break;
					}
					await updatePlotQuest(plotQuestId, { status: 'ABANDONED' }, actorId);
					results.push({
						effectId: ef.id, kind: ef.kind, ok: true,
						detail: `Plot quest ${plotQuestId} → ABANDONED`,
					});
					break;
				}
				case 'CUSTOM': {
					// Opt-in: payload.finishPlot marks the owning plot COMPLETED when the piece finishes
					if (p.finishPlot === true) {
						const owner = await db.plotNode.findUnique({
							where: { id: nodeId },
							select: { plotQuestId: true },
						});
						if (!owner) {
							results.push({
								effectId: ef.id, kind: ef.kind, ok: false,
								detail: 'Owner node not found for finishPlot',
							});
							break;
						}
						await updatePlotQuest(owner.plotQuestId, { status: 'COMPLETED' }, actorId);
						results.push({
							effectId: ef.id, kind: ef.kind, ok: true,
							detail: `Plot quest ${owner.plotQuestId} → COMPLETED`,
						});
						break;
					}
					results.push({
						effectId: ef.id, kind: ef.kind, ok: true,
						detail: 'CUSTOM effect recorded (no automatic mutation)',
					});
					break;
				}
				default:
					results.push({ effectId: ef.id, kind: ef.kind, ok: false, detail: 'Unknown kind' });
			}
		} catch (e: any) {
			results.push({
				effectId: ef.id,
				kind: ef.kind,
				ok: false,
				detail: e?.message ?? 'Apply failed',
			});
		}
	}
	return results;
}
