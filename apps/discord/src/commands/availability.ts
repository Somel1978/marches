// apps/discord/src/commands/availability.ts
import { ChatInputCommandInteraction, EmbedBuilder, MessageFlags } from 'discord.js';
import { availability, users, worlds } from '@core/database';

// Slots are 0-47 (30-min blocks). Slot 0 = 00:00, slot 20 = 10:00, etc.
function timeToSlot(h: number, m: number): number {
    return h * 2 + (m >= 30 ? 1 : 0);
}

function parseDate(dateStr: string): Date | null {
    // Accept YYYY-MM-DD or DD/MM/YYYY
    const isoMatch = dateStr.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (isoMatch) {
        const d = new Date(`${isoMatch[1]}-${isoMatch[2]}-${isoMatch[3]}T00:00:00.000Z`);
        return isNaN(d.getTime()) ? null : d;
    }
    const euMatch = dateStr.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
    if (euMatch) {
        const d = new Date(`${euMatch[3]}-${euMatch[2].padStart(2,'0')}-${euMatch[1].padStart(2,'0')}T00:00:00.000Z`);
        return isNaN(d.getTime()) ? null : d;
    }
    return null;
}

function parseTime(timeStr: string): { h: number; m: number } | null {
    const m = timeStr.match(/^(\d{1,2}):(\d{2})$/);
    if (!m) return null;
    const h = parseInt(m[1]), min = parseInt(m[2]);
    if (h < 0 || h > 23 || min < 0 || min > 59) return null;
    return { h, m: min };
}

export async function handleSetAvailableCommand(interaction: ChatInputCommandInteraction) {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    const startDateStr = interaction.options.getString('start_date', true);
    const startTimeStr = interaction.options.getString('start_time', true);
    const endDateStr   = interaction.options.getString('end_date',   true);
    const endTimeStr   = interaction.options.getString('end_time',   true);
    const scopeStr     = interaction.options.getString('scope',      false) ?? 'global';

    // Parse dates and times
    const startDate = parseDate(startDateStr);
    const endDate   = parseDate(endDateStr);
    const startTime = parseTime(startTimeStr);
    const endTime   = parseTime(endTimeStr);

    if (!startDate) return interaction.editReply('❌ Invalid start date. Use YYYY-MM-DD or DD/MM/YYYY.');
    if (!endDate)   return interaction.editReply('❌ Invalid end date. Use YYYY-MM-DD or DD/MM/YYYY.');
    if (!startTime) return interaction.editReply('❌ Invalid start time. Use HH:MM (e.g. 14:00).');
    if (!endTime)   return interaction.editReply('❌ Invalid end time. Use HH:MM (e.g. 18:00).');

    // Find user by Discord ID
    const user = await users.getByDiscordId(interaction.user.id);
    if (!user) return interaction.editReply('❌ Your Discord account is not linked to a Marches account. Log in and link your Discord in your profile.');

    // Resolve scope
    let scope: 'GLOBAL' | 'WORLD' = 'GLOBAL';
    let worldIds: string[] = [];

    if (scopeStr.toLowerCase() !== 'global') {
        const allWorlds = await worlds.getAll();
        const world = (allWorlds as any[]).find((w: any) =>
            w.name.toLowerCase().includes(scopeStr.toLowerCase())
        );
        if (!world) return interaction.editReply(`❌ World "${scopeStr}" not found. Use "global" or a world name.`);
        scope    = 'WORLD';
        worldIds = [world.id];
    }

    // Build list of date+slot combinations
    const startSlot = timeToSlot(startTime.h, startTime.m);
    // End time is exclusive: 18:00 means last slot is 17:30–18:00 (slot 35), not 18:00–18:30 (slot 36)
    const endSlot   = Math.max(startSlot, timeToSlot(endTime.h, endTime.m) - 1);

    // Iterate over each date from startDate to endDate
    const entries: { date: Date; slots: number[] }[] = [];
    const current = new Date(startDate);
    const end     = new Date(endDate);

    while (current <= end) {
        const isFirst = current.getTime() === startDate.getTime();
        const isLast  = current.getTime() === endDate.getTime();
        const fromSlot = isFirst ? startSlot : 0;
        const toSlot   = isLast  ? endSlot   : 47;

        const slots: number[] = [];
        for (let s = fromSlot; s <= toSlot; s++) slots.push(s);
        if (slots.length) entries.push({ date: new Date(current), slots });

        current.setUTCDate(current.getUTCDate() + 1);
    }

    if (!entries.length) return interaction.editReply('❌ No valid time slots in that range. Check start is before end.');

    // Save all slots
    let totalSlots = 0;
    for (const e of entries) {
        await availability.setSlots(user.id, e.date, e.slots, scope, worldIds);
        totalSlots += e.slots.length;
    }

    const scopeLabel = scope === 'GLOBAL' ? '🌍 Global' : `🌐 ${scopeStr}`;
    const embed = new EmbedBuilder()
        .setTitle('✅ Availability Set')
        .setColor(0x22c55e)
        .addFields(
            { name: 'From',  value: `${startDateStr} ${startTimeStr}`, inline: true },
            { name: 'To',    value: `${endDateStr} ${endTimeStr}`,     inline: true },
            { name: 'Scope', value: scopeLabel,                        inline: true },
            { name: 'Slots', value: `${totalSlots} × 30-min blocks across ${entries.length} day(s)`, inline: false },
        )
        .setTimestamp();

    return interaction.editReply({ embeds: [embed] });
}

