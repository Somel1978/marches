// shared/database/dbapi/write/platform/update-setting.ts
import { db } from '../../../index.ts';
import { NotFoundError } from '@core/errors';

export async function updateSetting(key: string, value: string | null, actorId?: string) {
    const existing = await db.setting.findUnique({ where: { key } });
    if (!existing) throw new NotFoundError('Setting', key);

    return db.setting.update({
        where: { key },
        data:  { value, updatedBy: actorId },
    });
}

export async function updateSettings(
    entries:  { key: string; value: string | null }[],
    actorId?: string,
) {
    return db.$transaction(
        entries.map(({ key, value }) =>
            db.setting.upsert({
                where:  { key },
                update: { value, updatedBy: actorId },
                create: { key, value: value ?? '', updatedBy: actorId },
            })
        )
    );
}