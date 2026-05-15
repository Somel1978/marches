// shared/database/dbapi/read/platform/get-settings.ts
import { db } from '../../../index.ts';

export type SettingRow = {
    key:         string;
    value:       string | null;
    description: string | null;
    isSecret:    boolean;
    updatedAt:   Date;
    updatedBy:   string | null;
};

// Returns all settings — secrets have their value masked for UI display.
export async function getSettings(maskSecrets = true): Promise<SettingRow[]> {
    const rows = await db.setting.findMany({ orderBy: { key: 'asc' } });
    return rows.map(r => ({
        ...r,
        value: maskSecrets && r.isSecret && r.value ? '••••••••' : r.value,
    }));
}

// Returns a plain key→value map with real values (for internal use by email client).
export async function getSettingsMap(): Promise<Record<string, string>> {
    const rows = await db.setting.findMany();
    return Object.fromEntries(
        rows.filter(r => r.value !== null).map(r => [r.key, r.value as string])
    );
}
