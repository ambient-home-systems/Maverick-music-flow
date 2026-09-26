import { actionIconSvg } from "./action-menu.js";
import { normalizeNightMode } from "../state/night-mode.js";
// Small views backed by the existing Engine and player controls.
export async function refreshArtworkLighting(card, force = false) {
  if (!card._state.engineCapabilities?.artwork_lighting) return null;
  if (card._lightingRead) return card._lightingRead;
  if (!force && Date.now() - (card._lightingReadAt || 0) < 5000) return card._state.artworkLighting;
  card._lightingRead = card._maverickEngineCommand("lighting/get").then(snapshot => {
    card._state.artworkLighting = snapshot;
    card._lightingReadAt = Date.now();
    return snapshot;
  }).finally(() => { card._lightingRead = null; });
  return card._lightingRead;
}

export async function setArtworkLighting(card, enabled, {useLocalMapping = false} = {}) {
  const player = card._state.selectedPlayer;
  const snapshot = await refreshArtworkLighting(card, true);
  const rule = snapshot?.rules?.[player];
  const lights = useLocalMapping || !rule ? card._ambientLightEntitiesForPlayer({entity_id:player}) : rule.lights;
  const result = await card._maverickEngineCommand("lighting/set", {
    player, lights, enabled,
    brightness:card._ambientLightBrightness(), transition:card._ambientLightTransition(), cooldown:Math.max(1,card._ambientLightCooldown()),
  });
  card._state.artworkLighting = result;
  card._lightingReadAt = Date.now();
  return result;
}

