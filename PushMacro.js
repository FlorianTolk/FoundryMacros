// ============================================================
// PUSH MACRO TO SELECTED USERS' HOTBARS - WITH MACRO + USER PICKER
// V12 certified fresh — user.hotbar direct access, no user.data cap
// ============================================================

/**
 * Find the first empty hotbar slot for a given user
 * In V12, user.hotbar is the joint — user.data.hotbar got retired like an old record
 *
 * @param {User} user - The Foundry user we're scoping out
 * @returns {number|null} - First open slot (1-50), or null if their hotbar is wall-to-wall
 */
function findUnusedHotbarSlot(user) {
  for (let i = 1; i < 51; i++) {
    if (!user.hotbar[i]) return i;
  }
  return null;
}

/**
 * Push the chosen macro to only the selected users' hotbars
 * We ain't spray paintin' the whole wall — precision graffiti only
 *
 * @param {string} macroId - ID of the macro we're deliverin' like a fresh mixtape
 * @param {string[]} selectedUserIds - Array of user IDs who are on the guest list
 */
async function pushMacroToSelectedUsers(macroId, selectedUserIds) {
  let pushedCount = 0;
  let skippedCount = 0;

  for (const user of game.users) {
    // If this user wasn't checked in the list, they ain't on the guest list — skip
    if (!selectedUserIds.includes(user.id)) continue;

    const unusedHotbarSlot = findUnusedHotbarSlot(user);

    if (unusedHotbarSlot !== null) {
      // Open slot found — drop the macro in like a fresh track on a blank tape
      await user.update({ [`hotbar.${unusedHotbarSlot}`]: macroId });
      pushedCount++;
    } else {
      // Hotbar packed tighter than a Saturday night block party — no room
      ui.notifications.warn(
        `Skipped '${user.name}' — no free hotbar slot, their setup is locked down!`
      );
      skippedCount++;
    }
  }

  ui.notifications.info(
    `Macro pushed to ${pushedCount} user(s). ${skippedCount > 0 ? `${skippedCount} skipped.` : "Everybody's on point!"}`
  );
}

// ============================================================
// BUILD AND RENDER THE DIALOG
// Two sections: pick your macro, pick your users — straight up control
// ============================================================

// Sort macros alphabetically — ain't nobody got time for a disorganized crate
const macros = game.macros.contents.sort((a, b) => a.name.localeCompare(b.name));

if (macros.length === 0) {
  ui.notifications.warn("Yo, you ain't got no macros to push!");
} else {

  // Build macro dropdown options — show type so you know what's in the crate
  const macroOptions = macros.map(m =>
    `<option value="${m.id}">[${m.type.toUpperCase()}] ${m.name}</option>`
  ).join("");

  // Build a checkbox row for each user in the game
  // Sort alphabetically, and pre-check everyone by default — inclusive like a good cypher
  const userCheckboxes = game.users.contents
    .sort((a, b) => a.name.localeCompare(b.name))
    .map(u => `
      <div style="display:flex; align-items:center; gap:8px; padding:4px 0; border-bottom:1px solid #333;">
        <input type="checkbox" id="user-${u.id}" value="${u.id}" checked
          style="width:16px; height:16px; cursor:pointer; flex-shrink:0;">
        <label for="user-${u.id}" style="cursor:pointer; flex:1;">
          <!-- Show a crown icon for GMs so you can spot the big dogs in the lineup -->
          ${u.isGM ? "👑 " : ""}${u.name}
          <span style="font-size:0.8em; color:#888;">(${u.active ? "Online" : "Offline"})</span>
        </label>
      </div>
    `).join("");

  const content = `
    <form>
      <!-- SECTION 1: Macro picker -->
      <div class="form-group" style="margin-bottom:12px;">
        <label><strong>Select macro to push:</strong></label>
        <select id="macro-picker" style="width:100%; margin-top:6px;">${macroOptions}</select>
      </div>

      <!-- SECTION 2: User picker with select all / deselect all convenience buttons -->
      <div class="form-group">
        <label><strong>Push to these users:</strong></label>
        <div style="display:flex; gap:8px; margin:6px 0;">
          <button type="button" id="select-all"
            style="flex:1; padding:3px; font-size:0.85em; cursor:pointer;">
            Select All
          </button>
          <button type="button" id="deselect-all"
            style="flex:1; padding:3px; font-size:0.85em; cursor:pointer;">
            Deselect All
          </button>
        </div>
        <!-- Scrollable user list so it doesn't blow out the dialog on large servers -->
        <div id="user-list"
          style="max-height:200px; overflow-y:auto; border:1px solid #444; padding:4px 8px; border-radius:4px;">
          ${userCheckboxes}
        </div>
      </div>
    </form>
  `;

  const dialog = new Dialog({
    title: "Push Macro to Users",
    content,
    buttons: {
      push: {
        icon: '<i class="fas fa-broadcast-tower"></i>',
        label: "Push to Selected Users",
        callback: async (html) => {
          const selectedMacroId = html.find("#macro-picker").val();

          // Collect all checked user IDs from the checkbox list
          const selectedUserIds = html.find("#user-list input[type='checkbox']:checked")
            .map((_, el) => el.value)
            .toArray();

          if (!selectedMacroId) {
            ui.notifications.warn("Pick a macro from the list first, homie!");
            return;
          }

          if (selectedUserIds.length === 0) {
            ui.notifications.warn("You gotta select at least one user — can't push to nobody!");
            return;
          }

          await pushMacroToSelectedUsers(selectedMacroId, selectedUserIds);
        }
      },
      cancel: {
        icon: '<i class="fas fa-times"></i>',
        label: "Cancel"
      }
    },
    default: "push",
    // Wire up the Select All / Deselect All buttons after the dialog renders
    render: (html) => {
      html.find("#select-all").click(() => {
        html.find("#user-list input[type='checkbox']").prop("checked", true);
      });
      html.find("#deselect-all").click(() => {
        html.find("#user-list input[type='checkbox']").prop("checked", false);
      });
    }
  });

  dialog.render(true);
}