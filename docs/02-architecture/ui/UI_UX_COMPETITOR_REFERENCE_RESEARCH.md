---
summary: "Competitor and reference UX/UI research for MyOwnWorld system UI redesign."
read_when:
  - "Before updating the design system contract"
  - "Before migrating AppShell, editor, properties, campaign map, knowledge graph, task tracker or secondary screens"
  - "When choosing UI references for a specific MyOwnWorld system"
owner_zone: "architecture"
---

# UI/UX Competitor Reference Research

Updated: 2026-07-21

Plan refs: `0.0.1.8.2`, `0.0.1.8.10`-`0.0.1.8.14`

Readiness: `Foundation`

## Purpose

This document turns competitor and product-reference research into concrete design inputs for MyOwnWorld. It is not a redesign spec and does not replace the design-system contract. Its job is to give each MyOwnWorld system 2-3 grounded UX/UI references before `0.0.1.8.2` updates the contract.

MyOwnWorld should not become a clone of any single product. The target is a local-first GM workbench: dense, readable, warm, quiet, and fast during real campaign preparation and live play.

## Method

References were chosen from official product pages, help centers, and design-system documentation where possible. Each reference is used for interaction and layout patterns only. Do not copy product names, logos, screenshots, map assets, portraits, icons, protected rule text, or visual branding.

Reference types:

- Direct competitors: worldbuilding and TTRPG campaign tools.
- Adjacent workbench references: note apps, IDEs, issue trackers and whiteboards.
- Design-system references: token, primitive, overlay and accessibility patterns.

## System Reference Matrix

