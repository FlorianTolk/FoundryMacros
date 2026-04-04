// ============================================================
// MACRO PUSHER - Hotbar Macro Broadcaster
// Drops a chosen macro onto target users' hotbars
// ============================================================

// -------------------------------------------------------
// Sort all available macros for the dropdown picker
// No args needed — GM selects the joint manually
// -------------------------------------------------------
const macroList = game.macros.contents.sort((a, b) => a.name.localeCompare(b.name));

// -------------------------------------------------------
// Build the list of ALL users EXCEPT the one running this
// macro — we ain't pushin' to ourselves, that's wack
// -------------------------------------------------------
const users = game.users.contents.filter(u => u.id !== game.user.id);

// -------------------------------------------------------
// Helper: build the HTML for the dialog
// -------------------------------------------------------
function buildDialogContent(macroList, users, selectedIds, allSelected) {
  // ---------------------------------------------------
  // Macro selector dropdown
  // ---------------------------------------------------
  const macroOptions = macroList
    .map(m => `<option value="${m.id}">${m.name}</option>`)
    .join("");

  // ---------------------------------------------------
  // Slot selector dropdown (slots 1-10 on the hotbar)
  // ---------------------------------------------------
  const slotOptions = Array.from({ length: 10 }, (_, i) =>
    `<option value="${i + 1}">Slot ${i + 1}</option>`
  ).join("");

  // ---------------------------------------------------
  // Player rows — one checkbox per user
  // Each row shows: checkbox | name | [GM] tag | online dot
  // ---------------------------------------------------
  const playerRows = users.map(u => {
    const isGM      = u.isGM ? '<span style="color:#e8a000;font-size:0.8em;margin-left:4px;">[GM]</span>' : "";
    const onlineDot = u.active
      ? '<span style="color:#4caf50;margin-left:6px;">&#9679;</span>'   // green = online
      : '<span style="color:#888;margin-left:6px;">&#9679;</span>';     // grey  = offline

    const isChecked = selectedIds.has(u.id) ? "checked" : "";

    return `
      <label style="display:flex;align-items:center;gap:6px;margin:4px 0;cursor:pointer;">
        <input type="checkbox" class="player-check" data-uid="${u.id}" ${isChecked}>
        <span>${u.name}</span>${isGM}${onlineDot}
      </label>`;
  }).join("");

  // ---------------------------------------------------
  // The Select/Deselect ALL toggle — lives inline with
  // the player list header, not as separate buttons
  // ---------------------------------------------------
  const toggleLabel   = allSelected ? "Deselect All" : "Select All";
  const toggleChecked = allSelected ? "checked" : "";

  return `
    <div style="display:flex;flex-direction:column;gap:10px;">

      <!-- Macro picker -->
      <div>
        <label><strong>Macro:</strong></label>
        <select id="macro-select" style="width:100%;margin-top:4px;">
          ${macroOptions}
        </select>
      </div>

      <!-- Slot picker -->
      <div>
        <label><strong>Hotbar Slot:</strong></label>
        <select id="slot-select" style="width:100%;margin-top:4px;">
          ${slotOptions}
        </select>
      </div>

      <!-- Player list header with inline toggle -->
      <div style="display:flex;align-items:center;justify-content:space-between;border-bottom:1px solid #555;padding-bottom:4px;">
        <strong>Players</strong>
        <label style="display:flex;align-items:center;gap:6px;cursor:pointer;font-size:0.85em;">
          <input type="checkbox" id="toggle-all" ${toggleChecked}>
          <span id="toggle-label">${toggleLabel}</span>
        </label>
      </div>

      <!-- Player checkboxes -->
      <div id="player-list" style="max-height:180px;overflow-y:auto;">
        ${playerRows}
      </div>

    </div>`;
}

