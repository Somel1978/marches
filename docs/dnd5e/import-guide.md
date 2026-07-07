# D&D 5e Import Data Structure Guide

All imports accept **JSON arrays** — each element is an object with the column names below as keys. Download the template from the Import page to get a pre-filled header row. All fields are optional unless marked **required**.

Columns that accept comma-separated values use `,` as the delimiter (no spaces around it, or trim them). Boolean fields accept `true`, `yes`, `1` (case-insensitive) for true; anything else is false.

---

## Common Grant Fields

Several import types share the same grant field set. These are documented once here and referenced throughout.

| Field | Type | Description |
|---|---|---|
| `grantsSkills` | comma-sep skills | Auto-grants these skill proficiencies. Values: `Acrobatics`, `Animal Handling`, `Arcana`, `Athletics`, `Deception`, `History`, `Insight`, `Intimidation`, `Investigation`, `Medicine`, `Nature`, `Perception`, `Performance`, `Persuasion`, `Religion`, `Sleight of Hand`, `Stealth`, `Survival` |
| `grantsExpertise` | comma-sep skills | Auto-grants expertise (×2 proficiency) in these skills |
| `grantsHalfSkills` | comma-sep skills | Auto-grants half-proficiency in these skills |
| `grantsSavingThrows` | comma-sep stats | Auto-grants saving throw proficiency. Values: `Strength`, `Dexterity`, `Constitution`, `Intelligence`, `Wisdom`, `Charisma` |
| `skillChoiceCount` | integer | How many skills the player picks from the pool |
| `skillChoicePool` | comma-sep skills | Pool of skills the player picks from (same values as `grantsSkills`) |
| `expertiseChoiceCount` | integer | How many skills the player picks for expertise (×2 proficiency) |
| `expertiseChoicePool` | comma-sep skills | Pool of skills eligible for expertise; use `*` for "any proficient skill" |
| `savingThrowChoiceCount` | integer | How many saving throws the player picks |
| `savingThrowChoicePool` | comma-sep stats | Pool of stats the player picks from |
| `grantsTools` | comma-sep strings | Auto-grants proficiency in these tools. Free text e.g. `Thieves' Tools,Smith's Tools` |
| `toolChoiceCount` | integer | How many tools the player picks |
| `toolChoicePool` | comma-sep strings | Pool of tools the player picks from |
| `grantsLanguages` | comma-sep strings | Auto-grants these languages. Free text e.g. `Common,Elvish` |
| `languageChoiceCount` | integer | How many languages the player picks |
| `languageChoicePool` | comma-sep strings | Pool of languages the player picks from |
| `grantsResistances` | comma-sep strings | Auto-grants damage resistances e.g. `Fire,Cold` |
| `grantsImmunities` | comma-sep strings | Auto-grants damage immunities e.g. `Necrotic,Radiant` |
| `grantsVulnerabilities` | comma-sep strings | Auto-grants damage vulnerabilities e.g. `Bludgeoning` |
| `resistanceChoiceCount` | integer | How many damage resistances the player picks |
| `resistanceChoicePool` | comma-sep strings | Pool of damage types for resistance choices e.g. `Fire,Cold,Lightning` |
| `immunityChoiceCount` | integer | How many damage immunities the player picks |
| `immunityChoicePool` | comma-sep strings | Pool of damage types for immunity choices |
| `vulnerabilityChoiceCount` | integer | How many damage vulnerabilities the player picks |
| `vulnerabilityChoicePool` | comma-sep strings | Pool of damage types for vulnerability choices |
| `grantsFeatCategory` | string | Category of feat granted or offered (e.g. `Origin`, `General`) — player picks from category when no fixed feat |
| `grantsFeatId` | string | UUID of a specific feat auto-granted (locked slot) |
| `grantsSpeed` | comma-sep entries | Additive speed bonuses. Format per movement type: `TYPE:amount` e.g. `WALK:10,SWIM:30`. Types: `WALK`, `FLY`, `SWIM`, `CLIMB`, `BURROW`. Values are added on top of any species trait speeds. |
| `grantsSenses` | string | Free text description of special senses granted e.g. `Blindsense 10 ft`, `Tremorsense 30 ft`. Multiple sources are joined with `, ` for display. |
| `grantsInnateSpells` | comma-sep entries | Innate spellcasting. Format per spell: `SpellName:minCharLevel:usesPerDay[:true]` where `usesPerDay` 0 = at will, and the optional 4th segment `true` means the spell can also be cast using spell slots. Example: `Faerie Fire:1:0,Darkness:3:1,Daylight:5:1:true` |

