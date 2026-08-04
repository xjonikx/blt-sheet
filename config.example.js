// Copy to config.js and fill in. config.js is gitignored if you prefer.
// Twitch: https://dev.twitch.tv/console → Register Your Application
// Redirect URL must exactly match where the app is hosted, e.g.:
//   http://localhost:5500/
//   https://YOURNAME.neocities.org/
//   https://YOURUSER.github.io/BLTWithApp/CompiledDevelopedApp/
window.BLT_SHEET_CONFIG = {
  /** Required for live Twitch login + chat commands */
  twitchClientId: "YOUR_TWITCH_CLIENT_ID",

  /**
   * Default streamer channel (without #).
   * Override with ?channel=name in the URL.
   */
  channel: "YOUR_CHANNEL",

  /** Chat command that runs Hero Info (must match BLT Configure) */
  infoCommand: "!инв",

  /**
   * Optional: bot account login (lowercase).
   * If empty, any message with the BLT prefix is accepted.
   */
  botLogin: "",

  /** Default BLT reply prefix (see Bot Message Prefix in BLT auth settings) */
  botPrefix: "[BLT]",

  /** How long to collect bot reply chunks after a command (ms) */
  replyCollectMs: 4500,

  /** Start in demo mode until the user connects (good for UI work) */
  startInDemo: true,
};
