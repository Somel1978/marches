### Improvements and BUGS TO BE FIXED ###

# Plataform

# RBAC

# Database

# UI - Non Specific to Features

# Feature Specific
## Availability
    -Frontend:
        - We need to rebuilt the availability Layout. 
            Build a responsive activity heatmap dashboard. The UI must work well on both mobile and desktop, using mobile-first layout patterns and fluid sizing so the dashboard remains readable and usable on narrow screens.
            For the frontend create a premium dark-themed dashboard that visualizes available users as a weekly time heatmap. Each dot within a cell represents user availability intensity for a specific day and hour, with more dots or brighter intensity meaning more available users.
                Core layout:
                    Top axis: days of the week, Mon to Sun.
                    Left axis: hours from 00:00 to 23:30.
                    Main visualization: a 7 x 48 heatmap grid.
                    Add a smooth white trend line overlay across the chart around midday.
                    Add a tooltip on hover/tap that shows:
                        day name
                        time
                        available users count
                    Add a footer note: “Based on X active player accounts” or equivalent.
                    Add a legend from “Less” to “More”.
                Visual design:
                    Background: deep charcoal / black.
                    Cells: rounded rectangles with subtle borders, soft shadow, and a warm brown-to-gold color scale.
                    Use an elegant serif for labels/headings and a clean readable sans for small text.
                    Keep the composition compact, polished.
                Responsive behaviour:
                    Use a mobile-first layout.
                    On mobile, preserve readability by allowing horizontal scroll for the full grid if needed, while keeping labels sticky or fixed where practical.
                    Consider reducing padding, tightening gaps, and scaling label size on small screens.
                    Maintain a minimum tap target size for heatmap cells on touch devices.
                    Tooltip must work on both hover and tap.
                    On desktop, display the full grid with all labels visible without overflow.
                    Consider use Svelte 5 component syntax and reactive state.
                    Generate the heatmap data from an array or derived function instead of hardcoding each cell.
                Create reusable components or utility functions for:
                    cell rendering
                    tooltip positioning
                    legend rendering
                Interaction requirements:
                    Hovering a cell should highlight it and reveal the tooltip.
                    The tooltip should have a button to open a Modal to set the availability.
                    On mobile, tapping a cell should select it and open the tooltip.
                    Clicking outside should dismiss the tooltip.
                    Add subtle animation for tooltip fade-in and cell hover states.
                    Make the line overlay and heatmap visually layered but still readable.
                Consider to produce a single polished Svelte component or a small component set that:
                    renders the dashboard,
                    is responsive on mobile and desktop,
                    shows available-user heatmap dots,
                    includes tooltip interaction
        - Admin:
                - Availability colours not visible, CSS issue?

## Characters
    - Frontend:
        - Currently when You Create a Character before going for approval you only fill a few fields, we need to set all fields when we create the character    
        - When Creating or editing a character the values are not being re-loaded from the database after a save, if you do multi-edits will generates erros or store empty fields into the DB. Consider reloading values that are not a secret from the database and only save secrets when they are edited/changed.
        - Backstory does not save to the Database, it is thrown an error that a name is required.
        - Needs to be updated to include the new data fields from the Gamesystems. 
    - Admin:
        - When Creating an editing a character the values are not being re-loaded from the database after a save, if you do multi-edits will generates erros or store empty fields into the DB. Consider reloading values that are not a secret from the database and only save secrets when they are edited/changed. 
        - Not all Fields are Available, needs fixing.

## Navigation
    - Frontend:
        - We need to upgrade the Navigation, We need to declutter the Navigation by moving into a tab approach with: Adventure | Campaign | Community | DM / Become a DM. Then each tab opens a secondary menu (dropdown, drawer, or side panel): 
            Adventure
                Characters
                Quests
                World
                Journal
                Statistics
            Campaign
                Availability
                Marketplace
            Community
                News
    - Admin:
        - Rewards is bypassing role restrictions on nav
        - Plataform Settings is available to everyone this should be locked to specific roles only


## Gamesystem 
    - Admin:
        - We need to expand the Gamesystem. 
            - Currently We have no separation at Schema level of the structure for each system. This creates several issues each system needs to have their own Schema and seed.
                - Create dnd5e Schema and seed
                    - Move Models Class, Subclass, Species into the Dnd5e system schema.
                        - Check if Gamesystem pages in DBAPI are affected.
                    - Expand the dnd5e
                        - Add to the dnd5e Schema
                            - Add Within Class Model: equipmentDescription (string),	hitDice (Numeric), canCastSpells (Boolean), primaryAbilities (String)
                            - Add Class Features Model as child of Class: ClassID, Classref, name (string), description (string), requiredLevel (numeric),Url (link)
                            - Add Within Subclass Model : Nothing to add
                            - Add SubClass Features Model:SubclassID, Class, description,requiredLevel,	Url
                            - Add Backgrounds Model: name,	Url, featureName, skillProficiencies, toolProficiencies, languages,shortDescription
                            - Add Within Species Model : Description,IsSubrace,	IsLegacy, URL
        - We need to create an import from excel fuction to Upload gamesystem data. Based on the schema for each system.

## World
    - Frontend:
        - Currently Worlds are stacked. With a lot of worlds this will make site slow and unpratical. Change the layout of the Worlds landing page and create a card for each world, a thumbnail, Name and levels/danger. when you enter the card than get the world details and so on. 




## 
    - Frontend:
        -
    - Admin:
        - 
