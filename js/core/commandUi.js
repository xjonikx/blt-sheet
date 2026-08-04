/**
 * Общий UI для сетки кнопок команд.
 */
export function renderCommandGrid(root, group, api) {
  root.innerHTML = `
    <p class="muted">${escapeHtml(group.title)} — жми кнопку, команда уходит в чат Twitch от твоего ника.</p>
    <div class="cmd-grid" data-role="grid"></div>
    <h3 class="section-title">Ответ бота</h3>
    <div class="log-box" data-role="reply">Пока пусто — нажми команду с обновлением (!инв, !склад…)</div>
  `;

  const grid = root.querySelector('[data-role="grid"]');
  const replyBox = root.querySelector('[data-role="reply"]');

  for (const def of group.commands) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "cmd-btn";
    btn.innerHTML = `<span class="cmd-label">${escapeHtml(def.label)}</span>${
      def.hint ? `<span class="cmd-hint">${escapeHtml(def.hint)}</span>` : ""
    }`;
    btn.addEventListener("click", async () => {
      let full = def.cmd;
      if (def.prompt) {
        const extra = window.prompt(def.prompt, "");
        if (extra == null) return;
        const t = extra.trim();
        if (t) full = `${def.cmd} ${t}`.replace(/\s+/g, " ").trim();
      }
      try {
        if (!api.store.getUser()) {
          api.toast("Сначала Войти Twitch → Чат");
          return;
        }
        api.toast(`→ ${full}`);
        const lines = def.collect
          ? await api.commandBus.sendAndCollect(full)
          : await api.commandBus.runCommand(full);
        if (lines?.length) {
          replyBox.textContent = lines.join("\n");
          if (def.collect) {
            // refresh sheet from any info-like reply
            try {
              await api.commandBus.refreshHeroFromLines?.(lines);
            } catch {
              /* optional */
            }
          }
        } else {
          replyBox.textContent = `Отправлено: ${full}\n(ответ бота не пойман — смотри чат)`;
        }
      } catch (e) {
        api.toast(e.message || String(e));
        replyBox.textContent = e.message || String(e);
      }
    });
    grid.appendChild(btn);
  }
}

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
