// ============================================================
// MACRO: Earthquake Shake - "Shake Whatcha Mama Gave Ya"
// Shakes the Foundry VTT canvas for 3 seconds using a
// CSS keyframe animation injected into the document.
// Requires Advanced Macros to show to players.
// ============================================================

(async () => {

  // -------------------------------------------------------
  // Step 1: Define the shake style - this is the ill part.
  // We inject a <style> tag with a CSS keyframe animation
  // that rapidly translates the canvas in random directions,
  // giving that earthquake/rumble effect. Word is bond.
  // -------------------------------------------------------
  const styleId = "earthquake-shake-style";

  // Don't double-inject if someone spams this macro, ya feel me?
  if (!document.getElementById(styleId)) {
    const style = document.createElement("style");
    style.id = styleId;
    style.textContent = `
      @keyframes earthquakeShake {
        0%   { transform: translate(0px, 0px); }
        10%  { transform: translate(-6px, -4px); }
        20%  { transform: translate(6px, 4px); }
        30%  { transform: translate(-4px, 6px); }
        40%  { transform: translate(4px, -6px); }
        50%  { transform: translate(-6px, 4px); }
        60%  { transform: translate(6px, -4px); }
        70%  { transform: translate(-4px, -6px); }
        80%  { transform: translate(4px, 6px); }
        90%  { transform: translate(-6px, -4px); }
        100% { transform: translate(0px, 0px); }
      }

      /* Apply the animation to the main Foundry canvas wrapper */
      #board.shaking {
        animation: earthquakeShake 0.15s linear infinite;
      }
    `;
    document.head.appendChild(style);
  }

  // -------------------------------------------------------
  // Step 2: Grab the #board element - that's the main
  // canvas container Foundry uses. This is where the
  // shake gets applied. Stay schemin'!
  // -------------------------------------------------------
  const board = document.getElementById("board");

  if (!board) {
    // If we can't find the board, we out - peace!
    ui.notifications.warn("Couldn't find the map canvas, homie. No shake today.");
    return;
  }

  // -------------------------------------------------------
  // Step 3: Add the .shaking class to kick off the animation.
  // This triggers the CSS keyframe loop on #board.
  // The crowd goes wild! 🎉
  // -------------------------------------------------------
  board.classList.add("shaking");

  // -------------------------------------------------------
  // Step 4: After 3 seconds (3000ms), remove the class to
  // stop the shake and reset back to normal. 
  // Straight up, back to the block. ✌️
  // -------------------------------------------------------
  await new Promise(resolve => setTimeout(resolve, 3000));
  board.classList.remove("shaking");

})();