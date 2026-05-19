// shared/database/dbapi/write/quests/create.ts
import { db } from '../../../index.ts';
import { logAudit } from '../audit/log.ts';
import { ValidationError } from '@core/errors';
import { getSettingsMap } from '../../read/platform/get-settings.ts';

export type CreateQuestInput = {
    dmProfileId:  string;
    title:        string;
    description?: string;
    rules?:       string;
    missionXp:    number;
    minCapacity:  number;
    maxCapacity:  number;
    minLevel:     number;
    maxLevel:     number;
    regionId?:    string;
    rewards:      { type: string; amount: number; itemId?: string; itemName?: string }[];
};

export async function createQuest(input: CreateQuestInput, actorId: string) {
    const settings   = await getSettingsMap();
    const globalMin  = Number(settings['quest.minCapacity'] ?? 2);
    const globalMax  = Number(settings['quest.maxCapacity'] ?? 6);

    if (input.minCapacity < globalMin)
        throw new ValidationError(`Minimum capacity cannot be less than global minimum (${globalMin}).`);
    if (input.maxCapacity > globalMax)
        throw new ValidationError(`Maximum capacity cannot exceed global maximum (${globalMax}).`);
    if (input.minCapacity > input.maxCapacity)
        throw new ValidationError('Minimum capacity cannot exceed maximum capacity.');
    if (input.minLevel > input.maxLevel)
        throw new ValidationError('Minimum level cannot exceed maximum level.');

    return db.$transaction(async (tx) => {
        const quest = await tx.quest.create({
            data: {
                dmProfileId:  input.dmProfileId,
                title:        input.title,
                description:  input.description,
                rules:        input.rules,
                missionXp:    input.missionXp,
                minCapacity:  input.minCapacity,
                maxCapacity:  input.maxCapacity,
                minLevel:     input.minLevel,
                maxLevel:     input.maxLevel,
                regionId:     input.regionId,
                status:       'DRAFT',
            },
        });

        if (input.rewards.length > 0) {
            await tx.questReward.createMany({
                data: input.rewards.map(r => ({
                    questId:  quest.id,
                    type:     r.type as any,
                    amount:   r.amount,
                    itemId:   r.itemId   ?? null,
                    itemName: r.itemName ?? null,
                })),
            });
        }

        await logAudit(tx, {
            actorId,
            action:      'CREATE',
            resourceKey: 'Quest',
            resourceId:  quest.id,
            after:       quest,
        });

        return quest;
    });
}
