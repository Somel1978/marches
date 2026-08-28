// shared/ui/src/world/neural-map-types.ts

export type NeuralEntityType =
	| 'REGION' | 'LOCATION' | 'FACTION' | 'NPC' | 'QUEST' | 'CHARACTER' | 'JOURNAL' | 'PLOT_QUEST' | 'PLOT_NODE';

export type NeuralMapLayer = 'LORE' | 'PROGRESSION';

export type NeuralMapNodeView = {
	id: string;
	entityType: NeuralEntityType;
	entityId: string;
	layer: NeuralMapLayer;
	posX: number;
	posY: number;
	note: string | null;
	name: string;
	missing?: boolean;
	regionId?: string | null;
	plotQuestId?: string | null;
	plotNodeKind?: string | null;
	plotTitle?: string | null;
	progressionStatus?: string | null;
	progressionAvailable?: boolean;
	progressionImpossible?: boolean;
	progressionEntryBlocked?: boolean;
};

export type NeuralEdgeStatus = 'BLOCKED' | 'LOCKED' | 'UNAVAILABLE' | 'WAITING';

export type NeuralMapEdgeView = {
	id: string;
	fromNodeId: string;
	toNodeId: string;
	label: string | null;
	notes: string | null;
	directed: boolean;
	color: string | null;
	status: NeuralEdgeStatus | null;
};

export type NeuralCandidateView = {
	entityType: NeuralEntityType;
	entityId: string;
	name: string;
	subtitle?: string | null;
	regionId?: string | null;
	layer: NeuralMapLayer;
	plotQuestId?: string | null;
};