---

## 1. Classes

**Action:** `?/importClasses`

| Field | Required | Type | Notes |
|---|---|---|---|
| `name` | ✓ | string | Class name. Used as unique key per game system |
| `hitDice` | | integer | Hit die size e.g. `8` for d8 |
| `canCastSpells` | | boolean | Whether this class has a spellbook |
| `subclassAvailableAtLevel` | | integer | Level at which the player picks a subclass |
| `primaryAbilities` | | comma-sep stats | e.g. `Strength,Constitution` |
| `equipmentDescription` | | string | Free text description of starting equipment |
| `description` | | string | Class description |
| `source` | | string | Source book e.g. `PHB 2024` |
| `link` | | string | URL to rules reference |
| `sortOrder` | | integer | Display sort order |
| `skillChoiceCount` | | integer | How many skills the player picks at character creation |
| `grantsSavingThrows` | | comma-sep stats | Saving throw proficiencies granted by this class |
| `skillPool` | | comma-sep skills | Pool of skills the player picks from |

---

## 2. Class Features

**Action:** `?/importClassFeatures`

| Field | Required | Type | Notes |
|---|---|---|---|
| `className` | ✓ | string | Must match an existing class name exactly |
| `name` | ✓ | string | Feature name. Unique per class + level |
| `requiredLevel` | ✓ | integer | Class level at which this feature is granted |
| `description` | | string | Feature description |
| `url` | | string | URL to rules reference |
| + all **Common Grant Fields** | | | See table above |

---

## 3. Subclasses

**Action:** `?/importSubclasses`

| Field | Required | Type | Notes |
|---|---|---|---|
| `className` | ✓ | string | Must match an existing class name exactly |
| `name` | ✓ | string | Subclass name. Unique per class |
| `description` | | string | Subclass description |
| `source` | | string | Source book |
| `link` | | string | URL to rules reference |
| `canCastSpells` | | boolean | Whether this subclass adds spellcasting |
| `sortOrder` | | integer | Display sort order |

---

## 4. Subclass Features

**Action:** `?/importSubclassFeatures`

| Field | Required | Type | Notes |
|---|---|---|---|
| `className` | ✓ | string | Must match an existing class name exactly |
| `subclassName` | ✓ | string | Must match an existing subclass name for that class |
| `name` | ✓ | string | Feature name |
| `requiredLevel` | ✓ | integer | Class level at which this feature is granted |
| `description` | | string | Feature description |
| `url` | | string | URL to rules reference |
| + all **Common Grant Fields** | | | See table above |

---

## 5. Species

**Action:** `?/importSpecies`

| Field | Required | Type | Notes |
|---|---|---|---|
| `name` | ✓ | string | Species name. Unique per game system |
| `description` | | string | Species description |
| `source` | | string | Source book |
| `link` | | string | URL to rules reference |
| `isSubrace` | | boolean | Whether this is a subrace/lineage variant |
| `isLegacy` | | boolean | Whether this is a legacy/deprecated species |
| `sortOrder` | | integer | Display sort order |

> **Note:** Physical characteristics (size, senses, movement speeds) and all trait grants are set on **Species Traits**, not on the species itself.

---

## 6. Species Traits

**Action:** `?/importSpeciesTraits`

