if (!token) {
    ui.notifications.warn('No Selected Token');
    return;
}

if (!token.document.movementHistory.length) {
  ui.notifications.info(token.name + " has no movement history.");
  return;
}

const clear = await foundry.applications.api.DialogV2.confirm({
  window: { title: "Clear History" },
  content: "<p>Clear movement history for " + token.name + "?</p>"
});

if (clear) {
  token.document.clearMovementHistory();
  ui.notifications.info("Cleared movement history for " + token.name + ".");
}