export async function renderListeningTools(card, body, page) {
  const t = (en) => card._esc(card._m(en));
  if (page === "group_volume") {
    const template = document.createElement("template");
    template.innerHTML = card._groupMenuHtml();
    const volume = template.content.querySelector(".group-volume-card");
    body.replaceChildren();
    if (volume) { volume.open = true; body.append(volume); }
    const selected = card._getSelectedPlayer();
    if (card._groupVolumeSessionOwner !== selected?.entity_id) {
      card._groupVolumeSessionOwner = selected?.entity_id; card._groupVolumeSessionMembers = new Set();
    }
    card._playerGroupMemberIds(selected).forEach(id => card._groupVolumeSessionMembers.add(id));
    const grid = template.content.querySelector(".players-premium-grid");
    if (grid) {
      [...grid.children].forEach(row => {
        const input = row.querySelector("[data-menu-group-player]");
        if (!card._groupVolumeSessionMembers.has(input?.dataset.menuGroupPlayer)) row.remove();
        else if (input.dataset.groupOwner === "true") input.disabled = true;
      });
      body.append(grid);
    }
    if (!volume && !grid?.children.length) body.innerHTML = `<div class="state-box">${t("No active group")}</div>`;
    return;
  }
  if (page === "smart") {
    const entries = [
      ["announcements","announcement","Announce"],
      ["sleep_timer","timer","Timers"],
      ["sleep_timer","schedule_add","Schedules"],
      ["playback_stats","stats","Insights"],
      ["lighting","lightbulb","Lighting"],
      ["night_preferences","moon","Night"],
      ["system_screensaver","clock","Screensaver"],
      ["diagnostics","info","Diagnostics"],
      ...(card._state.engineCapabilities?.volume_rules ? [["volume_rules","volume","Volume limits"]] : []),
      ...(card._state.engineCapabilities?.saved_playlists ? [["saved_playlists","playlist","Engine playlists"]] : []),
    ].filter(([id]) => {
      const capability={lighting:"artwork_lighting",night_preferences:"interface_preferences",announcements:"announcements",sleep_timer:"timers",playback_stats:"playback_statistics",system_screensaver:"system_screensaver",volume_rules:"volume_rules",saved_playlists:"saved_playlists"}[id];
      return !capability || card._state.engineCapabilities?.[capability] === true;
    });
    body.innerHTML = `<section class="smart-hub"><div class="smart-hub-grid">${entries.map(([id,icon,en]) => `<button data-menu-nav="${id}">${actionIconSvg(card,icon)}<span>${t(en)}</span></button>`).join("")}</div></section>`;
    return;
  }
  if (page === "night_preferences") {
    body.innerHTML = `<div role="status">${t("Loading…")}</div>`;
    try {
      const values=await card._maverickEngineCommand("interface/get");
      if(card._state.menuPage !== page || !body.isConnected) return;
      applyInterfacePreferences(card,values);card._state.engineInterfacePreferences=values;
      const mode=normalizeNightMode(card._state.mobileNightMode);
      body.innerHTML=`<form class="smart-settings"><h2>${t("Night display")}</h2><label>${t("Mode")}<select name="mode">${["off","on","auto"].map(value=>`<option value="${value}" ${mode===value?"selected":""}>${t({off:"Off",on:"On",auto:"Automatic"}[value])}</option>`).join("")}</select></label><label>${t("Start")}<input name="start" type="time" value="${card._esc(card._state.mobileNightModeStart || "22:00")}" required></label><label>${t("End")}<input name="end" type="time" value="${card._esc(card._state.mobileNightModeEnd || "06:00")}" required></label>${card._nightModeDayOptions().map(([day,name])=>`<label>${card._esc(name)}<input name="day" type="checkbox" value="${day}" ${card._nightModeDays().includes(day)?"checked":""}></label>`).join("")}<button type="submit">${t("Save to Engine")}</button><p role="status"></p></form>`;
      const form=body.querySelector("form");form.onsubmit=async event=>{
        event.preventDefault();event.stopPropagation();const button=form.querySelector('[type="submit"]');button.disabled=true;
        try {
          const result=await card._maverickEngineCommand("interface/set",{night_mode:form.elements.mode.value,night_start:form.elements.start.value,night_end:form.elements.end.value,night_days:[...form.querySelectorAll('[name="day"]:checked')].map(input=>Number(input.value))});
          applyInterfacePreferences(card,result);card._state.engineInterfacePreferences=result;card._persistMobileAppearance();form.querySelector('[role="status"]').textContent=card._m("Saved in the Engine");
        } catch(error){form.querySelector('[role="status"]').textContent=card._mediaControlFailureMessage(error);}
        finally{button.disabled=false;}
      };
    } catch(error){if(card._state.menuPage === page && body.isConnected) body.innerHTML=`<div role="alert">${card._esc(card._mediaControlFailureMessage(error))}</div>`;}
    return;
  }
  if (page === "system_screensaver") {
    body.innerHTML = `<div role="status">${t("Loading…")}</div>`;
    try {
      const result = await card._maverickEngineCommand("screensaver/get");
      if (card._state.menuPage !== page || !body.isConnected) return;
      const config = result.config || {};
      body.innerHTML = `<form class="smart-settings"><h2>${t("System screensaver")}</h2><label><input name="enabled" type="checkbox" ${config.enabled ? "checked" : ""}>${t("Enabled")}</label><label>${t("Idle timeout (seconds)")}<input name="timeout_seconds" type="number" min="15" max="3600" value="${Number(config.timeout_seconds) || 90}" required></label><label>${t("Mode")}<select name="mode">${["auto","clock","lyrics"].map(mode=>`<option value="${mode}" ${config.mode === mode ? "selected" : ""}>${t({auto:"Automatic",clock:"Clock",lyrics:"Lyrics"}[mode])}</option>`).join("")}</select></label><label>${t("Message")}<input name="message" maxlength="120" value="${card._esc(config.message || "")}"></label><button type="submit">${t("Save to Engine")}</button><p role="status"></p></form>`;
      const form = body.querySelector("form");
      const saveButton=form.querySelector('[type="submit"]');
      saveButton.insertAdjacentHTML("beforebegin", `<label>${t("Clock style")}<select name="clock_mode"><option value="digital" ${config.clock_mode!=="analog"?"selected":""}>${t("Digital")}</option><option value="analog" ${config.clock_mode==="analog"?"selected":""}>${t("Analog")}</option></select></label><label>${t("Show artwork")}<input name="show_artwork" type="checkbox" ${config.show_artwork!==false?"checked":""}></label><label>${t("Show lyrics automatically while playing")}<input name="auto_lyrics_when_playing" type="checkbox" ${config.auto_lyrics_when_playing!==false?"checked":""}></label>`);
      if(card._state.engineCapabilities?.system_screensaver_show) {
        const show=document.createElement("button");show.type="button";
        show.textContent=card._m("Show on connected screens");
        show.onclick=async()=>{
          if(show.disabled)return;show.disabled=true;
          try {await card._maverickEngineCommand("screensaver/show");form.querySelector('[role="status"]').textContent=card._m("Request sent to connected screens");}
          catch(error){form.querySelector('[role="status"]').textContent=card._mediaControlFailureMessage(error);}
          finally{show.disabled=false;}
        };
        form.append(show);
      }
      form.onsubmit = async event => {
        event.preventDefault(); event.stopPropagation();
        const button=form.querySelector('[type="submit"]'); if(button.disabled)return;button.disabled=true;
        try { await card._maverickEngineCommand("screensaver/set",{enabled:form.elements.enabled.checked,timeout_seconds:Number(form.elements.timeout_seconds.value),mode:form.elements.mode.value,message:form.elements.message.value,clock_mode:form.elements.clock_mode.value,show_artwork:form.elements.show_artwork.checked,auto_lyrics_when_playing:form.elements.auto_lyrics_when_playing.checked}); form.querySelector('[role="status"]').textContent=card._m("Saved in the Engine"); }
        catch(error){ form.querySelector('[role="status"]').textContent=card._mediaControlFailureMessage(error); }
        finally {button.disabled=false;}
      };
    } catch(error){if(card._state.menuPage === page && body.isConnected) body.innerHTML=`<div role="alert">${card._esc(card._mediaControlFailureMessage(error))}</div>`;}
    return;
  }
  if (page === "recommendations") {
    body.innerHTML = `<div class="state-box" role="status">${t("Loading recommendations…")}</div>`;
    try {
      const raw = await card._loadRecommendationFolders();
      if (card._state.menuPage !== page || !body.isConnected) return;
      const entries = card._flattenNativeRecommendations(raw,100);
      const sections = new Map();
      for (const item of entries) { const key = item.folder_name || card._m("For you"); if (!sections.has(key)) sections.set(key,[]); sections.get(key).push(item); }
      body.innerHTML = `<section class="recommendation-home"><h2>${t("Made for your listening")}</h2>${[...sections].map(([name,items]) => `<section><h3>${card._esc(name)}</h3><div class="recommendation-shelf">${items.map(item => `<button data-media-uri="${card._esc(item.uri)}" data-media-type="${card._esc(item.media_type)}" data-media-name="${card._esc(item.name)}" data-media-image="${card._esc(item.image || "")}"><span class="recommendation-art">${item.image ? card._imgHtml(item.image,"",{loading:"lazy",fallbackIcon:"album"}) : actionIconSvg(card,"album")}</span><strong>${card._esc(item.name)}</strong><span>${card._esc(item.artist || item.provider_label || "")}</span></button>`).join("")}</div></section>`).join("") || `<p>${t("No recommendations returned by Music Assistant yet.")}</p>`}</section>`;
    } catch(error) { if (card._state.menuPage === page && body.isConnected) body.innerHTML = `<div role="alert">${card._esc(card._mediaControlFailureMessage(error))}</div>`; }
    return;
  }
  if (page === "lighting") {
    if (card._state.engineCapabilities?.artwork_lighting) {
      body.innerHTML = `<div class="state-box" role="status">${t("Loading lighting settings…")}</div>`;
      try { await refreshArtworkLighting(card, true); }
      catch (error) { if (card._state.menuPage === page && body.isConnected) body.innerHTML = `<div role="alert">${card._esc(card._mediaControlFailureMessage(error))}</div>`; return; }
      if (card._state.menuPage !== page || !body.isConnected) return;
    }
    const enabled = card._ambientLightEnabled() ? "on" : "off";
    const rule = card._state.artworkLighting?.rules?.[card._state.selectedPlayer];
    const lights = rule?.lights || card._ambientLightEntitiesForPlayer();
    body.innerHTML = `<section class="settings-group listening-lighting"><h2>${t("Follow the music")}</h2><p>${card._state.engineCapabilities?.artwork_lighting ? t("The Engine follows artwork colors even when this card is closed.") : t("Your configured lights follow artwork colors while this card is open.")}</p><p>${lights.map(light=>card._esc(card._hass?.states?.[light]?.attributes?.friendly_name || light)).join(" · ")}</p><div class="settings-pills">${card._settingsPill(card._m("Enabled"), "on", enabled, "data-setting-ambient-light")}${card._settingsPill(card._m("Disabled"), "off", enabled, "data-setting-ambient-light")}</div></section>`;
    if (card._state.engineCapabilities?.artwork_lighting) {
      const player = card._state.selectedPlayer;
      const status = card._state.artworkLighting?.status?.[player];
      const availableLights = Object.entries(card._hass?.states || {}).filter(([id,state]) => id.startsWith("light.") && (state.attributes?.supported_color_modes || []).some(mode=>["rgb","rgbw","rgbww","hs","xy"].includes(mode)));
      const form = document.createElement("form"); form.className="smart-settings";
      form.innerHTML = `<h3>${t("Lights assigned to this player")}</h3>${availableLights.map(([id,state])=>`<label><span>${card._esc(state.attributes.friendly_name || id)}</span><input type="checkbox" name="light" value="${card._esc(id)}" ${lights.includes(id)?"checked":""}></label>`).join("")}<label>${t("Maximum brightness (%)")}<input name="brightness" type="number" min="1" max="100" value="${Number(rule?.brightness) || card._ambientLightBrightness()}" required></label><label>${t("Transition (seconds)")}<input name="transition" type="number" min="0" max="120" value="${Number(rule?.transition ?? card._ambientLightTransition())}" required></label><button type="submit">${t("Save mapping to Engine")}</button><p role="status">${status?.updated_at ? `${t("Last update")}: ${card._esc(status.updated_at)} · ${card._esc(status.media_title || "")} · ${card._esc(status.state)}` : t("No confirmed lighting update yet")}</p>`;
      body.append(form);
      form.onsubmit = async event => {
        event.preventDefault(); event.stopPropagation();
        const button=form.querySelector('[type="submit"]');button.disabled=true;
        try {
          const nextLights=[...form.querySelectorAll('[name="light"]:checked')].map(input=>input.value);
          const result=await card._maverickEngineCommand("lighting/set",{player,lights:nextLights,enabled:!!rule?.enabled && nextLights.length>0,brightness:Number(form.elements.brightness.value),transition:Number(form.elements.transition.value),cooldown:rule?.cooldown || 8});
          card._state.artworkLighting=result;card._lightingReadAt=Date.now();
          form.querySelector('[role="status"]').textContent=card._m("Mapping saved in the Engine");
        } catch(error){form.querySelector('[role="status"]').textContent=card._mediaControlFailureMessage(error);}
        finally{button.disabled=false;}
      };
    }
    return;
  }
  if (page === "favorite_radios") {
    body.innerHTML = `<div class="state-box" role="status">${t("Loading favorite stations…")}</div>`;
    try {
      const stations = await card._fetchLibrary("radio", "sort_name", 250, true);
      if (card._state.menuPage !== page || !body.isConnected) return;
      body.innerHTML = card._mediaItemsListHtml(stations, "radio", {librarySkin:true}) || `<div class="state-box">${t("No favorite radio stations yet")}</div>`;
    } catch (error) {
      if (card._state.menuPage === page && body.isConnected) body.innerHTML = `<div class="state-box" role="alert">${card._esc(card._mediaControlFailureMessage(error))}</div>`;
    }
    return;
  }
  body.innerHTML = `<div class="state-box" role="status">${t("Loading listening statistics…")}</div>`;
  try {
    const stats = await card._maverickEngineGetPlaybackStats();
    if (card._state.menuPage !== page || !body.isConnected) return;
    if (!stats || !Number.isFinite(Number(stats.today_minutes))) throw new Error(card._m("Listening statistics are unavailable."));
    const number = value => card._esc(Number.isFinite(Number(value)) ? Math.max(0, Number(value)).toLocaleString(undefined, {maximumFractionDigits:1}) : "—");
    const top = stats.top_player_today;
    const leader = top?.friendly_name || top?.entity_id;
    body.innerHTML = `<section class="listening-stats"><h2>${t("Listening today")}</h2><p>${card._esc(stats.day || "")}</p><div class="listening-stats-summary"><div><strong>${number(stats.today_minutes)}</strong><span>${t("Minutes")}</span></div><div><strong>${number(stats.today_sessions)}</strong><span>${t("Sessions")}</span></div></div>${leader ? `<div class="listening-stats-leader"><span>${t("Most active player today")}</span><strong>${card._esc(leader)}</strong></div>` : ""}${(Array.isArray(stats.players_today) ? stats.players_today : []).map(player => `<div class="listening-stats-row"><span>${card._esc(player.friendly_name || player.entity_id)}</span><strong>${number(player.minutes)} ${t("min")}</strong></div>`).join("")}<p>${t("Totals are measured across players and may include simultaneous playback.")}</p></section>`;
  } catch (error) {
    if (card._state.menuPage === page && body.isConnected) body.innerHTML = `<div class="state-box" role="alert">${card._esc(card._mediaControlFailureMessage(error))}</div>`;
  }
}

export function applyInterfacePreferences(card, values = {}) {
  if (values.night_mode !== undefined) card._state.mobileNightMode = values.night_mode;
  if (values.night_start !== undefined) card._state.mobileNightModeStart = values.night_start;
  if (values.night_end !== undefined) card._state.mobileNightModeEnd = values.night_end;
  if (Array.isArray(values.night_days)) card._state.mobileNightModeDays = [...values.night_days];
}
export async function saveNightPreferences(card, previous = {}) {
  if (!card._state.engineCapabilities?.interface_preferences) return true;
  try {
    const result = await card._maverickEngineCommand("interface/set", {night_mode:normalizeNightMode(card._state.mobileNightMode),night_start:card._state.mobileNightModeStart,night_end:card._state.mobileNightModeEnd,night_days:card._nightModeDays()});
    card._state.engineInterfacePreferences = result;
    return true;
  } catch(error) {
    applyInterfacePreferences(card,previous);
    card._toastError(card._mediaControlFailureMessage(error)); return false;
  }
}