export async function handleUnsetAvailableCommand(interaction: ChatInputCommandInteraction) {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    const startDateStr = interaction.options.getString('start_date', true);
    const startTimeStr = interaction.options.getString('start_time', true);
    const endDateStr   = interaction.options.getString('end_date',   true);
    const endTimeStr   = interaction.options.getString('end_time',   true);

    const startDate = parseDate(startDateStr);
    const endDate   = parseDate(endDateStr);
    const startTime = parseTime(startTimeStr);
    const endTime   = parseTime(endTimeStr);

    if (!startDate) return interaction.editReply('❌ Invalid start date. Use YYYY-MM-DD or DD/MM/YYYY.');
    if (!endDate)   return interaction.editReply('❌ Invalid end date. Use YYYY-MM-DD or DD/MM/YYYY.');
    if (!startTime) return interaction.editReply('❌ Invalid start time. Use HH:MM (e.g. 14:00).');
    if (!endTime)   return interaction.editReply('❌ Invalid end time. Use HH:MM (e.g. 18:00).');

    const user = await users.getByDiscordId(interaction.user.id);
    if (!user) return interaction.editReply('❌ Your Discord account is not linked to a Marches account.');

    const startSlot = timeToSlot(startTime.h, startTime.m);
    // End time is exclusive: 18:00 means last slot is 17:30–18:00 (slot 35), not 18:00–18:30 (slot 36)
    const endSlot   = Math.max(startSlot, timeToSlot(endTime.h, endTime.m) - 1);

    const current = new Date(startDate);
    const end     = new Date(endDate);
    let totalSlots = 0;
    let days = 0;

    while (current <= end) {
        const isFirst = current.getTime() === startDate.getTime();
        const isLast  = current.getTime() === endDate.getTime();
        const fromSlot = isFirst ? startSlot : 0;
        const toSlot   = isLast  ? endSlot   : 47;

        const slots: number[] = [];
        for (let s = fromSlot; s <= toSlot; s++) slots.push(s);

        if (slots.length) {
            await availability.clearSlots(user.id, new Date(current), slots);
            totalSlots += slots.length;
            days++;
        }
        current.setUTCDate(current.getUTCDate() + 1);
    }

    const embed = new EmbedBuilder()
        .setTitle('✅ Availability Cleared')
        .setColor(0xef4444)
        .addFields(
            { name: 'From',  value: `${startDateStr} ${startTimeStr}`, inline: true },
            { name: 'To',    value: `${endDateStr} ${endTimeStr}`,     inline: true },
            { name: 'Slots', value: `${totalSlots} × 30-min blocks across ${days} day(s)`, inline: false },
        )
        .setTimestamp();

    return interaction.editReply({ embeds: [embed] });
}