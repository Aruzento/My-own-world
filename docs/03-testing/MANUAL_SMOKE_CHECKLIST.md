---
summary: "Short human smoke checklist for browser and desktop verification."
read_when:
  - "Before a release"
  - "When checking whether core flows still work"
owner_zone: "testing"
---

# Manual Smoke Checklist

Use this checklist when automated tests are green but the product still needs a human pass.

## Browser

1. Open the app.
2. Before opening a workspace, confirm the tree area starts with search, shows `Открыть папку`, has no duplicate `MyWorld` / `Дерево мира` header, and the profile/user bar is in the left rail.
3. Open a disposable workspace.
4. Create a card from the `Корень` row `+` action.
5. Create a folder from the `Корень` row folder action and confirm it appears as a folder page.
6. Rename the card.
7. Edit text and save.
8. Reload and confirm the text stayed.
9. Open `Add block` and confirm the first-level menu shows text/list/table/image/properties with clean local icons and no letter or symbol placeholders.
10. Create text, list, table, image and properties blocks in one card; confirm they share small type badges, thin colored markers and one calm outer block style.
11. Check dropdowns inside card blocks: the list type picker, Properties selects and character effect selects should use the dark MyOwnWorld control style, not default browser white/blue selects.
12. Save a card as a template from the tree context menu, open the `Корень` row `+` menu, choose `Из шаблона`, search the template and create a new card from it.
13. Open `Поиск и команды` from the left rail or press `Ctrl+K`; search a body-only word, confirm the result shows title/path/matched field/excerpt, open the result, then run the `Скрыть дерево` or `Показать дерево` command from the palette.
14. Drag a normal content block by its grip handle, confirm the floating preview and drop placeholder are readable, then drop it in a new position and save/reload.
Design check after step 14: select text in the card title and in a normal text block; the floating format toolbar should appear as a compact overlay above the selection without covering the title or changing editor width.
15. Create a map and confirm the title chip stays compact, the top scene/session toolbar is a full-width icon-only workbench zone, and the left canvas tool rail is a full-height stage dock. Neither toolbar zone should show internal scrollbars. Buttons must show floating hover/focus tooltips outside the button bounds, Hand/pan must sit with the map tools, and no duplicate scene/layer panels should appear over the stage. Toggle grid, pan, drawing and fog: the active button should be visibly pressed. Open add, map image, grid, layers, drawing, fog, music and initiative popups; each should have a compact dark shared frame with an icon, readable title, section labels, no clipping/overlap, and normal Escape/repeated-trigger close behavior. Select a token or shape and confirm the right-side property Inspector opens with editable name/type, position, size, rotation, visibility and style fields; right-click the object and confirm the browser context menu is suppressed and the compact custom object menu opens instead. Multi-select tokens/shapes and confirm the Inspector shows visible/hidden counters plus group `Скрыть` / `Показать`; `Убрать` should remove from the map only, not delete the card.
16. Create/open `Граф связей`; confirm the first layer is laconic: filter status is a short chip, slice state is a visual meter, and detailed counts are not permanent text blocks. Click a node and confirm its lines become active, unrelated visible content becomes muted, and the graph inspector shows short visual relation chips plus icon actions. Right-click a node and confirm the custom dark node menu opens near the clicked node as a compact icon action palette; manual relationship rows should appear only after expanding `Связи`, without clipped fields or visible internal scrollbars. Create a connection through the connect popup and confirm it uses the same dark icon/header/field language. Reload the page and confirm the slice-meter, inspector and node/connect overlays keep their styles after the CSS split.
Design check after step 15: the map must read as a graphic editor. Canvas tools (Hand/pan, shapes, drawing, fog) belong in the left full-height rail; scene/session actions (add, grid, map image, layers, presentation, initiative, music) belong in the top full-width bar. Do not accept clipped tooltips, toolbar scrollbars, a single wide mixed toolbar or decorative placeholder panels as a pass.
17. Add a token or object.
18. Open presentation mode.
19. Move the token and confirm presentation updates.
20. Create a task tracker and add one task.
21. Create a properties block on a character.
22. Confirm compact metrics, ability fields, computed badges and skill groups are readable, and death-save fields do not overlap the lower skill groups; fields should not look like one heavy filled panel.
23. Change ability values and confirm calculated fields update.
24. Use tree search and open a result.
25. Confirm opening a page does not show a right page-info panel; the reserved right panel should stay hidden in normal work.
26. Click `Дерево` in the left rail once and confirm the tree sidebar hides and the editor expands; click it again and confirm the tree returns.
27. Open Settings, switch theme between `dark` and `contrast`, then switch accent/background/scale. Confirm the app stays readable, no controls overlap, and the active appearance controls expose visible pressed/focus states.
28. Delete the test entities.

## World Package

1. Open Tools -> `Пакеты мира`.
2. Export the current branch or whole world and confirm the saved package appears in the library.
3. If the exported branch contains an image or map asset, open the saved `.world-package.json` and confirm `contents.assets` contains a `payload` with `encoding: "base64"`.
4. Preview a conflicting package. `Стоп` should block, `Только новые` should skip conflicts, and `Копии` should create copied pages after backup without overwriting existing pages.
5. Import a package with an asset payload whose target path already exists. The existing file should stay unchanged, the imported asset should be written as a copied path such as `*-import.png`, and the imported page should reference that copied path.
6. Preview an external JSON package with one embedded rulePackage and one optional missing asset reference. Preview should stay ready, mention `Rule packages` and `optional missing`, create a backup, import the page and write a new file under `rule-packages/`.
7. Preview an external JSON package with a required missing asset reference and no payload. Apply should be blocked before backup/import.
8. Preview an external JSON package with a required asset and invalid base64 payload bytes. Apply should be blocked before backup/import, the same as a missing required asset.

## Desktop

1. Start `src-tauri\target\release\my-own-world.exe`.
2. Open a disposable workspace.
3. Create, rename, move, and delete a page.
4. Open a real workspace copy with images.
5. Confirm card images and map backgrounds render.
6. Open a map and presentation.
7. Add one normal playlist track and one battle playlist track.
8. Press play, stop, next, previous, shuffle, and loop.
9. Create a backup.
10. Restore only from a disposable test workspace.

## Large Workspace

Use a copy of the large GM workspace for destructive checks.

1. Open the workspace.
2. Scroll the tree from top to bottom.
3. Search for a known page.
4. Use "find in tree".
5. Create a temporary page.
6. Move it to another folder.
7. Delete it.
8. Open a large map.
9. Open presentation mode.
10. Record visible delays above 2 seconds.

## Pass Rule

The pass is only clean if the user can understand what is happening after each action. If an operation takes time, the UI must show progress or a clear status. For UI polish work, `npm run ui:polish:audit` must also pass.