| Field | Required | Type | Notes |
|---|---|---|---|
| `speciesName` | ✓ | string | Must match an existing species name exactly |
| `name` | ✓ | string | Trait name. Unique per species |
| `description` | | string | Trait description |
| `requiredLevel` | | integer | Character level at which this trait activates (default 1) |
| `size` | | string | Fixed size granted by this trait e.g. `Medium`, `Small` |
| `sizeChoices` | | comma-sep strings | Pool of sizes the player picks from e.g. `Small,Medium` |
| `senses` | | string | Free text description of senses e.g. `Darkvision 60 ft, Tremorsense 30 ft` |
| `WALK` | | integer | Walking speed in feet granted by this trait (additive — multiple traits can each contribute) |
| `FLY` | | integer | Flying speed in feet |
| `SWIM` | | integer | Swimming speed in feet |
| `CLIMB` | | integer | Climbing speed in feet |
| `BURROW` | | integer | Burrowing speed in feet |
| + all **Common Grant Fields** | | | See table above |

> **Speed note:** Speeds from multiple traits of the same type are **summed**. If two traits each grant `WALK:30`, the character has Walk 60 ft. Set to `0` or leave blank to grant no speed of that type.

---

## 7. Backgrounds

**Action:** `?/importBackgrounds`

| Field | Required | Type | Notes |
|---|---|---|---|
| `name` | ✓ | string | Background name. Unique per game system |
| `shortDescription` | | string | One-line summary |
| `featureName` | | string | Name of the background's narrative feature |
| `url` | | string | URL to rules reference |
| `sortOrder` | | integer | Display sort order |
| + all **Common Grant Fields** | | | See table above (note: `grantsSkills` here grants exactly 2 skills; `skillChoiceCount`/`skillChoicePool` for player picks) |

> Background-specific feat columns (`grantsFeatCategory`, `grantsFeatId`) are listed in **Common Grant Fields** and apply here too.

---

## 8. Feats

**Action:** `?/importFeats`

| Field | Required | Type | Notes |
|---|---|---|---|
| `name` | ✓ | string | Feat name. Unique per game system |
| `description` | | string | Full feat description |
| `snippet` | | string | Short one-line summary |
| `repeatable` | | boolean | Whether the feat can be taken multiple times |
| `categories` | | comma-sep strings | Feat categories e.g. `General,Origin,Fighting Style` |
| `prerequisites` | | string | Free text prerequisite description |
| `detailsUrl` | | string | URL to rules reference |
| `source` | | string | Source book e.g. `PHB 2024` |
| `isEpicBoon` | | boolean | Whether this is an Epic Boon feat |
| `asiAmount` | | integer | Number of ability score points granted |
| `asiStatFixed` | | comma-sep stats | Stats that always receive the ASI |
| `asiStatChoices` | | comma-sep stats | Pool of stats the player picks from for the ASI |
| `sortOrder` | | integer | Display sort order |
| + all **Common Grant Fields** | | | See table above |

---

## 9. Spells

**Action:** `?/importSpells`

| Field | Required | Notes |
|---|---|---|
| `Spell ID` | ✓ | Numeric DDB definition ID — used as the unique key |
| `Name` | ✓ | Spell name |
| `Link` | | URL to rules reference |
| `Level` | | 0 = Cantrip, 1–9 for spell levels |
| `School` | | e.g. `Evocation`, `Illusion` |
| `Concentration` | | boolean |
| `Ritual` | | boolean |
| `Is Homebrew` | | boolean |
| `Is Legacy` | | boolean |
| `Cantrip Damage` | | Damage dice at level 1 e.g. `1d10` |
| `Cantrip Dmg Lvl 5` | | Damage dice at character level 5 |
| `Cantrip Dmg Lvl 11` | | Damage dice at character level 11 |
| `Cantrip Dmg Lvl 17` | | Damage dice at character level 17 |
| `Spell Damage` | | Base spell damage dice |
| `Upcast Per Slot` | | Additional dice per spell slot level above minimum |
| `Upcast Every 2 Slots` | | Additional dice per 2 slot levels above minimum |
| `Spell Progression` | | Progression type identifier |
| `Progression Note` | | Free text note about scaling |
| `Range Origin` | | e.g. `Self`, `Touch`, `Ranged` |
| `Range Value (ft)` | | Numeric range in feet |
| `AoE Type` | | e.g. `Cone`, `Sphere`, `Line` |
| `AoE Value (ft)` | | Numeric area size in feet |
| `Duration Type` | | e.g. `Instantaneous`, `Concentration`, `Duration` |
| `Duration Interval` | | Numeric duration amount |
| `Duration Unit` | | e.g. `Round`, `Minute`, `Hour`, `Day` |
| `Requires Saving Throw` | | boolean |
| `Saving Throw` | | Stat e.g. `Dexterity` |
| `Requires Attack Roll` | | boolean |
| `Can Cast Higher Level` | | boolean |
| `Casting Time` | | e.g. `1 Action`, `1 Bonus Action`, `1 Reaction`, `1 Minute` |
| `Components` | | e.g. `V,S,M` |
| `Description` | | Full spell description |
| `Source Book` | | e.g. `PHB 2024`, `XGE` |
| `Tags` | | Comma-separated tags |
| `Spell List` | | Comma-separated class names this spell belongs to |

