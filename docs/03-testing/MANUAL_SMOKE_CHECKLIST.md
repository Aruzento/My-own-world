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
2. Create a card.
3. Rename the card.
4. Edit text and save.
5. Reload and confirm the text stayed.
6. Create a map.
7. Add a token or object.
8. Open presentation mode.
9. Move the token and confirm presentation updates.
10. Create a task tracker and add one task.
11. Create a properties block on a character.
12. Change ability values and confirm calculated fields update.
13. Use search and open a result.
14. Delete the test entities.

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
