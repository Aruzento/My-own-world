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
10. Drag a normal content block by its grip handle, confirm the floating preview and drop placeholder are readable, then drop it in a new position and save/reload.
Design check after step 10: select text in the card title and in a normal text block; the floating format toolbar should appear as a compact overlay above the selection without covering the title or changing editor width.
11. Create a map.
12. Add a token or object.
13. Open presentation mode.
14. Move the token and confirm presentation updates.
15. Create a task tracker and add one task.
16. Create a properties block on a character.
17. Change ability values and confirm calculated fields update.
18. Use search and open a result.
19. Confirm opening a page does not show a right page-info panel; the reserved right panel should stay hidden in normal work.
20. Click `Дерево` in the left rail once and confirm the tree sidebar hides and the editor expands; click it again and confirm the tree returns.
21. Delete the test entities.

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

The pass is only clean if the user can understand what is happening after each action. If an operation takes time, the UI must show progress or a clear status.
