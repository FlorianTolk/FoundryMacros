// ============================================================
// PF1E CURRENCY HANDLER MACRO - Foundry VTT v12
// "Coin Snatcher 3000 Deluxe" - Now with encumbrance awareness
// Weighted or weightless - your call, your kingdom
// ============================================================

// -------------------------------------------------------
// CONVERSION RATES (all based in copper, keepin' it real)
// 10cp = 1sp | 10sp = 1gp | 10gp = 1pp
// -------------------------------------------------------
const RATES = {
  pp: 1000,
  gp: 100,
  sp: 10,
  cp: 1
};

// -------------------------------------------------------
// PF1E COIN WEIGHT RULE
// Standard rule: every 50 coins = 1 lb, regardless of type
// Weighted mode uses this; weightless mode ignores it
// -------------------------------------------------------
const COINS_PER_LB = 50;

// -------------------------------------------------------
// GET THE SELECTED ACTOR - who we taxin' today?
// -------------------------------------------------------
function getTargetActor() {
  const controlled = canvas.tokens.controlled;
  if (controlled.length === 1) return controlled[0].actor;
  if (game.user.character) return game.user.character;
  return null;
}

// -------------------------------------------------------
// CONVERT ACTOR CURRENCY TO TOTAL COPPER
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
// Big to small: PP -> GP -> SP -> CP
// -------------------------------------------------------
function copperToDenominations(totalCp) {
  let remaining = Math.floor(totalCp);

  const pp = Math.floor(remaining / RATES.pp);
  remaining -= pp * RATES.pp;

  const gp = Math.floor(remaining / RATES.gp);
  remaining -= gp * RATES.gp;

  const sp = Math.floor(remaining / RATES.sp);
  remaining -= sp * RATES.sp;

  const cp = remaining;

  return { pp, gp, sp, cp };
}

// -------------------------------------------------------
// CONVERT USER INPUT TO COPPER
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
// TOTAL COIN COUNT from a denomination object
// Used to compute weight - all coins weigh the same per PF1e
// -------------------------------------------------------
function totalCoinCount(curr) {
  return (curr.pp ?? 0) + (curr.gp ?? 0) + (curr.sp ?? 0) + (curr.cp ?? 0);
}

// -------------------------------------------------------
// COMPUTE WEIGHT from a coin count
// Returns a float rounded to 2 decimal places
// -------------------------------------------------------
function coinsToLbs(coinCount) {
  return Math.round((coinCount / COINS_PER_LB) * 100) / 100;
}

// -------------------------------------------------------
// FORMAT CURRENCY FOR DISPLAY in the dialog/chat
// -------------------------------------------------------
function formatCurrency(curr) {
  return `
    <span style="color:#b8960c">${curr.pp ?? 0} PP</span> &nbsp;
    <span style="color:#cfb54a">${curr.gp ?? 0} GP</span> &nbsp;
    <span style="color:#9e9e9e">${curr.sp ?? 0} SP</span> &nbsp;
    <span style="color:#b87333">${curr.cp ?? 0} CP</span>
  `;
}

// -------------------------------------------------------
// BUILD THE BADGE TEXT for the wallet display
// Weighted shows real lbs, weightless shows 0 lbs
// -------------------------------------------------------
function buildBadgeHTML(currency, isWeighted) {
  const coinCount = totalCoinCount(currency);
  const lbs       = isWeighted ? coinsToLbs(coinCount) : 0;
  const modeLabel = isWeighted ? "weighted" : "weightless mode active";
  return `${coinCount} total coins &nbsp;|&nbsp; ${lbs} lbs (${modeLabel})`;
}

