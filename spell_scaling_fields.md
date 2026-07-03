# Spell Scaling Fields — Marches Platform

Documentation for how a spell's damage, upcast, and progression data is stored and displayed.

---

## Cantrip Damage Fields

Used for cantrips only. The platform stores the damage expression at each character-level breakpoint where the cantrip scales.

| Field | Column (import) | Description |
|---|---|---|
| `cantripDamage` | `Cantrip Damage` | Base damage at levels 1–4 e.g. `1d10` |
| `cantripDamageLvl5` | `Cantrip Dmg Lvl 5` | Damage from level 5 e.g. `2d10` |
| `cantripDamageLvl11` | `Cantrip Dmg Lvl 11` | Damage from level 11 e.g. `3d10` |
| `cantripDamageLvl17` | `Cantrip Dmg Lvl 17` | Damage from level 17 e.g. `4d10` |

All four fields are free-text strings — the platform displays them as-is without evaluation. Write any valid dice expression: `1d6`, `2d8+3`, `3d10`.

---

## Levelled Spell Upcast Fields

Used for levelled spells that scale when cast at a higher slot level. Three approaches, used in priority order by the display:

### 1. `spellUpcastPerSlot` — `Upcast Per Slot`

The damage or effect added **per slot level above the spell's base level**.

```
1d6
+1d8
2 targets
```

Displayed as: *"{value} for each slot level above {spell level}."*

Use this when the spell adds a fixed amount for **each additional slot level**, e.g. Fireball adds `1d6` per level above 3rd.

### 2. `spellUpcastEveryTwoSlots` — `Upcast Every 2 Slots`

The damage or effect added for **every two slot levels above the base**.

```
1d6
+2d8
```

Displayed as: *"{value} for every two slot levels above {spell level}."*

Use this for spells like Cure Wounds (2014) variants that scale every other level.

---

## Progression Fields

Used when the upcast doesn't follow a simple per-slot or per-two-slots pattern — i.e. the value at each slot level is different and must be listed explicitly.

### `spellProgression` — `Spell Progression`

A **structured formula string** listing the value at each relevant spell slot level.

**Format:**
```
[slotLevel=value][slotLevel=value]...
```

**Examples:**

| Spell | Value |
|---|---|
| Cure Wounds (2014 variant) | `[2=2d8][3=3d8][4=4d8][5=5d8][6=6d8][7=7d8][8=8d8][9=9d8]` |
| Hex damage per level | `[1=1d6][5=2d6][11=3d6][17=4d6]` |
| Chromatic Orb | `[2=3d8][3=4d8][4=5d8][5=6d8][6=7d8][7=8d8][8=9d8][9=10d8]` |

**Important:** This field is **stored and displayed as-is** — the platform does not evaluate or parse the bracket syntax. It renders the raw string in the "At Higher Levels" section of the spellbook and Discord bot. The `[n=v]` format is a convention for human readability and for the parser tool to generate consistent output — it is not computed by the platform.

**When to use:** Use `spellProgression` when `spellUpcastPerSlot` is not sufficient because the increment is irregular, the scaling skips levels, or the values at each level are non-linear.

### `spellProgressionNote` — `Progression Note`

A **free-text human-readable description** of how the spell scales. Displayed when neither `spellUpcastPerSlot` nor `spellUpcastEveryTwoSlots` is set.

**Examples:**

```
When you cast this spell using a spell slot of 2nd level or higher, you can target one additional creature for each slot level above 1st.
For each slot above 2nd, the duration increases by 8 hours.
At 5th level, the damage increases to 2d6. At 11th level to 3d6. At 17th level to 4d6.
```

**When to use:** Use `spellProgressionNote` for:
- Spells that don't scale damage at all but scale targets, duration, area, or other non-numeric effects
- Any scaling description that doesn't fit the structured fields
- Displaying the original PHB "At Higher Levels" text verbatim

---

## Display Priority

The spellbook and Discord bot render the "At Higher Levels" block using the first field that has a value:

```
1. spellUpcastPerSlot        → "{value} for each slot level above {base}."
2. spellUpcastEveryTwoSlots  → "{value} for every two slot levels above {base}."
3. spellProgressionNote      → displayed as-is
4. spellProgression          → displayed as-is
```

The block only appears if `canCastAtHigherLevel = true` **and** at least one of the four fields is populated.

---

## Recommended Usage by Spell Type

| Spell type | Recommended field |
|---|---|
| Cantrip (damage scales by character level) | `cantripDamage` + `cantripDamageLvl5/11/17` |
| Levelled spell, +same amount per slot | `spellUpcastPerSlot` |
| Levelled spell, +same amount every 2 slots | `spellUpcastEveryTwoSlots` |
| Levelled spell, different value at each slot | `spellProgression` |
| Scales targets, duration, area, or other effect | `spellProgressionNote` |
| Original PHB "At Higher Levels" text verbatim | `spellProgressionNote` |

---

## Parser Output Convention

The DDB parser populates these fields as follows:

- `spellUpcastPerSlot` — when DDB's structured upcast data shows a fixed per-level increment
- `spellProgressionNote` — the raw "At Higher Levels" text from DDB's description HTML when no structured upcast data is available
- `spellProgression` — the `[level=value]` bracket string generated by the parser for non-linear scaling when it detects explicit level breakpoints in the description

The `[level=value]` bracket format in `spellProgression` exists as a convention so the parser can produce deterministic, diff-able output for the same spell across imports. The platform treats it as display text only.
