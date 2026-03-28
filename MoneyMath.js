// ============================================================
// PF1E CURRENCY HANDLER MACRO - Foundry VTT v12
// "Coin Snatcher 3000" - Take what you owe, leave what you don't
// The dopest way to handle GP in the land
// ============================================================

// -------------------------------------------------------
// CONVERSION RATES (all based in copper, keepin' it real)
// 10cp = 1sp | 10sp = 1gp | 10gp = 1pp
// -------------------------------------------------------
const RATES = {
  pp: 1000, // 1 platinum = 1000 copper (the big baller rate)
  gp: 100,  // 1 gold     = 100 copper  (the homie rate)
  sp: 10,   // 1 silver   = 10 copper   (the block rate)
  cp: 1     // 1 copper   = 1 copper    (keeping it a buck)
};

// -------------------------------------------------------
// GET THE SELECTED ACTOR - who we taxin' today?
// Grabs the token from the canvas that's selected
// Falls back to the assigned character if no token is chilling
// -------------------------------------------------------
function getTargetActor() {
  // Check if a token is selected on the canvas
  const controlled = canvas.tokens.controlled;
  if (controlled.length === 1) {
    return controlled[0].actor;
  }
  // No token selected? Fall back to the user's own character
  if (game.user.character) {
    return game.user.character;
  }
  // Nobody home - throw up a warning and bounce
  return null;
}

// -------------------------------------------------------
// CONVERT ACTOR CURRENCY TO TOTAL COPPER
// Smash all denominations into one copper value
// This is where we do the math, no calculator needed
// -------------------------------------------------------
function totalInCopper(currency) {
  return (
    (currency.pp ?? 0) * RATES.pp +
    (currency.gp ?? 0) * RATES.gp +
    (currency.sp ?? 0) * RATES.sp +
    (currency.cp ?? 0) * RATES.cp
  );
}

// -------------------------------------------------------
// CONVERT RAW COPPER BACK INTO COIN DENOMINATIONS
// We go big to small: PP -> GP -> SP -> CP
// Keeps change minimal like a fresh haircut
// -------------------------------------------------------
function copperToDenominations(totalCp) {
  let remaining = Math.floor(totalCp); // No fractional copper, we ain't a bank

  const pp = Math.floor(remaining / RATES.pp);
  remaining -= pp * RATES.pp;

  const gp = Math.floor(remaining / RATES.gp);
  remaining -= gp * RATES.gp;

  const sp = Math.floor(remaining / RATES.sp);
  remaining -= sp * RATES.sp;

  const cp = remaining; // Whatever's left is copper, straight up

  return { pp, gp, sp, cp };
}

// -------------------------------------------------------
// CONVERT INPUT AMOUNT TO COPPER
// Takes the user's typed values (pp/gp/sp/cp) and smashes
// them into total copper so we can do clean subtraction math
// -------------------------------------------------------
function inputToCopper(pp, gp, sp, cp) {
  return (
    (parseInt(pp) || 0) * RATES.pp +
    (parseInt(gp) || 0) * RATES.gp +
    (parseInt(sp) || 0) * RATES.sp +
    (parseInt(cp) || 0) * RATES.cp
  );
}

// -------------------------------------------------------
// FORMAT CURRENCY FOR DISPLAY in the dialog
// Builds a human-readable breakdown like a crew roster
// -------------------------------------------------------
function formatCurrency(curr) {
  return `
    <span style="color:#b8960c">&#9670; ${curr.pp ?? 0} PP</span> &nbsp;
    <span style="color:#cfb54a">&#9670; ${curr.gp ?? 0} GP</span> &nbsp;
    <span style="color:#9e9e9e">&#9670; ${curr.sp ?? 0} SP</span> &nbsp;
    <span style="color:#b87333">&#9670; ${curr.cp ?? 0} CP</span>
  `;
}

