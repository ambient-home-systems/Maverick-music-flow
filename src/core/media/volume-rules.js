import { isPlayerAvailable } from "../state/players.js";

export async function renderVolumeRules(card, body) {
  const t=(en)=>card._esc(card._m(en));
  const page=card._state.menuPage;
  body.innerHTML=`<p role="status">${t("Loading volume limits…")}</p>`;
  const result=await card._maverickEngineCommand("volume_rules/get");
  if (!body.isConnected || card._state.menuPage!==page) return;
  const players=(card._state.players || []).filter(isPlayerAvailable);
  if (!players.length) { body.innerHTML=`<p>${t("No available players")}</p>`;return; }
  const rules=result.volume_rules || [];
  body.innerHTML=`<form class="smart-settings"><h2>${t("Volume limits")}</h2><p>${t("The Engine enforces these limits even when the card is closed.")}</p><label>${t("Player")}<select name="player">${players.map(player=>`<option value="${card._esc(player.entity_id)}">${card._esc(card._playerDisplayName(player))}</option>`).join("")}</select></label><label>${t("Maximum volume (%)")}<input name="volume" type="number" min="0" max="100" required></label><label>${t("Start (optional)")}<input name="start" type="time"></label><label>${t("End (optional)")}<input name="end" type="time"></label><p>${t("Leave both times empty for an all-day limit. No selected days means every day.")}</p><div>${card._nightModeDayOptions().map(([day,name])=>`<label>${card._esc(name)}<input type="checkbox" name="day" value="${day}"></label>`).join("")}</div><label>${t("Enabled")}<input name="enabled" type="checkbox"></label><button type="submit">${t("Save to Engine")}</button><button type="button" data-delete-rule>${t("Remove limit")}</button><p role="status"></p></form>`;
  const form=body.querySelector("form"), fields=form.elements, status=form.querySelector('[role="status"]');
  if (players.some(player=>player.entity_id===card._state.selectedPlayer)) fields.player.value=card._state.selectedPlayer;
  const populate=()=>{
    const rule=rules.find(item=>item.player===fields.player.value);
    fields.volume.value=rule?.max_volume ?? 100;fields.start.value=rule?.start_time || "";fields.end.value=rule?.end_time || "";fields.enabled.checked=rule?.enabled ?? true;
    form.querySelectorAll('[name="day"]').forEach(input=>input.checked=rule?.days?.includes(Number(input.value)) || false);
    form.querySelector('[data-delete-rule]').disabled=!rule;
  };
  populate();fields.player.onchange=populate;
  let busy=false;
  const submit=async(remove=false)=>{
    if (busy || !body.isConnected || card._state.menuPage!==page) return;
    if (!remove && Boolean(fields.start.value)!==Boolean(fields.end.value)) { status.textContent=card._m("Set both times or leave both empty.");return; }
    const player=fields.player.value;
    busy=true;form.querySelectorAll('button').forEach(button=>button.disabled=true);
    try {
      if (remove) await card._maverickEngineCommand("volume_rules/delete",{player});
      else await card._maverickEngineCommand("volume_rules/set",{player,max_volume:Number(fields.volume.value),start_time:fields.start.value,end_time:fields.end.value,enabled:fields.enabled.checked,days:[...form.querySelectorAll('[name="day"]:checked')].map(input=>Number(input.value))});
      if (body.isConnected && card._state.menuPage===page) await renderVolumeRules(card,body);
    } catch(error) {status.textContent=card._mediaControlFailureMessage(error);form.querySelectorAll('button').forEach(button=>button.disabled=false);}
    finally {busy=false;}
  };
  form.onsubmit=event=>{event.preventDefault();event.stopPropagation();void submit();};
  form.querySelector('[data-delete-rule]').onclick=()=>submit(true);
}
