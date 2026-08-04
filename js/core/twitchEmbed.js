/**
 * Official Twitch Embed — counts as a normal viewer when stream is live.
 * When offline, Twitch shows the offline screen; the character sheet still works.
 */
export function mountTwitchEmbed(container, channel) {
  container.innerHTML = "";
  if (!channel || channel === "your_channel") {
    container.innerHTML =
      '<div style="display:grid;place-items:center;height:100%;color:#a89880;padding:1rem;text-align:center">Set channel in config.js or ?channel=</div>';
    return null;
  }

  const parent = window.location.hostname || "localhost";
  const iframe = document.createElement("iframe");
  iframe.src = `https://player.twitch.tv/?channel=${encodeURIComponent(channel)}&parent=${encodeURIComponent(parent)}&muted=true`;
  iframe.allowFullscreen = true;
  iframe.title = `Twitch — ${channel}`;
  container.appendChild(iframe);
  return iframe;
}
