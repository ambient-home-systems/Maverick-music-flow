export async function renderSavedPlaylists(card, body, entry = null) {
  const page = card._state.menuPage;
  const current = () => body.isConnected && card._state.menuPage === page && (!entry || card._state.mobileQueueActionEntry === entry);
  const t = (en) => card._esc(card._m(en));
  body.innerHTML = `<p role="status">${t("Loading saved playlists…")}</p>`;
  const lists = await card._maverickEngineCommand("playlists", {action:"list"});
  if (!current()) return;
  const uris = entry ? [entry.uri] : card._getNowPlayingQueueItems().map(item => card._getQueueItemUri(item)).filter(Boolean);
  body.innerHTML = `<section class="smart-settings"><h2>${t("Engine playlists")}</h2><p>${t("Saved in Home Assistant and available across your devices.")}</p><form data-saved-playlist-form><label>${t("Playlist name")}<input name="name" maxlength="120" required></label><button type="submit" ${uris.length ? "" : "disabled"}>${t(entry ? "Save this item as a playlist" : "Save current queue")}</button></form><p role="status"></p><div class="smart-hub-grid">${lists.map((list,index)=>`<button data-saved-playlist="${index}"><span>${card._esc(list.name)}</span><small>${list.uris.length} ${t("items")}</small></button>`).join("")}</div></section>`;
  const status = body.querySelector('[role="status"]');
  let pending = false;
  const run = async action => {
    if (pending || !current()) return;
    pending = true; const controls = [...body.querySelectorAll("button")];
    const previous = controls.map(button=>button.disabled); controls.forEach(button=>button.disabled=true);
    status.textContent=card._m("Saving…");
    try { await action(); }
    catch(error) { status.textContent=card._mediaControlFailureMessage(error); }
    finally { pending=false;controls.forEach((button,index)=>button.disabled=previous[index]); }
  };
  body.querySelector("form").onsubmit = event => {
    event.preventDefault(); event.stopPropagation();
    const name = event.target.elements.name.value.trim(); if (!name || !uris.length) return;
    void run(async()=>{await card._maverickEngineCommand("playlists",{action:"save",name,uris});if (current()) await renderSavedPlaylists(card,body,entry);});
  };
  body.querySelectorAll("[data-saved-playlist]").forEach(button=>button.onclick=()=>run(async()=>{
    const list=lists[Number(button.dataset.savedPlaylist)];
    if (entry) {
      await card._maverickEngineCommand("playlists",{action:"save",playlist_id:list.id,name:list.name,uris:[...list.uris,entry.uri]});
      status.textContent=card._m("Added to playlist");
    } else {
      status.textContent=card._m("Starting playback…");
      await card._maverickEngineCommand("playlists",{action:"play",playlist_id:list.id});
      status.textContent=card._m("Playback request accepted");
    }
  }));
  if (!entry) body.querySelectorAll("[data-saved-playlist]").forEach(button=>{
    const list=lists[Number(button.dataset.savedPlaylist)];
    const row=document.createElement("div"); row.className="saved-playlist-row";
    button.replaceWith(row);row.append(button);
    const remove=document.createElement("button");remove.type="button";
    remove.textContent=card._m("Delete");remove.setAttribute("aria-label",`${card._m("Delete")} ${list.name}`);
    remove.onclick=()=>{
      if (remove.dataset.confirm !== "yes") { remove.dataset.confirm="yes";remove.textContent=card._m("Confirm delete");return; }
      return run(async()=>{await card._maverickEngineCommand("playlists",{action:"delete",playlist_id:list.id});if (current()) await renderSavedPlaylists(card,body);});
    };
    row.append(remove);
  });
}

export async function openPlaylistDestination(card, entry) {
  const layout = card.$("mobileQueueActionSheet")?.querySelector(".media-action-layout");
  if (!layout) return;
  layout.innerHTML = `<p role="status">${card._esc(card._m("Loading editable playlists…"))}</p>`;
  const playlists = [];
  for (let offset = 0; ; offset += 500) {
    const result = await card._callEngineMaCommand("music/playlists/library_items", { limit:500, offset, summary:false });
    if (!layout.isConnected || card._state.mobileQueueActionEntry !== entry) return;
    const batch = Array.isArray(result) ? result : result?.items || [];
    playlists.push(...batch.filter(item=>item.is_editable === true));
    if (batch.length < 500) break;
  }
  layout.innerHTML = `<h3>${card._esc(card._m("Add to playlist"))}</h3><p>${card._esc(entry.name || "")}</p>
    <select aria-label="${card._esc(card._m("Playlist"))}" class="playlist-destination">${playlists.map((item,index)=>`<option value="${index}">${card._esc(item.name)}</option>`).join("")}</select>
    <p role="status">${playlists.length ? "" : card._esc(card._m("No editable playlists found in the MA library."))}</p>
    <button type="button" class="queue-action-item" data-playlist-save ${playlists.length ? "" : "disabled"}>${card._esc(card._m("Add"))}</button>
    <button type="button" class="queue-action-item" data-playlist-back>${card._esc(card._m("Back"))}</button>`;
  layout.querySelector("[data-playlist-back]").onclick = ()=>card._openMobileMediaActionMenu(entry);
  if (card._state.engineCapabilities?.saved_playlists) {
    const button=document.createElement("button");button.className="queue-action-item";
    button.textContent=card._m("Save in Engine");
    button.onclick=()=>renderSavedPlaylists(card,layout,entry).catch(error=>card._toastError(card._mediaControlFailureMessage(error)));
    layout.append(button);
  }
  let saving = false;
  layout.querySelector("[data-playlist-save]").onclick = async () => {
    const playlist = playlists[Number(layout.querySelector("select").value)];
    if (saving || !layout.isConnected || !playlist || card._state.mobileQueueActionEntry !== entry) return;
    saving = true;
    const controls = layout.querySelectorAll("button,select"); controls.forEach(button=>{button.disabled=true;});
    try {
      await card._callEngineMaCommand("music/playlists/add_playlist_tracks", { db_playlist_id:playlist.item_id, uris:[entry.uri] });
      layout.querySelector('[role="status"]').textContent = card._m("Music Assistant accepted the playlist update.");
      layout.querySelector("[data-playlist-back]").disabled=false;
    } catch (error) { saving = false; controls.forEach(button=>{button.disabled=false;}); card._toastError(card._mediaControlFailureMessage(error)); }
  };
}
