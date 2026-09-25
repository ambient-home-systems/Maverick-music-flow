import { isPlayerAvailable } from "../state/players.js";

export function liveDiagnosticRows(card, context = null, refreshed = false) {
  const rows = [];
  const add = (status, en, detail = "") => rows.push({status,title:card._m(en),detail});
  const status = value => value === true ? "ok" : value === false ? "fail" : "info";
  add(status(card._hass?.connection?.connected),"Home Assistant");
  add(refreshed ? status(context?.available === true) : "info","Flow Engine", context?.version || "");
  const connections = context?.raw?.required_connections || context?.raw?.connections || card._state.engineRequiredConnections || {};
  for (const [key,en] of [["music_assistant","Music Assistant"],["queue_provider","Queue service"],["library_provider","Music library"],["search_provider","Music search"]]) {
    const value = connections[key] || connections.connections?.[key];
    add(refreshed && context?.available ? status(value?.ok) : "info",en,card._redactDiagnosticText?.(value?.message || "") || "");
  }
  const player = card._getSelectedPlayer?.();
  add(player ? isPlayerAvailable(player) ? "ok" : "fail" : "warn", "Selected player", player ? card._playerDisplayName?.(player) || "" : card._m("Choose a player"));
  const queue = card._state.maQueueState;
  add(queue?.queue_id ? "ok" : "info", "Queue snapshot", queue?.queue_id ? `${Number(queue.items) || 0} ${card._m("items")}` : card._m("No queue information yet"));
  const images=[...(card.shadowRoot?.querySelectorAll("#npArt img") || [])].filter(image=>image.getAttribute("src"));
  const loaded=images.filter(image=>image.complete && image.naturalWidth>0).length;
  add(!images.length ? "info" : loaded === images.length ? "ok" : "warn","Artwork",`${loaded}/${images.length} ${card._m("loaded artwork images")}`);
  const uri = card._getCurrentMediaUri?.();
  const wave = [...(card._waveformCache || new Map()).entries()].find(([key])=>uri && key.endsWith(`:${uri}`))?.[1];
  add(wave?.bins ? "ok" : "warn","Audio waveform",wave?.bins ? card._m("MA analysis available") : card._m("MA has not supplied analysis for this item. Seeking remains available when supported."));
  const renderMs=card._performanceMetrics?.lastMenuRenderMs;
  add(Number.isFinite(renderMs) ? renderMs > 200 ? "warn" : "ok" : "info","Interface performance",Number.isFinite(renderMs) ? `${renderMs} ms · ${card._performanceProfile?.() || ""}` : "");
  add(card._localSendspinConnected ? "ok" : card._isLocalSendspinDesired?.() ? "warn" : "info","This device",card._localSendspinConnected ? card._m("Connected; this does not verify physical audio output.") : card._m("Local player is not connected"));
  return rows;
}

export function mountLiveDiagnostics(card, body) {
  card._stopLiveDiagnostics?.();
  let stopped=false, timer=null, context=null, refreshed=false;
  const active=()=>!stopped && body.isConnected && card._state.menuPage === "diagnostics";
  const render=()=>{
    if (!active()) return;
    const rows=liveDiagnosticRows(card,context,refreshed);
    card._state.diagnosticsItems=rows;
    body.innerHTML=`<section class="diagnostics-shell"><h2>${card._esc(card._m("System health"))}</h2><p role="status">${card._esc(refreshed ? card._m("Updates automatically while this screen is open.") : card._m("Checking current connection status…"))}</p><button class="settings-pill" data-menu-action="copy_diagnostics">${card._esc(card._m("Copy report"))}</button><div class="diagnostics-list">${rows.map(row=>card._diagnosticRowHtml(row)).join("")}</div><small>${card._esc(card._m("Green: ready · Yellow: limited · Red: failed · Gray: not verified"))}</small></section>`;
  };
  const update=async()=>{
    if (!active()) return;
    if (globalThis.document?.visibilityState !== "hidden") {
      try { context=await card._refreshMaverickEngineContext({force:true}); }
      catch { context={available:false}; }
      if (!active()) return;
      refreshed=true;card._state.diagnosticsRunAt=Date.now();render();
    }
    if (active()) timer=setTimeout(update,15000);
  };
  card._stopLiveDiagnostics=()=>{stopped=true;clearTimeout(timer);};
  render();void update();
}
