// shared/ui/src/world/neural-map-types.ts

export type NeuralEntityType =
	| 'REGION' | 'LOCATION' | 'FACTION' | 'NPC' | 'QUEST' | 'CHARACTER' | 'JOURNAL';

export type NeuralMapNodeView = {
	id: string;
	entityType: NeuralEntityType;
	entityId: string;
	posX: number;
	posY: number;
	note: string | null;
	name: string;
	missing?: boolean;
	regionId?: string | null;
};

export type NeuralMapEdgeView = {
	id: string;
	fromNodeId: string;
	toNodeId: string;
	label: string | null;
	notes: string | null;
	directed: boolean;
};

export type NeuralCandidateView = {
	entityType: NeuralEntityType;
	entityId: string;
	name: string;
	subtitle?: string | null;
	regionId?: string | null;
};
