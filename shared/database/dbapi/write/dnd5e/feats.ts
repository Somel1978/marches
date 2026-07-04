// shared/database/dbapi/write/dnd5e/feats.ts
import { db } from '../../../index.ts';
import { logAudit } from '../audit/log.ts';
import { NotFoundError } from '@core/errors';

export async function createDnd5eFeat(input: {
    gameSystemId:   string;
    name:           string;
    uploadId?:      string;
    description?:   string;
    snippet?:       string;
    repeatable?:    boolean;
    categories?:    string;
    prerequisites?: string;
    detailsUrl?:    string;
    isAvailable?:   boolean;
    isEpicBoon?:    boolean;
    sortOrder?:     number;
    asiAmount?:     number | null;
    asiStatFixed?:  string | null;
    asiStatChoices?:    string | null;
    grantsSkills?:       string | null;
    grantsExpertise?:    string | null;
    grantsHalfSkills?:   string | null;
    grantsSavingThrows?: string | null;
    skillChoiceCount?:         number | null;
    skillChoicePool?:          string | null;
    savingThrowChoiceCount?:   number | null;
    savingThrowChoicePool?:    string | null;
    grantsTools?: string | null; toolChoiceCount?: number | null; toolChoicePool?: string | null;
    grantsLanguages?: string | null; languageChoiceCount?: number | null; languageChoicePool?: string | null;
    grantsResistances?: string | null; grantsImmunities?: string | null; grantsVulnerabilities?: string | null;
    grantsInnateSpells?: string | null;
    grantsSpeed?: string | null;
    grantsSenses?: string | null;
}, actorId?: string) {
    return db.$transaction(async (tx) => {
        const feat = await tx.dnd5eFeat.create({ data: { ...input } });
        await logAudit(tx, { actorId, action: 'CREATE', resourceKey: 'Dnd5eFeat', resourceId: feat.id, after: feat });
        return feat;
    });
}

export async function updateDnd5eFeat(id: string, input: {
    uploadId?:       string | null;
    name?:           string;
    description?:    string;
    snippet?:        string;
    repeatable?:     boolean;
    categories?:     string;
    prerequisites?:  string;
    detailsUrl?:     string;
    isAvailable?:    boolean;
    isEpicBoon?:     boolean;
    sortOrder?:      number;
    asiAmount?:      number | null;
    asiStatFixed?:   string | null;
    asiStatChoices?:    string | null;
    grantsSkills?:       string | null;
    grantsExpertise?:    string | null;
    grantsHalfSkills?:   string | null;
    grantsSavingThrows?: string | null;
    skillChoiceCount?:         number | null;
    skillChoicePool?:          string | null;
    savingThrowChoiceCount?:   number | null;
    savingThrowChoicePool?:    string | null;
    grantsTools?: string | null; toolChoiceCount?: number | null; toolChoicePool?: string | null;
    grantsLanguages?: string | null; languageChoiceCount?: number | null; languageChoicePool?: string | null;
    grantsResistances?: string | null; grantsImmunities?: string | null; grantsVulnerabilities?: string | null;
    grantsInnateSpells?: string | null;
    grantsSpeed?: string | null;
    grantsSenses?: string | null;
}, actorId?: string) {
    const feat = await db.dnd5eFeat.findUnique({ where: { id } });
    if (!feat) throw new NotFoundError('Dnd5eFeat', id);
    return db.$transaction(async (tx) => {
        const updated = await tx.dnd5eFeat.update({ where: { id }, data: input });
        await logAudit(tx, { actorId, action: 'UPDATE', resourceKey: 'Dnd5eFeat', resourceId: id, before: feat, after: updated });
        return updated;
    });
}

export async function deleteDnd5eFeat(id: string, actorId?: string) {
    const feat = await db.dnd5eFeat.findUnique({ where: { id } });
    if (!feat) throw new NotFoundError('Dnd5eFeat', id);
    return db.$transaction(async (tx) => {
        await tx.dnd5eFeat.delete({ where: { id } });
        await logAudit(tx, { actorId, action: 'DELETE', resourceKey: 'Dnd5eFeat', resourceId: id, before: feat });
    });
}