---

## 10. Spell Slots

**Action:** `?/importSpellSlots`

Defines the spell slot progression table per class and caster type.

| Field | Required | Notes |
|---|---|---|
| `Class Name` | ✓ | Must match an existing class name |
| `Subclass Name` | | For subclass-specific progressions |
| `Caster Type` | ✓ | e.g. `FULL`, `HALF`, `THIRD`, `WARLOCK` |
| `Level` | ✓ | Class level (1–20) |
| `Slot 1` | | Number of 1st-level slots at this class level |
| `Slot 2` | | Number of 2nd-level slots |
| `Slot 3` | | Number of 3rd-level slots |
| `Slot 4` | | Number of 4th-level slots |
| `Slot 5` | | Number of 5th-level slots |
| `Slot 6` | | Number of 6th-level slots |
| `Slot 7` | | Number of 7th-level slots |
| `Slot 8` | | Number of 8th-level slots |
| `Slot 9` | | Number of 9th-level slots |

---

## 11. Spells Known

**Action:** `?/importSpellsKnown`

Defines how many spells a class knows or can prepare at each level.

| Field | Required | Notes |
|---|---|---|
| `Class Name` | ✓ | Must match an existing class name |
| `Subclass Name` | | For subclass-specific progressions |
| `Level` | ✓ | Class level (1–20) |
| `Cantrips` | | Number of cantrips known |
| `Prepared` | | Number of spells prepared (or known for known-casters) |
| `Additional` | | Additional spells beyond the prepared count |
| `Note` | | Free text note e.g. `Always prepared` |

---

## Format Notes

### Speed bonus format
`TYPE:amount` per movement type, comma-separated. Example: `WALK:10,FLY:30`. Values are **additive** — if a character already has Walk 30 ft from a species trait and gains `WALK:10` from a class feature, their total Walk speed is 40 ft. Valid types: `WALK`, `FLY`, `SWIM`, `CLIMB`, `BURROW` (case-insensitive).

### Skill values (for grant and pool fields)
Case-insensitive. Accepted formats: `Acrobatics`, `ACROBATICS`, `acrobatics`, `sleight of hand`, `Sleight_Of_Hand`.

### Stat values (for saving throw fields)
Case-insensitive. Accepted: `Strength`, `STRENGTH`, `strength`, `STR`.

### Innate spell format
`SpellName:minCharLevel:usesPerDay[:true]`
- `SpellName` — must match a spell in the system (case-insensitive lookup)
- `minCharLevel` — character level at which this spell is granted (e.g. `1`, `3`, `5`)
- `usesPerDay` — `0` = at will (no slot needed); integer = uses per long rest
- Optional 4th segment `:true` — spell can also be cast using spell slots

**Example:** `Faerie Fire:1:0,Darkness:3:1,Daylight:5:1:true`

### Update behaviour
All importers check for **existing records by name** (case-insensitive). If a match is found, the record is only overwritten when the **Allow Update** checkbox is ticked. Otherwise the row is skipped and reported.

### Warnings
Any unrecognised skill or stat names are collected and shown after import as warnings. The valid rows are still imported — only the invalid grant fields are ignored.