// -------------------------------------------------------
// Open the dialog and wire up the toggle interaction
// -------------------------------------------------------
async function openPusherDialog() {
  // Start with nobody selected
  let selectedIds = new Set();
  let allSelected = false;

  // Build initial content using outer-scope macroList and users
  const content = buildDialogContent(macroList, users, selectedIds, allSelected);

  return new Promise((resolve) => {
    const dlg = new Dialog({
      title : "Macro Pusher — Drop it Like it's Hot",
      content,
      buttons: {
        push: {
          label : "Push It",
          callback: (html) => {
            // ----------------------------------------
            // Collect final selections from the dialog
            // ----------------------------------------
            const macroId = html.find("#macro-select").val();
            const slot    = parseInt(html.find("#slot-select").val(), 10);
            const targets = [];

            html.find(".player-check:checked").each(function() {
              targets.push($(this).data("uid"));
            });

            resolve({ macroId, slot, targets });
          }
        },
        cancel: {
          label   : "Nevermind",
          callback: () => resolve(null)
        }
      },
      default: "push",
      render: (html) => {
        // --------------------------------------------
        // Wire up the toggle-all checkbox — one button
        // to rule em all, inline with the header
        // --------------------------------------------
        html.find("#toggle-all").on("change", function() {
          const nowChecked = $(this).prop("checked");

          // Flip the label text to match state
          html.find("#toggle-label").text(nowChecked ? "Deselect All" : "Select All");

          // Check or uncheck every player box
          html.find(".player-check").each(function() {
            $(this).prop("checked", nowChecked);
          });
        });

        // --------------------------------------------
        // If a player checkbox changes, sync the
        // toggle-all state so it stays accurate
        // --------------------------------------------
        html.find("#player-list").on("change", ".player-check", function() {
          const total   = html.find(".player-check").length;
          const checked = html.find(".player-check:checked").length;
          const allOn   = total > 0 && checked === total;

          // Update toggle checkbox without firing its own change event
          html.find("#toggle-all").prop("checked", allOn);
          html.find("#toggle-label").text(allOn ? "Deselect All" : "Select All");
        });
      }
    }, { width: 360 });

    dlg.render(true);
  });
}

// -------------------------------------------------------
// MAIN — run the dialog, then do the push
// -------------------------------------------------------
const result = await openPusherDialog();

// User bailed — peace out
if (!result) return;

const { macroId, slot, targets } = result;

// -------------------------------------------------------
// Validate — make sure we got a macro and some targets
// -------------------------------------------------------
const macroToPush = game.macros.get(macroId);
if (!macroToPush) {
  return ui.notifications.error("Yo, that macro don't exist. Check yourself.");
}
if (targets.length === 0) {
  return ui.notifications.warn("Nobody selected — the push got no audience, son.");
}

// -------------------------------------------------------
// Push the macro into slot N on each target user's hotbar
// Uses v12 API: user.hotbar (not user.data.hotbar — that's
// old school and deprecated, don't sleep on that change)
// -------------------------------------------------------
let pushed  = [];
let skipped = [];

for (const uid of targets) {
  const user = game.users.get(uid);
  if (!user) {
    // Can't find this user — skip and note it
    skipped.push(uid);
    continue;
  }

  // Build the updated hotbar object — spread existing slots,
  // then overwrite the chosen slot with our macro's id
  const updatedHotbar = {
    ...user.hotbar,         // preserve all existing hotbar assignments
    [slot]: macroToPush.id  // drop the new macro into the target slot
  };

  try {
    await user.update({ hotbar: updatedHotbar });
    pushed.push(user.name);
  } catch(err) {
    console.error(`Macro Pusher | Failed to push to ${user.name}:`, err);
    skipped.push(user.name);
  }
}

// -------------------------------------------------------
// Summary notification — let the GM know who got served
// -------------------------------------------------------
const pushMsg = pushed.length  ? `Pushed to: ${pushed.join(", ")}`  : "";
const skipMsg = skipped.length ? `Skipped: ${skipped.join(", ")}`   : "";
const fullMsg = [pushMsg, skipMsg].filter(Boolean).join(" | ");

ui.notifications.info(`Macro Pusher | "${macroToPush.name}" -> Slot ${slot} | ${fullMsg}`);