// shared/database/lib/plot-graph/types.ts

export type PlotNodeKind =
	| 'OBJECTIVE'
	| 'FAILURE_CONDITION'
	| 'SCENE'
	| 'DISCOVERY'
	| 'ENCOUNTER'
	| 'DECISION'
	| 'DECISION_OPTION'
	| 'EXIT'
	| 'ENDING';

export type PlotEncounterKind = 'COMBAT' | 'PUZZLE' | 'TRAP' | 'SOCIAL';

export type PlotEdgeKind = 'REQUIRES' | 'UNLOCKS' | 'BLOCKS';

export type PlotNodeStatus =
	| 'LOCKED'
	| 'AVAILABLE'
	| 'ACTIVE'
	| 'COMPLETED'
	| 'FAILED'
	| 'MISSED'
	| 'BLOCKED';

export type PlotEntryReqKind =
	| 'QUEST_ACCEPTED'
	| 'NPC_ALIVE'
	| 'NODE_COMPLETED'
	| 'OBJECTIVE_COMPLETE'
	| 'CUSTOM';

export type PlotGraphNode = {
	id: string;
	plotQuestId: string;
	parentNodeId: string | null;
	kind: PlotNodeKind;
	title: string;
	objectiveTier?: 'PRIMARY' | 'OPTIONAL' | null;
};

export type PlotGraphEdge = {
	id: string;
	plotQuestId: string;
	fromNodeId: string;
	toNodeId: string | null;
	toPlotQuestId: string | null;
	kind: PlotEdgeKind;
};

export type PlotGraphState = {
	nodeId: string;
	status: PlotNodeStatus;
};

export type PlotGraphEntryReq = {
	id: string;
	sceneNodeId: string;
	kind: PlotEntryReqKind;
	payload?: unknown;
	label?: string | null;
};

/** Live world facts used to evaluate entry requirements. */
export type EntryReqWorldContext = {
	/** questId → accepted (in progress / completed session) */
	questAccepted: Record<string, boolean>;
	/** npcId → NpcStatus */
	npcStatus: Record<string, string>;
};

export type ProgressionAnalysis = {
	availableSceneIds: string[];
	availableNodeIds: string[];
	impossibleNodeIds: string[];
	/** Scenes gated by unmet (but not permanently failed) entry requirements. */
	entryBlockedSceneIds: string[];
	/** Entry requirement ids that are currently unmet. */
	unmetEntryReqIds: string[];
	missedDiscoveryIds: string[];
	possibleEndingIds: string[];
	blockedEndingIds: string[];
	/** Soft PlotQuest ids unlocked by completed UNLOCKS edges. */
	unlockedPlotQuestIds: string[];
	/** Soft PlotQuest ids locked/blocked by completed BLOCKS → toPlotQuestId. */
	lockedPlotQuestIds: string[];
};
