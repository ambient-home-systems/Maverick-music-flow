// Form-editing guard shared by the wake schedule form and the night window
// form on the timers page: keeps periodic rebuilds from wiping a half-edited
// schedule.

const SCHEDULE_FORM_IDS = [
  "scheduledStartTimeInput",
  "scheduledStartPlayerSelect",
  "scheduledStartPlaylistSelect",
  "scheduledStartAfterRunSelect",
  "scheduledStartVolumeInput",
  "mobileNightStartInput",
  "mobileNightEndInput",
];

export function isScheduleFormControl(target) {
  const el = target?.closest?.("input, select, textarea");
  if (!el) return false;
  const id = el.id || "";
  if (SCHEDULE_FORM_IDS.includes(id)) return true;
  return el.dataset?.startTimerDay !== undefined || el.dataset?.settingNightDay !== undefined;
}

export function markScheduleFormControlActive(card, target = null) {
  if (!isScheduleFormControl(target)) return false;
  card._state.mobileScheduleControlActiveUntil = Date.now() + 2500;
  return true;
}

export function isScheduleFormEditing(card) {
  if (!card._state.menuOpen || card._state.menuPage !== "sleep_timer") return false;
  const active = card.shadowRoot?.activeElement;
  return isScheduleFormControl(active)
    || Date.now() < Number(card._state.mobileScheduleControlActiveUntil || 0);
}