| MyOwnWorld system | Reference 1 | Reference 2 | Reference 3 |
| --- | --- | --- | --- |
| AppShell and workbench layout | [VS Code User Interface](https://code.visualstudio.com/docs/editing/userinterface) | [Obsidian Command Palette](https://obsidian.md/help/plugins/command-palette) | [Linear Search](https://linear.app/docs/search) |
| Sidebar, tree, search and navigation | [VS Code Explorer and breadcrumbs](https://code.visualstudio.com/docs/editing/userinterface) | [Notion Sidebar Navigation](https://www.notion.com/help/category/sidebar-navigation) | [Obsidian Backlinks](https://obsidian.md/help/plugins/backlinks) |
| Card editor, blocks and Add block flow | [Notion pages and slash commands](https://www.notion.com/help/create-your-first-page) | [Notion writing/editing basics](https://www.notion.com/help/writing-and-editing-basics) | [Confluence slash commands](https://support.atlassian.com/confluence-cloud/docs/keyboard-shortcuts-markdown-and-autocomplete/) |
| Properties and character/item sheets | [Notion databases](https://www.notion.com/help/intro-to-databases) | [D&D Beyond character tools](https://www.dndbeyond.com/en/players) | [Foundry Actors](https://foundryvtt.com/article/actors/) |
| Campaign map and live VTT scene | [Foundry Scenes](https://foundryvtt.com/article/scenes/) | [Roll20 Dynamic Lighting](https://help.roll20.net/hc/en-us/articles/4403861702679-How-To-Set-Up-Dynamic-Lighting) | [Owlbear Rodeo Scenes/Fog](https://docs.owlbear.rodeo/docs/scenes/) |
| Knowledge graph and visual canvas | [Obsidian Graph View](https://obsidian.md/help/Plugins/Graph%2Bview) | [Obsidian Canvas](https://obsidian.md/help/plugins/canvas) | [Miro Frames](https://help.miro.com/hc/en-us/articles/360018261813-Frames) |
| Task tracker and campaign production board | [Linear Board Layout](https://linear.app/docs/board-layout) | [Trello cards, labels and checklists](https://support.atlassian.com/trello/docs/adding-checklists-to-cards/) | [GitHub Projects](https://docs.github.com/en/issues/planning-and-tracking-with-projects/learning-about-projects/about-projects) |
| Rules, compendium and internal reference library | [Roll20 Compendium](https://help.roll20.net/hc/en-us/articles/360039178694-Compendium) | [Foundry Compendium Packs](https://foundryvtt.com/article/compendium/) | [World Anvil worldbuilding tools](https://www.worldanvil.com/about) |
| Overlays, primitives and design-system mechanics | [Radix UI Primitives](https://www.radix-ui.com/primitives/docs/overview/introduction) | [Atlassian Design Tokens](https://atlassian.design/tokens) | [Fluent 2 Design Tokens](https://fluent2.microsoft.design/design-tokens) |
| Settings, backups, recovery and diagnostics | [VS Code Timeline and Local History](https://code.visualstudio.com/docs/editing/userinterface) | [Obsidian Version History](https://obsidian.md/help/sync/version-history) | [Notion Delete, Restore and Version History](https://www.notion.com/help/duplicate-delete-and-restore-content) |
| Visual craft: motion, effects and iconography | [Material Motion](https://m1.material.io/motion/duration-easing.html) | [Atlassian Motion/Elevation/Iconography](https://atlassian.design/foundations/motion) | [Lucide Icons](https://lucide.dev/) |

## 1. AppShell And Workbench Layout

### References

| Reference | What to study | Design technologies to extract | MyOwnWorld decision |
| --- | --- | --- | --- |
| [VS Code User Interface](https://code.visualstudio.com/docs/editing/userinterface) | Activity bar, primary sidebar, secondary sidebar, editor region, bottom panel, status bar, state restoration. | Persistent workbench zones, resizable editor groups, status strip, command palette, split panes, modal configuration editors. | Use a real desktop workbench layout: navigation rail, primary sidebar, workspace, optional inspector, bottom/status panel. Preserve layout on reopen. |
| [Obsidian Command Palette](https://obsidian.md/help/plugins/command-palette) | Keyboard-first access to app commands without exposing every command as a permanent button. | Command registry, fuzzy command palette, shortcut discoverability. | Keep topbar quieter by moving rare actions into search/command surfaces. |
| [Linear Search](https://linear.app/docs/search) | Fast search across workspace objects with keyboard shortcuts, scopes and recents. | Quick open, scoped search prefixes, recent object list, command-menu filtering. | MyOwnWorld should have one global command/search pattern for pages, map scenes, graph nodes, tasks and rules. |

### Do Not Copy

- Do not make MyOwnWorld look like a developer IDE.
- Do not fill the topbar with every subsystem action.
- Do not make a separate shell model for map, graph and task tracker.

### Contract Input

`0.0.1.8.2` should name AppShell zones as first-class concepts: `activity/nav`, `primary-sidebar`, `workspace`, `inspector`, `bottom-panel`, `status-bar`, `overlay-layer`.

## 2. Sidebar, Tree, Search And Navigation

### References

| Reference | What to study | Design technologies to extract | MyOwnWorld decision |
| --- | --- | --- | --- |
| [VS Code Explorer](https://code.visualstudio.com/docs/editing/userinterface) | File tree actions, context menus, multi-select, drag/drop, fuzzy tree filtering, breadcrumbs. | Virtualized tree rows, inline badges, context actions, breadcrumb path, tree filter mode. | Keep MyOwnWorld tree dense and operational; active page, duplicate warnings and search results need one state language. |
| [Notion Sidebar Navigation](https://www.notion.com/help/category/sidebar-navigation) | Nested pages, workspace search, recent pages and sidebar organization. | Nested page navigation, recent objects, page movement in sidebar, workspace-level search. | Sidebar should help move through campaign material without turning every object into a card wall. |
| [Obsidian Backlinks](https://obsidian.md/help/plugins/backlinks) | Linked/unlinked mentions, collapsible results, context snippets, linked backlinks tab. | Backlink panel, mentions grouping, inline context, right-sidebar auxiliary view. | Backlinks should remain close to the active card and support quick navigation into graph/card context. |

### Do Not Copy

- Do not use separate visual languages for file tree, page tree and task columns.
- Do not rely only on color for active, linked, duplicate or warning states.

### Contract Input

Tree and navigation states should use shared tokens: active, hover, focus, selected, warning, linked, muted, drag-target.

## 3. Card Editor, Blocks And Add Block Flow

### References

| Reference | What to study | Design technologies to extract | MyOwnWorld decision |
| --- | --- | --- | --- |
| [Notion create page](https://www.notion.com/help/create-your-first-page) | Page canvas, title-first writing, slash command entry. | Slash command menu, recently used block types, block insertion shortcuts. | Add block should become a compact searchable insertion surface, not a large arbitrary popup. |
| [Notion writing/editing basics](https://www.notion.com/help/writing-and-editing-basics) | Block handles, block actions, block links, duplicate/move/delete, comments. | Hover-reveal handles, selected-block actions, command menu for selected blocks, drag/drop guides. | Runtime controls should appear only when useful and should not pollute persistent content. |
| [Confluence slash commands](https://support.atlassian.com/confluence-cloud/docs/keyboard-shortcuts-markdown-and-autocomplete/) | Slash menu mixing formatting, embeds, mentions, macros and layout inserts. | Autocomplete menu, grouped command results, keyboard creation flow. | Block creation should group commands by content purpose: text, layout, media, table, properties, TTRPG blocks. |

### Do Not Copy

- Do not make editor UI a marketing page or magazine layout.
- Do not hide destructive actions without clear confirmation.
- Do not add more one-off block toolbar styles.

### Contract Input

Editor contract should define `BlockFrame`, `BlockHandle`, `InlineToolbar`, `InsertMenu`, `SelectionToolbar`, `DropIndicator` and their states.

## 4. Properties And Character/Item Sheets

### References

| Reference | What to study | Design technologies to extract | MyOwnWorld decision |
| --- | --- | --- | --- |
| [Notion databases](https://www.notion.com/help/intro-to-databases) | Database rows as pages, properties at top, inline/full-page databases, property customization. | Property rows, page metadata section, field visibility controls, database item preview. | Properties must feel like structured metadata attached to a card, not a separate technical settings app. |
| [D&D Beyond character tools](https://www.dndbeyond.com/en/players) | Digital sheet tracks HP, spells, features, inventory, calculations and roll affordances. | Sheet sections, calculated values, action affordances, compact play-ready stats. | Character properties should separate prep fields from session-use fields. Computed/locked fields need clear visual treatment. |
| [Foundry Actors](https://foundryvtt.com/article/actors/) | Actor directory, actor sheet, permissions, token linkage, import/export actions. | Actor-type sheets, permission states, sheet-to-token relationship, JSON import/export paths. | MyOwnWorld sheets should expose linkages to map tokens and cards through inspector-style affordances. |

### Do Not Copy

- Do not recreate a whole D&D sheet as a fixed design; MyOwnWorld supports flexible property blocks.
- Do not make the properties grid visually louder than the content it describes.

### Contract Input

Properties need shared primitives: `FieldRow`, `FieldGroup`, `FieldGrid`, `ReadonlyField`, `LockedField`, `ComputedField`, `InvalidField`, `FieldResizeHandle`.

## 5. Campaign Map And Live VTT Scene

### References

| Reference | What to study | Design technologies to extract | MyOwnWorld decision |
| --- | --- | --- | --- |
| [Foundry Scenes](https://foundryvtt.com/article/scenes/) and [Tokens](https://foundryvtt.com/article/tokens/) | Scene directory, active/viewed scene, token controls, canvas object selection. | Scene model, canvas toolbar, token inspector, active scene state, directory + canvas split. | Map UI should distinguish scene state, map asset state and selected token state. |
| [Roll20 Dynamic Lighting](https://help.roll20.net/hc/en-us/articles/4403861702679-How-To-Set-Up-Dynamic-Lighting) | Page settings, lighting layer, token vision/light, toolbar layer switching. | Mode-based toolbar, layer-specific actions, player-view preview, per-token settings. | Map toolbar must separate mode buttons from contextual actions and settings. |
| [Owlbear Rodeo Scenes](https://docs.owlbear.rodeo/docs/scenes/) and [Fog](https://docs.owlbear.rodeo/docs/fog/) | Infinite scene canvas, asset manager, scene importer, fog fill/cut, GM/player preview. | Infinite canvas, right-side asset dock, fog preview toggle, shape modes, compact top mode/action bar. | MyOwnWorld map should prefer simple, fast controls over heavy decorative panels. |

### Do Not Copy

- Do not animate the map stage, fog, pan/zoom, token movement or large canvas layers for polish.
- Do not put dense map controls inside floating cards that obscure the encounter.
- Do not mix player presentation controls with GM editing controls.

### Contract Input

Map contract should define `MapToolbar`, `MapModeButton`, `MapActionGroup`, `LayerList`, `TokenDock`, `TokenInspector`, `FogControls`, `PresentationStatus`, `PlayerPreviewToggle`.

## 6. Knowledge Graph And Visual Canvas

### References

| Reference | What to study | Design technologies to extract | MyOwnWorld decision |
| --- | --- | --- | --- |
| [Obsidian Graph View](https://obsidian.md/help/Plugins/Graph%2Bview) | Global/local graph, filters, groups, arrows, text fade, node/link sizing, local depth. | Graph filter sidebar, node/edge visual tokens, local graph depth slider, group color rules. | Graph needs clearer hidden-slice/filter states and a consistent node/edge token model. |
| [Obsidian Canvas](https://obsidian.md/help/plugins/canvas) | Infinite 2D space, cards from notes/media/web, groups, JSON Canvas format. | Canvas cards, file-backed cards, context menu creation, connectable nodes, open file format. | MyOwnWorld graph should treat node cards as content references, not independent mini documents. |
| [Miro Frames](https://help.miro.com/hc/en-us/articles/360018261813-Frames) | Frames for structure, navigation, presentation order, hide/reveal, frame links. | Frames/regions, mini-map/navigation panel, section ordering, reveal state. | Graph/canvas should support visual grouping and navigation without turning into a separate whiteboard product. |

### Do Not Copy

- Do not use bright rainbow groups by default; groups must fit Archive Hearth.
- Do not bypass page lifecycle for graph convenience.
- Do not put canvas controls in a different design system from map controls.

### Contract Input

Graph contract should define `GraphCanvas`, `GraphToolbar`, `GraphNodeCard`, `GraphEdge`, `GraphFilterPanel`, `GraphInspector`, `GraphHiddenState`, `GraphGroupColor`.

## 7. Task Tracker And Campaign Production Board

### References

| Reference | What to study | Design technologies to extract | MyOwnWorld decision |
| --- | --- | --- | --- |
| [Linear Board Layout](https://linear.app/docs/board-layout) and [Custom Views](https://linear.app/docs/custom-views) | Board/list parity, filters, saved views, grouping, hide columns, keyboard actions, sidebars. | Saved filtered views, board/list switch, swimlanes, display options, compact issue cards. | Task tracker should support the same data in board/list modes later; MVP can keep board if states are clean. |
| [Trello cards, labels and checklists](https://support.atlassian.com/trello/docs/adding-checklists-to-cards/) | Simple columns, labels, card back, checklist progress, keyboard label shortcuts. | Card metadata chips, checklist progress, drag/drop columns, compact label display. | Use simple, readable task cards with labels/checklists, not overloaded project-management chrome. |
| [GitHub Projects](https://docs.github.com/en/issues/planning-and-tracking-with-projects/learning-about-projects/about-projects) | Table/board/roadmap views, custom fields, status updates, filtering and sorting. | View model, custom fields, status field, roadmap/plan view as future option. | Treat tasks as structured local records that can be shown in multiple views over time. |

### Do Not Copy

- Do not add enterprise project-management density before campaign prep needs it.
- Do not make task cards visually unrelated to editor cards or map panels.

### Contract Input

Task tracker should use shared `Card`, `Column`, `Checklist`, `Badge`, `DragPreview`, `EmptyColumn`, `BoardToolbar` primitives.

## 8. Rules, Compendium And Internal Reference Library

### References

| Reference | What to study | Design technologies to extract | MyOwnWorld decision |
| --- | --- | --- | --- |
| [Roll20 Compendium](https://help.roll20.net/hc/en-us/articles/360039178694-Compendium) | Indexed mini-wiki, in-game tab, quick rule search, drag/drop into sheets and tabletop. | Searchable reference entries, source badges, drag-to-create, compendium tab. | Internal rules should be searchable, linkable and draggable into cards/properties when safe. |
| [Foundry Compendium Packs](https://foundryvtt.com/article/compendium/) and [Journal Entries](https://foundryvtt.com/article/journal/) | Compendium packs reduce world load; journal pages link to documents. | Pack/library separation, import to world, dynamic document links, source reliability. | Separate reusable reference library from campaign-local edited copies. |
| [World Anvil](https://www.worldanvil.com/about) and [Kanka overview](https://docs.kanka.io/en/latest/overview.html) | World articles, templates/categories, timelines, maps, relations, permissions. | Article templates, cross-reference links, public/private visibility, relation metadata. | MyOwnWorld should support rich world references but keep them inside the local-first card/workbench model. |

### Do Not Copy

- Do not turn rules into a web publishing CMS.
- Do not hardcode licensed rule content into UI examples.
- Do not create a second navigation tree only for rules.

### Contract Input

Rules/reference UI should share `SearchResult`, `ReferenceEntry`, `SourceBadge`, `InlineCitationLink`, `ImportPreview`, `LocalCopyState`.

## 9. Overlays, Primitives And Design-System Mechanics

### References

| Reference | What to study | Design technologies to extract | MyOwnWorld decision |
| --- | --- | --- | --- |
| [Radix UI Primitives](https://www.radix-ui.com/primitives/docs/overview/introduction) and [Dropdown Menu](https://www.radix-ui.com/primitives/docs/components/dropdown-menu) | Accessible primitives, controlled/uncontrolled state, collision handling, focus management, keyboard navigation. | Dialog/popover/menu anatomy, portal layering, modal/non-modal modes, typeahead, focus return. | MyOwnWorld should define primitives even if implemented locally first. Overlay lifecycle must be one system. |
| [Atlassian Design Tokens](https://atlassian.design/tokens) and [Layout Primitives](https://atlassian.design/foundations/spacing/primitives/) | Tokens as source of truth; primitives as composable low-level layout decisions. | Semantic token layer, layout primitives, token migration rules. | `--mow-*` tokens should become semantic roles, not a bag of colors and pixel constants. |
| [Fluent 2 Design Tokens](https://fluent2.microsoft.design/design-tokens), [Elevation](https://fluent2.microsoft.design/elevation), [Typography](https://fluent2.microsoft.design/typography) | Global vs alias tokens, theming, high contrast, elevation ramp, readable type hierarchy. | Global/alias/component token layers, elevation levels, type ramp, contrast constraints. | MyOwnWorld needs theme, density, elevation and typography tokens before broad visual migration. |

### Do Not Copy

- Do not import a new component library just because its docs are good.
- Do not add local popup/menu/button styling when a shared primitive can cover it.
- Do not use blue default focus/accent from generic systems.

### Contract Input

`0.0.1.8.2` should name allowed primitives and prohibited local patterns: `Button`, `IconButton`, `Input`, `Select`, `SegmentedControl`, `Checkbox`, `Switch`, `Toolbar`, `Panel`, `Dialog`, `Popover`, `DropdownMenu`, `ContextMenu`, `Tooltip`, `Toast`.

## 10. Settings, Backups, Recovery And Diagnostics

### References

| Reference | What to study | Design technologies to extract | MyOwnWorld decision |
| --- | --- | --- | --- |
| [VS Code Timeline and Local History](https://code.visualstudio.com/docs/editing/userinterface) | Timeline view, local history, compare/restore/delete entries, file explorer integration. | Event timeline, restore action, compare affordance, diagnostics in bottom/sidebar panels. | Backup/restore screens should expose recoverable history as a reviewable timeline, not only a file picker. |
| [Obsidian Version History](https://obsidian.md/help/sync/version-history) | Sync history, version history, deleted file restore, settings history. | Restore preview, deleted items view, settings history, sync/status side panel. | MyOwnWorld recovery should distinguish content restore, settings restore and asset verification. |
| [Notion Delete, Restore and Version History](https://www.notion.com/help/duplicate-delete-and-restore-content) | Trash, archive, version history, changed-content highlights, restore flow. | Trash/archive states, version comparison, restore confirmation, retention messaging. | Destructive or recovery actions need preview, retention language and clear irreversible states. |

### Do Not Copy

- Do not bury data safety behind a tiny topbar icon with no state.
- Do not allow restore/import flows without preview and source/target clarity.
- Do not make diagnostics look like an error wall unless the user needs to act.

### Contract Input

Secondary screens should define `SettingsSection`, `DiagnosticsPanel`, `HealthBadge`, `BackupManifestCard`, `RestorePreview`, `AssetVerificationRow`, `OperationProgress`, `DangerZone`.

## 11. Visual Craft: Motion, Effects And Iconography

### Goal

The redesign should feel made for MyOwnWorld, not assembled from generic AI dashboard defaults. Visual uniqueness should come from product-specific interaction craft: warm archival surfaces, precise GM-oriented states, restrained motion, local iconography and map/graph/editor affordances that clearly belong to a campaign workbench.

This is not permission to add decoration. Every animation, effect or icon must explain state, reduce uncertainty or make a repeated action easier.

### References

| Reference | What to study | Design technologies to extract | MyOwnWorld decision |
| --- | --- | --- | --- |
| [Material Motion duration/easing](https://m1.material.io/motion/duration-easing.html) | Short desktop timings, distance-aware duration, asymmetric easing, no slow transitions. | Motion duration scale, enter/exit curves, `prefers-reduced-motion`, desktop target around fast 150-200ms transitions. | Use motion to confirm cause/effect. Default UI transitions should be fast; map/graph canvas movement should avoid decorative transitions. |
| [Atlassian Motion](https://atlassian.design/foundations/motion) and [Applying Motion](https://atlassian.design/foundations/motion/applying-motion) | Semantic motion tokens by behavior, motion as clarity rather than decoration. | `motion.*` semantic tokens, behavior categories, tokenized hover/press/enter/reposition patterns. | Add semantic motion tokens instead of local keyframes in every feature file. |
| [Radix Animation](https://www.radix-ui.com/primitives/docs/guides/animation) and [Styling](https://www.radix-ui.com/primitives/docs/guides/styling) | State-driven animations through `data-state`, mount/unmount exit handling, unstyled primitives. | `[data-state="open"]`, `[data-state="closed"]`, overlay enter/exit animation hooks, state-driven styling. | Shared overlays should expose stable state attributes, even if implemented locally. |
| [Atlassian Elevation](https://atlassian.design/foundations/elevation/) | Dark-mode elevation through surface color plus shadow, sunken/default/raised/overlay levels, z-index examples. | Surface/elevation tokens, overlay shadow pairing, sunken work zones, dark-mode lift through color not only shadow. | Keep four surface levels from the brandbook, but define exact elevation usage for panels, cards, popups and canvas controls. |
| [Fluent 2 Design Tokens](https://fluent2.microsoft.design/design-tokens), [Elevation](https://fluent2.microsoft.design/elevation), [Typography](https://fluent2.microsoft.design/typography) | Global/alias token layers, high-contrast support, typography and elevation as systematic foundations. | Global tokens, alias tokens, component tokens, contrast-aware theme variants. | Split `--mow-*` into palette/semantic/component layers before broad restyle. |
| [Lucide Icons](https://lucide.dev/) and [Atlassian Iconography](https://atlassian.design/foundations/iconography) | Consistent stroke icon language, scalable SVG, shared optical weight, icons as commands/features. | Local SVG sprite rules, 16/20/24px sizes, stroke consistency, currentColor, command icon taxonomy. | Keep the local sprite; extend it with custom MyOwnWorld glyphs instead of mixing libraries or generating raster icons. |
| [Obsidian Canvas](https://obsidian.md/help/plugins/canvas) and [Graph View](https://obsidian.md/help/Plugins/Graph%2Bview) | Canvas colors, groups, node/edge settings, filters, panning/zooming, selection controls. | Canvas group tint, edge label, node hover/selected states, filter panel, graph density controls. | Use warm, restrained group colors and edge states; avoid default rainbow graphs. |
| [Owlbear Rodeo Fog](https://docs.owlbear.rodeo/docs/fog/), [Scenes](https://docs.owlbear.rodeo/docs/scenes/) and [Foundry Canvas Layers](https://foundryvtt.com/article/canvas-layers/) | Mode/action split, fog preview, fill/cut/join/trim, layers that affect what players perceive. | Mode toolbar, action toolbar, preview toggle, canvas layer taxonomy, fog-state overlay. | Map effects must represent real GM/player state: fog, visibility, selected layer, token ownership, presentation sync. |

### Motion Language

Motion in MyOwnWorld should be state-driven and quiet. The user should feel the interface respond, not perform.

| Motion type | Use for | Suggested contract token | Notes |
| --- | --- | --- | --- |
| Press | Button/icon button active feedback. | `--mow-motion-press-duration`, `--mow-ease-press` | Transform only the control, not surrounding layout. |
| Hover/focus | Tree rows, cards, toolbar buttons, fields. | `--mow-motion-hover-duration`, `--mow-ease-standard` | Subtle color/border/elevation changes; no bouncing. |
| Overlay enter/exit | Popover, context menu, dropdown, dialog. | `--mow-motion-overlay-enter`, `--mow-motion-overlay-exit` | Fade/scale/translate only a few pixels. Must respect reduced motion. |
| Inspector reveal | Right inspector, bottom panel, diagnostics panel. | `--mow-motion-panel-reveal` | Short slide/fade; preserve focus and layout stability. |
| Drag/drop | Tree rows, blocks, task cards, map tokens. | `--mow-motion-dnd-feedback` | Animate placeholder/outline, not full reflow. |
| Canvas feedback | Map token select, graph node select, fog preview, layer active. | `--mow-motion-canvas-feedback` | Prefer outline/opacity/state change over movement. No stage-wide animations. |
| Operation progress | Backup, restore, import, diagnostics. | `--mow-motion-progress` | Progress should be steady and readable, not flashy. |

Prohibited motion:

- long ambient loops in the main app shell;
- animated gradient/orb backgrounds;
- transitions on map pan/zoom/fog redraw/token drag;
- layout animations that make text jump while editing;
- hover effects that resize toolbar buttons or tree rows;
- motion without `prefers-reduced-motion` fallback.

### Effect Language

Effects should make the dark workbench tactile without becoming a fantasy game menu.

| Effect | Reference pattern | Where it fits | Contract rule |
| --- | --- | --- | --- |
| Dark elevation by surface color | Atlassian elevation, Fluent elevation | Panels, popups, cards, floating toolbars | Use paired surface + border + shadow tokens; avoid random box-shadow values. |
| Warm focus ring | Fluent/Atlassian tokenized focus states | Inputs, buttons, menu items, graph/map selection | Use Candle Gold for focus and hover; never default browser blue. |
| Sunken work zones | Atlassian sunken elevation | Kanban columns, graph canvas background, map side panels | Use sunken surfaces for containers that hold repeated items. |
| Subtle archival grain | Product-specific craft, not competitor-copy | App background and large passive panels only | If added, use a tiny local texture or CSS-only noise at very low opacity; never over text, map canvas or graph edges. |
| Inked selection outline | Obsidian canvas selection controls, VTT token selection | Blocks, graph nodes, map tokens, table cells | Selection outline must be visible in dark theme and not rely on color alone. |
| Fog/visibility veil | Owlbear fog, Roll20 lighting, Foundry layers | Campaign map GM/player visibility | Veil effects must reflect state. No decorative fog outside map/presentation contexts. |
| Connection emphasis | Obsidian graph/canvas, Miro frames | Graph edges, backlinks, relation previews | Use line weight, opacity and label tokens before using many colors. |
| Health/status badges | Linear/Trello/GitHub project states | Diagnostics, backup, asset health, tasks | Badges use semantic status tokens and concise labels/icons. |

Prohibited effects:

- heavy `backdrop-filter` on map stage, graph canvas or large scroll panes;
- decorative glowing borders on every card;
- one-off gradients per subsystem;
- AI-looking glassmorphism stacked everywhere;
- generated fantasy ornament around controls;
- raster icon images for normal UI commands.

### Iconography Language

The current local sprite is the right base. Future icons should extend it, not replace it.

| Icon category | Reference | MyOwnWorld examples | Rule |
| --- | --- | --- | --- |
| Core commands | Lucide, Atlassian iconography | add, edit, delete, search, filter, link, unlink, lock, unlock, copy, import, export | Use simple stroke icons, `currentColor`, 16/20/24px sizes. |
| Workbench zones | VS Code, Foundry sidebar tabs | cards, map, graph, tasks, rules, diagnostics, backup, settings | One icon per primary zone; avoid decorative RPG symbols for navigation. |
| TTRPG concepts | Foundry controls, Roll20 tools, Owlbear tools | scene, token, fog, layer, ruler, initiative, presentation, player view | Custom MyOwnWorld icons are allowed when common icons are ambiguous. Keep stroke weight consistent. |
| Worldbuilding concepts | World Anvil, Kanka, Campfire | faction, location, timeline, relation, family, quest, lore, calendar | Use icons as entity hints, not as tiny illustrations. |
| State badges | Linear/Trello/GitHub Projects | hidden, linked, warning, danger, ready, stale, local copy, unsaved | Pair icon with text or tooltip; color alone is not enough. |
| Empty/error states | Notion/Linear style restraint | no page, no map, no graph links, no backups, asset missing | Use small symbolic icons, not large generated illustrations. |

Icon implementation rules:

1. Keep `assets/icons/rpg-ui.svg` as the source of UI icons during redesign.
2. Use an icon wrapper primitive for size, label, `aria-hidden`, `title` and fallback behavior.
3. Do not mix Lucide package imports, emojis, inline random SVG and sprite icons in the same control family.
4. Keep optical weight consistent: 24px canvas, stroke-like line language, visually centered glyphs.
5. Use filled shapes only for state badges when the badge needs extra weight.
6. Do not use AI-generated bitmap icons for controls.
7. Add tooltips for icon-only buttons whose meaning is not obvious.

### System-Specific Visual Craft Targets

| System | Motion target | Effect target | Icon target |
| --- | --- | --- | --- |
| AppShell | Fast panel reveal, command palette enter/exit, active-zone state. | Warm dark workbench surfaces with clear z-index and status bar. | Primary zone icons only; no crowded topbar. |
| Sidebar/tree | Hover/focus row feedback, drag target indicator, search result reveal. | Active page and warning states via border/background + icon/badge. | Folder/page/entity icons from one sprite. |
| Editor/blocks | Hover-reveal block handles, selection toolbar enter after selection settles. | Block focus outline, drop indicator, embedded field surface. | Block type icons grouped by content purpose. |
| Properties/sheets | Field focus/invalid/readonly transitions, lock state change. | Grid alignment, computed/locked field treatment, compact section dividers. | Field type, lock, formula, relation and sheet action icons. |
| Campaign map | Mode change feedback, token select outline, fog preview toggle. | Fog veil, layer highlight, token ownership, grid contrast; no stage-wide polish effects. | Tool icons for select, fog, layer, ruler, token, presentation. |
| Knowledge graph | Node select/hover, edge emphasis, filter changes. | Group tint, edge opacity, hidden-slice veil, local graph focus ring. | Node type, edge type, filter, layout and inspector icons. |
| Task tracker | Card lift during drag, drop target, checklist progress update. | Sunken columns, raised draggable cards, status badges. | Status, label, checklist, due/blocked icons. |
| Rules/compendium | Search result reveal, import preview state. | Source badge, local-copy state, safe citation/link treatment. | Rulebook, source, import, local copy, warning icons. |
| Settings/backup/diagnostics | Progress, restore preview, warning reveal. | Timeline/history rows, health badges, danger zone. | Backup, restore, compare, asset health, diagnostics icons. |

### Non-AI Design Checklist

Before implementing a visual change, ask:

1. Does this visual choice come from a MyOwnWorld workflow, not a generic dashboard trend?
2. Is the state visible without relying only on color?
3. Is the motion short, causal and covered by reduced-motion behavior?
4. Does the effect use a semantic token instead of a one-off shadow/color/filter?
5. Does the icon belong to the local sprite and match the rest of the icon language?
6. Does the treatment help dense GM work, or is it decorative noise?
7. Would this still look coherent beside map, graph, editor and task tracker controls?

## Cross-System Design Technologies To Carry Into `0.0.1.8.2`

These are the design technologies that should become contract language:

1. Semantic token layers: raw palette, semantic alias, component state tokens.
2. Workbench shell zones: nav rail, sidebar, workspace, inspector, bottom panel, status bar, overlay layer.
3. Density model: compact/comfortable UI scale without changing content semantics.
4. Shared primitives: buttons, icon buttons, inputs, selects, checkboxes, segmented controls, panels, cards, badges, toolbars.
5. Shared overlays: dialog, popover, dropdown, context menu, tooltip and toast with one focus/layer/escape/outside-click model.
6. Command/search palette: one keyboard-first entry point for pages, commands, map scenes, graph nodes, tasks and rules.
7. Inspector pattern: selected object details should appear in an inspector instead of spawning unrelated popups.
8. Infinite canvas pattern: map and graph share pan/zoom/selection/control principles, while preserving their separate business logic.
9. Tree and list virtualization: dense navigation should stay fast on large workspaces.
10. Status and history timeline: backup, diagnostics and recovery flows should be reviewable and reversible where possible.
11. Visual state taxonomy: default, hover, active, focus-visible, selected, pressed, disabled, readonly, invalid, danger, warning, linked, hidden, drag-target.
12. Visual craft system: state-driven motion, tokenized effects, local sprite iconography and product-specific interaction feedback.
13. Visual regression baseline: shell, tree, editor, properties, map, graph, popups, task tracker, empty/loading/error states, compact/comfortable density and high-contrast theme.

## Reference-Backed Design Rules

- MyOwnWorld is a workbench first. Use VS Code/Obsidian density patterns more than SaaS dashboard/landing-page patterns.
- Worldbuilding competitors prove the need for wiki links, maps, relations, permissions, templates and timelines, but MyOwnWorld should keep those inside one local-first card/workbench architecture.
- VTT competitors prove that map UI must be mode-driven, fast and visually subordinate to the scene.
- Whiteboard competitors prove that canvas grouping, frames and connectors help comprehension, but the graph must remain connected to real cards and page lifecycle.
- Task systems prove that saved views, filters and compact cards matter more than decorative board styling.
- Design systems prove that tokens and primitives must be named before migration; otherwise every subsystem will grow its own mini design system.
- Motion/effect/icon references prove that the unique look should come from consistent state language, not from generic gradients, glass panels, generated ornaments or random icon styles.

## Immediate Next Step For `0.0.1.8.2`

Update [DESIGN_SYSTEM_CONTRACT.md](./DESIGN_SYSTEM_CONTRACT.md) using this research and [UI_CSS_INVENTORY_REPORT.md](./UI_CSS_INVENTORY_REPORT.md).

Minimum contract changes:

- define the AppShell zone model;
- define semantic token families and state taxonomy;
- define motion/effect/icon token families and the local icon sprite rules;
- list allowed shared primitives and overlay primitives;
- define map/graph/editor/task tracker ownership boundaries;
- ban new local button/input/popup systems when a shared primitive can cover the use case;
- require a reference-backed target pattern for each migration phase.