// -------------------------------------------------------
// MAIN EXECUTION
// -------------------------------------------------------
(async () => {
  // Step 1: Who are we dealing with?
  const actor = getTargetActor();

  if (!actor) {
    return ui.notifications.warn(
      "Yo! Select a token or assign a character first, fam."
    );
  }

  // -------------------------------------------------------
  // Step 2: Pull BOTH currency pools off the actor
  // PF1e stores these separately:
  //   actor.system.currency    = weighted coin pool
  //   actor.system.altCurrency = weightless coin pool
  // The dropdown controls which one we read and write to
  // -------------------------------------------------------
  const weightedCurrency    = actor.system.currency    ?? {};
  const weightlessCurrency  = actor.system.altCurrency ?? {};

  // Step 3: Build the dialog - weighted is the default so
  // we start the display off the weighted pool
  const dialogContent = `
    <style>
      .coin-macro-wrap { font-family: var(--font-primary, sans-serif); padding: 4px; }
      .coin-macro-wrap h3 { margin: 0 0 6px; font-size: 1em; color: var(--color-text-dark-primary); }
      .coin-current {
        background: rgba(0,0,0,0.06);
        border-radius: 4px;
        padding: 6px 10px;
        margin-bottom: 10px;
        font-size: 0.85em;
      }
      .coin-weight-badge {
        font-size: 0.75em;
        color: var(--color-text-dark-secondary);
        margin-top: 3px;
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
      .coin-mode-row {
        display: flex;
        align-items: center;
        gap: 10px;
        margin-bottom: 10px;
      }
      .coin-mode-row label {
        font-size: 0.82em;
        font-weight: bold;
        margin: 0;
        white-space: nowrap;
        color: var(--color-text-dark-secondary);
      }
      .coin-mode-row select {
        flex: 1;
        border: 1px solid var(--color-border-dark, #888);
        border-radius: 3px;
        padding: 4px 6px;
        background: var(--color-bg-btn, #f0ead6);
        font-size: 0.85em;
        color: var(--color-text-dark-primary);
      }
      .coin-mode-hint {
        font-size: 0.73em;
        color: var(--color-text-dark-secondary);
        margin: -6px 0 10px;
        padding-left: 2px;
        font-style: italic;
      }
      .coin-note { font-size: 0.75em; color: var(--color-text-dark-secondary); margin-top: 6px; }
    </style>
    <div class="coin-macro-wrap">

      <h3>${actor.name} — Current Wallet</h3>
      <div class="coin-current">
        <!-- coin-currency-display swaps between weighted/weightless pool values -->
        <div id="coin-currency-display">${formatCurrency(weightedCurrency)}</div>
        <!-- coin-weight-badge shows count + lbs, also swaps on dropdown change -->
        <div class="coin-weight-badge" id="coin-weight-badge">
          ${buildBadgeHTML(weightedCurrency, true)}
        </div>
      </div>

      <!-- Dropdown defaults to weighted - controls which pool is read and written -->
      <div class="coin-mode-row">
        <label for="coin-mode">Coin Weight Mode:</label>
        <select id="coin-mode">
          <option value="weighted" selected>Weighted (50 coins = 1 lb)</option>
          <option value="weightless">Weightless (coins have no weight)</option>
        </select>
      </div>
      <div class="coin-mode-hint" id="coin-mode-hint">
        Weight delta will be reported in the chat message.
      </div>

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
        Note: Deductions auto-convert denominations — if you ain't got the coins,
        it'll break down higher denominations to make change. Feel me?
      </p>
    </div>
  `;

  // Step 4: Render the dialog and wait for the user's input
  const result = await new Promise((resolve) => {
    new Dialog({
      title: `Coin Snatcher — ${actor.name}`,
      content: dialogContent,
      buttons: {
        confirm: {
          icon: '<i class="fas fa-minus-circle"></i>',
          label: "Deduct Coins",
          callback: (html) => {
            const pp         = html.find("#inp-pp").val();
            const gp         = html.find("#inp-gp").val();
            const sp         = html.find("#inp-sp").val();
            const cp         = html.find("#inp-cp").val();
            const weightMode = html.find("#coin-mode").val();
            resolve({ pp, gp, sp, cp, weightMode });
          }
        },
        cancel: {
          icon: '<i class="fas fa-times"></i>',
          label: "Never Mind",
          callback: () => resolve(null)
        }
      },
      default: "confirm",
      render: (html) => {
        // Use native DOM via html[0] - more reliable than jQuery
        // .find() for live updates inside Foundry v12 dialogs
        const root        = html[0];
        const dropdown    = root.querySelector("#coin-mode");
        const hint        = root.querySelector("#coin-mode-hint");
        const badge       = root.querySelector("#coin-weight-badge");
        const display     = root.querySelector("#coin-currency-display");
        const gpInput     = root.querySelector("#inp-gp");

        if (gpInput) gpInput.focus();

        // -------------------------------------------------------
        // DROPDOWN CHANGE HANDLER
        // This is the key fix - when mode switches we:
        //   1. Swap the currency display to the correct pool
        //   2. Update the badge with count + lbs for that pool
        //   3. Update the hint text below the dropdown
        // -------------------------------------------------------
        dropdown.addEventListener("change", (e) => {
          const isWeighted = e.target.value === "weighted";

          // Pick the correct currency pool to display
          const activeCurrency = isWeighted ? weightedCurrency : weightlessCurrency;

          // Update the coin denomination display (PP/GP/SP/CP values)
          display.innerHTML = formatCurrency(activeCurrency);

          // Update the badge (total coins + lbs)
          badge.innerHTML = buildBadgeHTML(activeCurrency, isWeighted);

          // Update the hint text below the dropdown
          hint.textContent = isWeighted
            ? "Weight delta will be reported in the chat message."
            : "No weight tracking — coins are featherlight, no encumbrance reported.";
        });
      }
    }).render(true);
  });

  // User bounced - nothing to do
  if (!result) return;

  // -------------------------------------------------------
  // Step 5: Determine which currency pool we are working with
  // based on what the user had selected in the dropdown
  // -------------------------------------------------------
  const isWeighted   = result.weightMode === "weighted";
  const activeCurrency = isWeighted ? weightedCurrency : weightlessCurrency;

  // The update path key differs between the two pools
  // weighted    -> system.currency.xx
  // weightless  -> system.altCurrency.xx
  const updatePath = isWeighted ? "system.currency" : "system.altCurrency";
  const currentTotalCp = totalInCopper(activeCurrency);

  // Step 6: Convert input to copper and validate
  const deductCp = inputToCopper(result.pp, result.gp, result.sp, result.cp);

  if (deductCp === 0) {
    return ui.notifications.info("You entered 0 for everything. Nothing deducted, fam.");
  }

  // Step 7: Broke check - can they afford this from the active pool?
  if (deductCp > currentTotalCp) {
    const shortfallCp = deductCp - currentTotalCp;
    const shortfall   = copperToDenominations(shortfallCp);
    return ui.notifications.error(
      `${actor.name} is SHORT by: PP:${shortfall.pp} GP:${shortfall.gp} SP:${shortfall.sp} CP:${shortfall.cp}. Can't pay what you don't got!`
    );
  }

  // Step 8: Do the math - subtract and re-denominate
  const newTotalCp    = currentTotalCp - deductCp;
  const newCurrency   = copperToDenominations(newTotalCp);
  const deductedDenom = copperToDenominations(deductCp);

  // Step 9: Compute weight delta only if weighted mode was selected
  let weightLine = "";
  if (isWeighted) {
    const coinsRemoved   = totalCoinCount(deductedDenom);
    const lbsRemoved     = coinsToLbs(coinsRemoved);
    const coinsRemaining = totalCoinCount(newCurrency);
    const lbsRemaining   = coinsToLbs(coinsRemaining);

    weightLine = `
      <br/>
      <strong>Weight:</strong>
      -${lbsRemoved} lbs removed
      &nbsp;|&nbsp;
      ${lbsRemaining} lbs still carried
    `;
  } else {
    weightLine = `<br/><em style="color:#888;">Weightless mode — no encumbrance tracked</em>`;
  }

  // Step 10: Write updated currency back to the correct pool on the actor
  await actor.update({
    [`${updatePath}.pp`]: newCurrency.pp,
    [`${updatePath}.gp`]: newCurrency.gp,
    [`${updatePath}.sp`]: newCurrency.sp,
    [`${updatePath}.cp`]: newCurrency.cp
  });

  // Step 11: Post the transaction summary to chat
  await ChatMessage.create({
    speaker: ChatMessage.getSpeaker({ actor }),
    flavor: "Coin Transaction",
    content: `
      <div style="font-size:0.9em; line-height:1.8;">
        <strong>${actor.name}</strong> paid up.<br/>
        <strong>Pool:</strong> ${isWeighted ? "Weighted" : "Weightless"}<br/>
        <strong>Deducted:</strong> ${formatCurrency(deductedDenom)}<br/>
        <strong>Remaining:</strong> ${formatCurrency(newCurrency)}
        ${weightLine}
      </div>
    `
  });

  // Step 12: Done
  ui.notifications.info(`${actor.name}'s wallet updated. Stay paid, stay hydrated.`);

})();