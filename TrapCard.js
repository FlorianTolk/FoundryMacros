// ============================================================
// REGION STOP & DROP (It's Like That) - FX Masters Region Macro
// Triggers on: Token enters a Region
// Drops the beat (sound) and stops the token cold
// ============================================================

// --- Grab the token that just rolled up into our region ---
const token = canvas.tokens.get(event.data.tokenId);

// If no token found, bail out - we ain't playin' ourselves
if (!token) return;

// ============================================================
// 🎵 SOUND SETUP - Fill in your file path below, homeboy
// Example: "sounds/effects/police-siren.mp3"
// or a full Foundry path like "modules/mymod/audio/stop.ogg"
// ============================================================
const SOUND_FILE_PATH = "PUT YOUR SOUND FILE PATH HERE";

// --- Stop the token's movement dead in its tracks (no cap) ---
// We update the token's position back to where it started
// so it can't just walk on through like it owns the place
await token.document.update({
    x: token.document.x,
    y: token.document.y
});

// --- If the token is moving (has a ruler path), cancel that too ---
// This kills any queued movement so it don't sneak past us
if (token._movement) {
    token._movement = null;
}

// ============================================================
// Play the sound - Pump up the volume, pump up the jam!
// AudioHelper is Foundry's built-in DJ for playing sounds
// ============================================================
AudioHelper.play({
    src: SOUND_FILE_PATH,   // The track we're droppin'
    volume: 1.0,            // Full volume - this ain't no whisper (0.0 to 1.0)
    autoplay: true,         // Start immediately, no waiting
    loop: false             // One-shot, not on repeat
}, true); // 'true' = play for ALL connected players, not just the GM

// --- Optional: Notify the table so everyone knows what's good ---
ui.notifications.info(`🛑 ${token.name} got stopped at the region — can't touch this!`);