// -------------------------------------------------------
// MAIN EXECUTION - Let's get this bread... or take it
// -------------------------------------------------------
(async () => {
  // Step 1: Who are we dealing with?
  const actor = getTargetActor();

  if (!actor) {
    // No actor found - put 'em on blast with a notification
    return ui.notifications.warn(
      "Yo! Select a token or assign a character first, fam."
    );
  }

  // Step 2: Pull the current currency off the actor's sheet
  const currency = actor.system.currency ?? {};
  const currentTotalCp = totalInCopper(currency);

  // Step 3: Build the dialog - the command center for coin ops
  // We show the current balance and give fields for each coin type to deduct
  const dialogContent = `
    <style>
      /* Style the dialog like a fresh fit */
      .coin-macro-wrap { font-family: var(--font-primary, sans-serif); padding: 4px; }
      .coin-macro-wrap h3 { margin: 0 0 6px; font-size: 1em; color: var(--color-text-dark-primary); }
      .coin-current { 
        background: rgba(0,0,0,0.06); 
        border-radius: 4px; 
        padding: 6px 10px; 
        margin-bottom: 10px; 
        font-size: 0.85em; 
      }
      .coin-macro-wrap label { 
        font-size: 0.82em; 
        font-weight: bold; 
        display: block; 
        margin-bottom: 2px; 
        color: var(--color-text-dark-secondary); 
      }
      .coin-row { display: flex; gap: 8px; margin-bottom: 8px; }
      .coin-row .coin-field { flex: 1; }
      .coin-row input { 
        width: 100%; 
        text-align: center; 
        border: 1px solid var(--color-border-dark, #888);
        border-radius: 3px;
        padding: 4px;
        background: var(--color-bg-btn, #f0ead6);
        font-size: 0.9em;
      }
      .coin-note { font-size: 0.75em; color: var(--color-text-dark-secondary); margin-top: 6px; }
    </style>
    <div class="coin-macro-wrap">
      <h3>&#128176; ${actor.name} — Current Wallet</h3>
      <div class="coin-current">${formatCurrency(currency)}</div>

      <h3>Amount to Deduct (leave blank for 0)</h3>
      <div class="coin-row">
        <div class="coin-field">
          <label style="color:#b8960c">Platinum (PP)</label>
          <input type="number" id="inp-pp" min="0" value="0" />
        </div>
        <div class="coin-field">
          <label style="color:#cfb54a">Gold (GP)</label>
          <input type="number" id="inp-gp" min="0" value="0" />
        </div>
        <div class="coin-field">
          <label style="color:#9e9e9e">Silver (SP)</label>
          <input type="number" id="inp-sp" min="0" value="0" />
        </div>
        <div class="coin-field">
          <label style="color:#b87333">Copper (CP)</label>
          <input type="number" id="inp-cp" min="0" value="0" />
        </div>
      </div>
      <p class="coin-note">
        &#9432; Deductions auto-convert denominations — if you ain't got the coins,
        it'll break down higher denominations to make change. Feel me?
      </p>
    </div>
  `;

  // Step 4: Render the dialog and wait for the user's move
  const result = await new Promise((resolve) => {
    new Dialog({
      title: `&#128176; Coin Snatcher — ${actor.name}`,
      content: dialogContent,
      buttons: {
        // Confirm button - drop the tax on these fools
        confirm: {
          icon: '<i class="fas fa-minus-circle"></i>',
          label: "Deduct Coins",
          callback: (html) => {
            // Pull the values the user typed in
            const pp = html.find("#inp-pp").val();
            const gp = html.find("#inp-gp").val();
            const sp = html.find("#inp-sp").val();
            const cp = html.find("#inp-cp").val();
            resolve({ pp, gp, sp, cp });
          }
        },
        // Cancel - we out
        cancel: {
          icon: '<i class="fas fa-times"></i>',
          label: "Never Mind",
          callback: () => resolve(null)
        }
      },
      default: "confirm",
      // Auto-focus the GP field when dialog opens - most common input
      render: (html) => html.find("#inp-gp").focus()
    }).render(true);
  });

  // User bounced out - respect the fade, no update
  if (!result) return;

  // Step 5: Convert what the user wants to deduct into copper
  const deductCp = inputToCopper(result.pp, result.gp, result.sp, result.cp);

  // If they typed all zeros, why are we even here?
  if (deductCp === 0) {
    return ui.notifications.info("Yo, you entered 0 for everything. Nothing deducted, fam.");
  }

  // Step 6: Check if they can afford it - can't bounce a check in Golarion
  if (deductCp > currentTotalCp) {
    // Calculate exactly how broke they are (in copper)
    const shortfallCp = deductCp - currentTotalCp;
    const shortfall = copperToDenominations(shortfallCp);
    return ui.notifications.error(
      `${actor.name} is SHORT by: PP:${shortfall.pp} GP:${shortfall.gp} SP:${shortfall.sp} CP:${shortfall.cp}. Can't pay what you don't got!`
    );
  }

  // Step 7: Do the math - subtract the deduction from total copper, then re-denominate
  const newTotalCp = currentTotalCp - deductCp;
  const newCurrency = copperToDenominations(newTotalCp);

  // Step 8: Update the actor's currency on their sheet - write it to the DB
  await actor.update({
    "system.currency.pp": newCurrency.pp,
    "system.currency.gp": newCurrency.gp,
    "system.currency.sp": newCurrency.sp,
    "system.currency.cp": newCurrency.cp
  });

  // Step 9: Post a loot notification to chat so the whole crew knows what happened
  // Build readable strings for the before/after state
  const deductedDenom = copperToDenominations(deductCp);

  await ChatMessage.create({
    speaker: ChatMessage.getSpeaker({ actor }),
    // Flavor text keeps the table immersed
    flavor: "&#128176; Coin Transaction",
    content: `
      <div style="font-size:0.9em; line-height:1.6;">
        <strong>${actor.name}</strong> paid up.<br/>
        <strong>Deducted:</strong> ${formatCurrency(deductedDenom)}<br/>
        <strong>Remaining:</strong> ${formatCurrency(newCurrency)}
      </div>
    `
  });

  // Step 10: Let the GM/player know everything went smooth
  ui.notifications.info(`&#128176; ${actor.name}'s wallet updated. Stay paid, stay hydrated.`);

})();