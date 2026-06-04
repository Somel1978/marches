// shared/ui/src/gamesystems/dnd5e/name-generator.ts
// Syllable-based fantasy name generator, keyed loosely by species name.

type SyllableSet = { start: string[]; mid: string[]; end: string[] };

const SETS: Record<string, SyllableSet> = {
	elf: {
		start: ['Ae','El',' Il','Cor','Fae','Lael','Thar','Sil','Ny','Va','Aer','Gal'],
		mid:   ['ladr','an','ith','uel','ar','wy','oth','ael','ren','il','as'],
		end:   ['iel','wen','dir','las','riel','ion','eth','wyn','ara','or'],
	},
	dwarf: {
		start: ['Bal','Thor','Dur','Gim','Bru','Khaz','Dwa','Grim','Bom','Nor','Thra','Dain'],
		mid:   ['in','or','dur','grim','bek','un','mar','az','und'],
		end:   ['in','or','grim','dur','bur','rik','nar','li','din'],
	},
	halfling: {
		start: ['Mer','Pip','Bil','Sam','Fro','Ros','Tom','Lob','Dro','Per','Hal','Won'],
		mid:   ['ri','ado','iga','win','bo','oc','adoc','imb','elo'],
		end:   ['ry','do','wise','buck','adoc','kins','foot','o','et'],
	},
	human: {
		start: ['Al','Ber','Cas','Dor','Edw','Gar','Hen','Mar','Rob','Wil','Ros','Tam'],
		mid:   ['ar','en','is','or','ric','win','ald','mon','bert'],
		end:   ['ric','win','ard','mund','ert','on','as','iel','a'],
	},
	tiefling: {
		start: ['Az','Mal','Kor','Vex','Zar','Bel','Nyx','Mor','Cae','Dra','Ish','Lev'],
		mid:   ['az','eth','ar','ish','ux','or','an','iel','az'],
		end:   ['ius','eth','ax','oth','iel','ara','us','ynn','is'],
	},
	default: {
		start: ['Ar','Bel','Cor','Dra','El','Fen','Gor','Kael','Lyr','Mor','Tha','Vel'],
		mid:   ['an','dor','ith','ael','wyn','ar','en','or','iel'],
		end:   ['ar','iel','dor','wyn','as','eth','or','ion','a'],
	},
};

function pick<T>(arr: T[]): T { return arr[Math.floor(Math.random() * arr.length)]; }

function setForSpecies(speciesName?: string): SyllableSet {
	if (!speciesName) return SETS.default;
	const key = speciesName.toLowerCase();
	for (const k of Object.keys(SETS)) {
		if (k !== 'default' && key.includes(k)) return SETS[k];
	}
	return SETS.default;
}

export function generateFantasyName(speciesName?: string): string {
	const set     = setForSpecies(speciesName);
	const useMid  = Math.random() > 0.4;
	const name    = pick(set.start) + (useMid ? pick(set.mid) : '') + pick(set.end);
	return name.charAt(0).toUpperCase() + name.slice(1).toLowerCase();
}