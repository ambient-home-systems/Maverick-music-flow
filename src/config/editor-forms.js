let editorFormDeps = {
  maverickEditorI18n: (key, _params = {}, fallback = "") => fallback || key,
  maverickEditorLabelFor: (schema = {}, labels = {}) => labels?.[schema?.name] || schema?.label || schema?.title || schema?.name || "",
  maverickEditorHelperFor: (schema = {}, helpers = {}) => helpers?.[schema?.name] || schema?.helper || "",
  detectEditorHebrew: () => false,
  visibleLanguageOptions: [],
  radioBrowserCountrySelectorOptions: (translateFn = null) => [{ value: "all", label: typeof translateFn === "function" ? translateFn("ui.all_countries") : "ui.all_countries" }],
};

export function configureMaverickEditorForms(deps = {}) {
  editorFormDeps = {
    ...editorFormDeps,
    ...deps,
  };
}
function maverickEditorI18n(key, params = {}, fallback = "") {
  return editorFormDeps.maverickEditorI18n(key, params, fallback);
}

const MaverickEditorLocale = Object.freeze({
  detectEditorHebrew() {
    return editorFormDeps.detectEditorHebrew();
  },
});

function maverickEditorLabelFor(schema = {}, labels = {}) {
  return editorFormDeps.maverickEditorLabelFor(schema, labels);
}

function maverickEditorHelperFor(schema = {}, helpers = {}) {
  return editorFormDeps.maverickEditorHelperFor(schema, helpers);
}

function visibleLanguageOptions() {
  return Array.isArray(editorFormDeps.visibleLanguageOptions) ? editorFormDeps.visibleLanguageOptions : [];
}

function maverickRadioBrowserCountrySelectorOptions(translateFn = null, language = "en") {
  return editorFormDeps.radioBrowserCountrySelectorOptions(translateFn, language);
}

export function getBaseCardConfigForm() {
  const labels = {
    card_id: maverickEditorI18n("ui.card_id", {}, "Card ID"),
    engine_mode: "Maverick Music Engine",
    engine_instance_id: "Engine instance ID",
    engine_profile_id: "Engine profile ID",
    engine_timeout_ms: "Engine timeout",
    config_entry_id: "Config Entry ID",
    active_player_helper_entity: maverickEditorI18n("ui.active_player_helper"),
    ma_interface_url: maverickEditorI18n("ui.ma_interface_path"),
    ma_interface_target: maverickEditorI18n("ui.open_interface_in"),
    show_ma_button: maverickEditorI18n("ui.show_ma_button"),
    show_theme_toggle: maverickEditorI18n("ui.show_theme_toggle"),
    cache_ttl: maverickEditorI18n("ui.cache_ttl"),
    music_assistant_timeout_ms: "Music Assistant timeout",
    lrclib_lyrics_enabled: "External lyrics (LRCLIB)",
    language: maverickEditorI18n("ui.language"),
    theme_mode: maverickEditorI18n("ui.theme_mode"),
    hotel_mode: maverickEditorI18n("ui.hotel_mode", {}, "Hotel Mode"),
    performance_profile: maverickEditorI18n("ui.performance_profile"),
    performance_mode: maverickEditorI18n("ui.performance_mode_for_weak_devices"),
    night_mode: maverickEditorI18n("ui.night_mode"),
    night_mode_auto_start: maverickEditorI18n("ui.night_start_time"),
    night_mode_auto_end: maverickEditorI18n("ui.night_end_time"),
    rtl: "RTL",
    main_opacity: maverickEditorI18n("ui.main_opacity"),
    popup_opacity: maverickEditorI18n("ui.popup_opacity"),
  };
  const helpers = {
    card_id: maverickEditorI18n("ui.card_id_helper", {}, "Unique slug (letters, digits, '-', '_'). Set this when running multiple Maverick Music dashboards in the same browser so each dashboard keeps its own player picker, theme, layout, and other in-card settings. Leave blank to share state with every other Maverick Music card in this browser (the original behaviour)."),
    engine_mode: "Maverick Music 6 requires the Maverick Music Engine integration. The card will not run without a loaded Engine.",
    engine_instance_id: "Optional instance identifier for multi-engine setups. Leave blank for the default integration instance.",
    engine_profile_id: "Optional profile identifier for future per-room, per-user, or per-dashboard Engine policies.",
    engine_timeout_ms: "Maximum milliseconds to wait for Maverick Music Engine responses during explicit Engine checks.",
    config_entry_id: maverickEditorI18n("ui.music_assistant_config_entry_id_if_you_want_direct_integration_lookup_th"),
    active_player_helper_entity: maverickEditorI18n("ui.optional_input_text_helper_updated_with_the_active_player_entity_id_for"),
    ma_interface_url: maverickEditorI18n("ui.path_used_when_opening_the_music_assistant_interface"),
    cache_ttl: maverickEditorI18n("ui.cache_duration_in_milliseconds_for_selected_data_requests"),
    music_assistant_timeout_ms: "Maximum milliseconds to wait for Music Assistant service responses before showing an error.",
    lrclib_lyrics_enabled: "Opt in to send the current track title, artist, album, and duration to https://lrclib.net when Music Assistant does not provide embedded lyrics. Disabled by default.",
    hotel_mode: maverickEditorI18n("ui.hotel_mode_helper", {}, "Minimal hotel-safe UI: player controls, volume, search, artwork browsing, and player selection only."),
    performance_profile: maverickEditorI18n("ui.performance_profile_helper"),
    performance_mode: maverickEditorI18n("ui.disables_blur_animations_dynamic_backgrounds_and_heavy_shadows_recommend"),
    main_opacity: maverickEditorI18n("ui.opacity_for_the_main_card_background"),
    popup_opacity: maverickEditorI18n("ui.opacity_for_popups_and_overlays"),
  };
  return {
    schema: [
      {
        type: "expandable",
        name: "general_section",
        title: maverickEditorI18n("ui.general_and_display"),
        flatten: true,
        schema: [
          {
            type: "grid",
            name: "general_grid",
            flatten: true,
            column_min_width: "220px",
            schema: [
              { name: "language", selector: { select: { mode: "dropdown", options: visibleLanguageOptions() } } },
              { name: "theme_mode", selector: { select: { mode: "dropdown", options: [
                { value: "auto", label: "Auto" },
                { value: "dark", label: maverickEditorI18n("ui.dark") },
                { value: "light", label: maverickEditorI18n("ui.light") },
                { value: "custom", label: maverickEditorI18n("ui.custom") },
              ] } } },
              { name: "performance_profile", selector: { select: { mode: "dropdown", options: [
                { value: "full", label: "Full" },
                { value: "high", label: "High" },
                { value: "low", label: "Low" },
                { value: "ultra_lite", label: "Ultra Lite" },
              ] } } },
              { name: "rtl", selector: { boolean: {} } },
              { name: "hotel_mode", selector: { boolean: {} } },
              { name: "main_opacity", selector: { number: { min: 0.3, max: 1, step: 0.02, mode: "box" } } },
              { name: "popup_opacity", selector: { number: { min: 0.4, max: 1, step: 0.02, mode: "box" } } },
            ],
          },
        ],
      },
      {
        type: "expandable",
        name: "connection_section",
        title: maverickEditorI18n("ui.connection_and_behavior"),
        flatten: true,
        schema: [
          {
            type: "grid",
            name: "connection_grid",
            flatten: true,
            column_min_width: "220px",
            schema: [
              { name: "card_id", selector: { text: {} } },
              { name: "engine_mode", selector: { select: { mode: "dropdown", options: [
                { value: "required", label: "Required" },
              ] } } },
              { name: "engine_instance_id", selector: { text: {} } },
              { name: "engine_profile_id", selector: { text: {} } },
              { name: "engine_timeout_ms", selector: { number: { min: 1000, max: 30000, step: 500, mode: "box" } } },
              { name: "config_entry_id", selector: { text: {} } },
              { name: "active_player_helper_entity", selector: { entity: { multiple: false, filter: [{ domain: "input_text" }] } } },
              { name: "ma_interface_url", selector: { text: {} } },
              { name: "ma_interface_target", selector: { select: { mode: "dropdown", options: [
                { value: "_self", label: "_self" },
                { value: "_blank", label: "_blank" },
              ] } } },
              { name: "show_ma_button", selector: { boolean: {} } },
              { name: "show_theme_toggle", selector: { boolean: {} } },
              { name: "cache_ttl", selector: { number: { min: 0, max: 3600000, step: 1000, mode: "box" } } },
              { name: "music_assistant_timeout_ms", selector: { number: { min: 3000, max: 60000, step: 1000, mode: "box" } } },
              { name: "lrclib_lyrics_enabled", selector: { boolean: {} } },
            ],
          },
        ],
      },
    ],
    computeLabel: (schema) => maverickEditorLabelFor(schema, labels),
    computeHelper: (schema) => maverickEditorHelperFor(schema, helpers),
    assertConfig: (config) => {
      if (!config || typeof config !== "object" || Array.isArray(config)) {
        throw new Error("Card config must be an object");
      }
    },
  };
}
export function getMobileEditorTexts() {
  const quickActionSlotLabels = {};
  const quickActionSlotHelpers = {};
  for (let index = 1; index <= 10; index += 1) {
    quickActionSlotLabels[`mobile_quick_action_${index}`] = `${maverickEditorI18n("ui.quick_actions")} ${index}`;
    quickActionSlotHelpers[`mobile_quick_action_${index}`] = maverickEditorI18n("ui.set_the_visual_order_of_quick_actions");
  }
  const playerOrderSlotLabels = {};
  const playerOrderSlotHelpers = {};
  for (let index = 1; index <= 20; index += 1) {
    playerOrderSlotLabels[`player_order_entity_${index}`] = `${maverickEditorI18n("ui.player_order")} ${index}`;
    playerOrderSlotHelpers[`player_order_entity_${index}`] = maverickEditorI18n("ui.set_custom_player_order");
  }
  const auxiliaryLabels = {};
  const auxiliaryHelpers = {};
  for (let index = 2; index <= 4; index += 1) {
    auxiliaryLabels[`aux_button_${index}_enabled`] = `${maverickEditorI18n("ui.auxiliary_button")} ${index}`;
    auxiliaryLabels[`aux_button_${index}_name`] = `${maverickEditorI18n("ui.auxiliary_button_name")} ${index}`;
    auxiliaryLabels[`aux_button_${index}_icon`] = `${maverickEditorI18n("ui.auxiliary_button_icon")} ${index}`;
    auxiliaryLabels[`aux_button_${index}_action`] = `${maverickEditorI18n("ui.auxiliary_button_action")} ${index}`;
    auxiliaryLabels[`aux_button_${index}_entity`] = `${maverickEditorI18n("ui.auxiliary_button_entity")} ${index}`;
    auxiliaryHelpers[`aux_button_${index}_enabled`] = maverickEditorI18n("ui.show_auxiliary_button_in_quick_actions");
  }
  const quickActionOptions = [
    { value: "home", label: maverickEditorI18n("ui.home") },
    { value: "search", label: maverickEditorI18n("ui.search") },
    { value: "timer", label: maverickEditorI18n("ui.timer") },
    { value: "like", label: maverickEditorI18n("ui.like_2") },
    { value: "lyrics", label: maverickEditorI18n("ui.lyrics") },
    { value: "queue", label: maverickEditorI18n("ui.queue_2") },
    { value: "queue_flow", label: maverickEditorI18n("ui.mobile_queue_flow", {}, "Queue wheel") },
    { value: "radio", label: maverickEditorI18n("ui.quick_mix") },
    { value: "voice", label: maverickEditorI18n("ui.flow_assistant", {}, "FLOW ASSISTANT") },
    { value: "history", label: maverickEditorI18n("ui.history") },
    { value: "info", label: maverickEditorI18n("ui.info") },
    { value: "disconnect_all", label: maverickEditorI18n("ui.clean_all", {}, MaverickEditorLocale.detectEditorHebrew() ? "נקה הכל" : "Clean all") },
  ];
  return {
    sections: {
      general: maverickEditorI18n("ui.general"),
      appearance: maverickEditorI18n("ui.appearance"),
      behavior: maverickEditorI18n("ui.behavior"),
      connection: maverickEditorI18n("ui.connection_and_behavior"),
      mainbar: maverickEditorI18n("ui.main_bar"),
      quickactions: maverickEditorI18n("ui.quick_actions_2"),
      library: maverickEditorI18n("ui.library_tabs"),
      announcements: maverickEditorI18n("ui.announcements"),
      voice_assistant: maverickEditorI18n("ui.flow_assistant", {}, "FLOW ASSISTANT"),
      players: maverickEditorI18n("ui.players"),
      smart_home: maverickEditorI18n("ui.smart_home"),
      screensaver: maverickEditorI18n("ui.screensaver", {}, "Screensaver"),
    },
    labels: {
      settings_source: maverickEditorI18n("ui.settings_source"),
      layout_mode: maverickEditorI18n("ui.layout_mode"),
      main_opacity: maverickEditorI18n("ui.main_opacity"),
      popup_opacity: maverickEditorI18n("ui.popup_opacity"),
      height: maverickEditorI18n("ui.card_height"),
      language: maverickEditorI18n("ui.language"),
      theme_mode: maverickEditorI18n("ui.theme_mode"),
      performance_profile: maverickEditorI18n("ui.performance_profile"),
      performance_mode: maverickEditorI18n("ui.performance_mode_for_weak_devices"),
      night_mode: maverickEditorI18n("ui.night_mode"),
      night_mode_auto_start: maverickEditorI18n("ui.night_start_time"),
      night_mode_auto_end: maverickEditorI18n("ui.night_end_time"),
      night_mode_days: maverickEditorI18n("ui.night_mode_days"),
      rtl: "RTL",
      mobile_custom_color: maverickEditorI18n("ui.accent_color"),
      mobile_dynamic_theme_mode: maverickEditorI18n("ui.dynamic_theme"),
      mobile_background_motion_mode: maverickEditorI18n("ui.background_motion"),
      mobile_custom_text_tone: maverickEditorI18n("ui.text_tone"),
      mobile_font_scale: maverickEditorI18n("ui.font_scale"),
      mobile_icon_scale: maverickEditorI18n("ui.icon_size"),
      mobile_compact_mode: maverickEditorI18n("ui.compact_mode"),
      mobile_compact_widget_mode: maverickEditorI18n("ui.compact_widget_mode", {}, "Compact widget style"),
      mobile_compact_edge_to_edge: maverickEditorI18n("ui.compact_edge_to_edge", {}, "Compact edge-to-edge expand"),
      mobile_edge_to_edge: maverickEditorI18n("ui.mobile_edge_to_edge", {}, "Phone edge-to-edge"),
      mobile_layout_mode: maverickEditorI18n("ui.mobile_layout_mode", {}, "Phone display mode"),
      mobile_cover_flow: maverickEditorI18n("ui.mobile_cover_flow", {}, "Artwork cover flow"),
      mobile_swipe_mode: maverickEditorI18n("ui.artwork_swipe"),
      mobile_footer_search_enabled: maverickEditorI18n("ui.footer_search"),
      mobile_mic_mode: maverickEditorI18n("ui.microphone_2"),
      mobile_footer_mode: maverickEditorI18n("ui.footer_style_2"),
      show_source_badge: MaverickEditorLocale.detectEditorHebrew() ? "הצגת ספק המוזיקה" : "Show music provider badge",
      show_quality_badge: MaverickEditorLocale.detectEditorHebrew() ? "הצגת איכות השמע" : "Show audio quality badge",
      fan_theme: MaverickEditorLocale.detectEditorHebrew() ? "מראה המניפה" : "Fan appearance",
      volume_wheel: MaverickEditorLocale.detectEditorHebrew() ? "גלגל עוצמה" : "Volume wheel",
      action_menu_labels: maverickEditorI18n("ui.action_menu_labels", {}, "Action menu labels"),
      player_design: MaverickEditorLocale.detectEditorHebrew() ? "עיצוב הנגן" : "Player design",
      mobile_studio_shortcut: maverickEditorI18n("ui.studio_shortcut"),
      mobile_home_shortcut: maverickEditorI18n("ui.home_shortcut"),
      mobile_home_shortcut_path: maverickEditorI18n("ui.home_shortcut_path"),
      hotel_mode: maverickEditorI18n("ui.hotel_mode", {}, "Hotel Mode"),
      mobile_volume_mode: maverickEditorI18n("ui.volume_mode"),
      mobile_volume_step_buttons: maverickEditorI18n("ui.volume_step_buttons"),
      mobile_volume_step_percent: maverickEditorI18n("ui.volume_step_percent"),
      voice_assistant_enabled: maverickEditorI18n("ui.flow_assistant", {}, "FLOW ASSISTANT"),
      voice_assistant_section: maverickEditorI18n("ui.flow_assistant", {}, "FLOW ASSISTANT"),
      voice_assistant_grid: maverickEditorI18n("ui.flow_assistant", {}, "FLOW ASSISTANT"),
      voice_assistant_mode: maverickEditorI18n("ui.voice_assistant_mode"),
      voice_assistant_agent_id: maverickEditorI18n("ui.assist_agent"),
      voice_assistant_speak_feedback: maverickEditorI18n("ui.voice_feedback"),
      flow_assistant_response_timeout_ms: "Flow Assistant response timeout",
      flow_assistant_listen_timeout_ms: "Flow Assistant listen timeout",
      flow_assistant_auto_close_ms: "Flow Assistant auto close",
      mobile_radio_source_mode: maverickEditorI18n("ui.radio_source", {}, "Radio source"),
      mobile_radio_browser_country: maverickEditorI18n("ui.radio_browser_country_2"),
      mobile_main_bar_items: maverickEditorI18n("ui.main_bar_items_2"),
      mobile_quick_actions: maverickEditorI18n("ui.quick_actions"),
      ...quickActionSlotLabels,
      mobile_library_default_layout: maverickEditorI18n("ui.default_library_layout", {}, "Default library layout"),
      mobile_library_tabs: maverickEditorI18n("ui.library_tabs_2"),
      mobile_announcement_presets: maverickEditorI18n("ui.announcement_presets"),
      mobile_announcement_volume: maverickEditorI18n("ui.announcement_volume_boost"),
      announcement_tts_entity: maverickEditorI18n("ui.tts_entity"),
      announcement_tts_language: maverickEditorI18n("ui.tts_language"),
      ambient_light_enabled: maverickEditorI18n("ui.ambient_light"),
      ambient_light_entities: maverickEditorI18n("ui.ambient_light_entities"),
      ambient_light_player_map: maverickEditorI18n("ui.ambient_light_player_map"),
      ambient_light_brightness: maverickEditorI18n("ui.ambient_light_brightness"),
      ambient_light_transition: maverickEditorI18n("ui.ambient_light_transition"),
      ambient_light_cooldown: maverickEditorI18n("ui.ambient_light_cooldown"),
      screensaver_enabled: maverickEditorI18n("ui.screensaver"),
      lrclib_lyrics_enabled: "External lyrics (LRCLIB)",
      screensaver_auto_lyrics_when_playing: maverickEditorI18n("ui.lyrics_while_playing", {}, "Lyrics while playing"),
      screensaver_controls_enabled: maverickEditorI18n("ui.screensaver_controls"),
      screensaver_control_buttons: maverickEditorI18n("ui.screensaver_buttons"),
      screensaver_clock_mode: maverickEditorI18n("ui.screensaver_clock_mode"),
      screensaver_timeout_seconds: maverickEditorI18n("ui.screensaver_timeout"),
      screensaver_message: maverickEditorI18n("ui.screensaver_message"),
      screensaver_clock_size: maverickEditorI18n("ui.screensaver_clock_size"),
      screensaver_clock_x: maverickEditorI18n("ui.screensaver_clock_x"),
      screensaver_clock_y: maverickEditorI18n("ui.screensaver_clock_y"),
      power_button_enabled: maverickEditorI18n("ui.power_button"),
      power_button_name: maverickEditorI18n("ui.auxiliary_button_name"),
      power_button_icon: maverickEditorI18n("ui.auxiliary_button_icon"),
      power_button_action: maverickEditorI18n("ui.power_button_action"),
      power_button_entity: maverickEditorI18n("ui.power_button_entity"),
      ...auxiliaryLabels,
      discovery_mode_enabled: maverickEditorI18n("ui.discovery_mode"),
      pinned_player_entities: maverickEditorI18n("ui.pinned_players"),
      pinned_player_master: MaverickEditorLocale.detectEditorHebrew() ? "נגן MASTER" : "MASTER player",
      entity_sticky: MaverickEditorLocale.detectEditorHebrew() ? "חזור ל־MASTER לאחר חוסר פעילות" : "Return to MASTER after inactivity",
      pinned_players_exclusive: MaverickEditorLocale.detectEditorHebrew() ? "מצב Exclusive" : "Exclusive mode",
      excluded_player_entities: maverickEditorI18n("ui.excluded_players"),
      player_sort_mode: maverickEditorI18n("ui.player_sort"),
      player_order_entities: maverickEditorI18n("ui.player_order"),
      ...playerOrderSlotLabels,
      card_id: maverickEditorI18n("ui.card_id", {}, "Card ID"),
      engine_mode: "Maverick Music Engine",
      engine_instance_id: "Engine instance ID",
      engine_profile_id: "Engine profile ID",
      engine_timeout_ms: "Engine timeout",
      config_entry_id: "Config Entry ID",
      active_player_helper_entity: maverickEditorI18n("ui.active_player_helper"),
      ma_interface_url: maverickEditorI18n("ui.ma_interface_path"),
      ma_interface_target: maverickEditorI18n("ui.open_interface_in"),
      show_ma_button: maverickEditorI18n("ui.show_ma_button"),
      show_theme_toggle: maverickEditorI18n("ui.show_theme_toggle"),
      cache_ttl: maverickEditorI18n("ui.cache_ttl"),
      music_assistant_timeout_ms: "Music Assistant timeout",
    },
    helpers: {
      card_id: maverickEditorI18n("ui.card_id_helper", {}, "Unique slug (letters, digits, '-', '_'). Set this when running multiple Maverick Music dashboards in the same browser so each dashboard keeps its own player picker, theme, layout, and other in-card settings. Leave blank to share state with every other Maverick Music card in this browser (the original behaviour)."),
      engine_mode: "Maverick Music 6 requires the Maverick Music Engine integration. The card will not run without a loaded Engine.",
      engine_instance_id: "Optional instance identifier for multi-engine setups. Leave blank for the default integration instance.",
      engine_profile_id: "Optional profile identifier for future per-room, per-user, or per-dashboard Engine policies.",
      engine_timeout_ms: "Maximum milliseconds to wait for Maverick Music Engine responses during explicit Engine checks.",
      settings_source: maverickEditorI18n("ui.choose_whether_settings_are_controlled_from_the_in_card_ui_or_from_the_c"),
      layout_mode: maverickEditorI18n("ui.auto_chooses_mobile_or_tablet_based_on_actual_width"),
      height: maverickEditorI18n("ui.card_height_in_pixels"),
      theme_mode: maverickEditorI18n("ui.includes_the_custom_theme_mode_from_the_in_card_settings_screen"),
      night_mode: maverickEditorI18n("ui.off_disables_it_on_keeps_it_active_and_auto_follows_the_configured_time"),
      night_mode_auto_start: maverickEditorI18n("ui.recommended_format_hh_mm_such_as_22_00"),
      night_mode_auto_end: maverickEditorI18n("ui.recommended_format_hh_mm_such_as_06_00_crossing_midnight_is_supported"),
      night_mode_days: maverickEditorI18n("ui.choose_which_days_the_auto_night_mode_window_applies_to"),
      mobile_show_up_next: maverickEditorI18n("ui.show_or_hide_the_inline_next_track_row_in_now_playing"),
      hotel_mode: maverickEditorI18n("ui.hotel_mode_helper", {}, "Minimal hotel-safe UI with only player controls, volume, search, artwork browsing, and player selection."),
      mobile_dynamic_theme_mode: maverickEditorI18n("ui.extract_colors_from_the_current_artwork_and_apply_them_to_the_interface"),
      mobile_background_motion_mode: maverickEditorI18n("ui.control_whether_the_card_background_moves_gently_and_how_strong_the_moti"),
      performance_profile: maverickEditorI18n("ui.performance_profile_helper"),
      performance_mode: maverickEditorI18n("ui.turns_off_heavy_visuals_so_the_card_runs_smoother_on_nest_hub_older_tabl"),
      mobile_font_scale: maverickEditorI18n("ui.global_scale_for_every_interface_font_1_is_the_default_size"),
      mobile_icon_scale: maverickEditorI18n("ui.scales_interface_icons_without_changing_button_sizes"),
      mobile_compact_mode: maverickEditorI18n("ui.shows_a_standalone_compact_player_tile_with_artwork_basic_controls_volum"),
      mobile_compact_widget_mode: maverickEditorI18n("ui.choose_when_compact_mode_uses_the_two_row_mobile_widget", {}, "Choose when compact mode uses the smaller two-row mobile widget."),
      mobile_compact_edge_to_edge: maverickEditorI18n("ui.compact_edge_to_edge_helper", {}, "When disabled, compact expand opens as a floating window so Home Assistant navigation remains visible."),
      mobile_edge_to_edge: maverickEditorI18n("ui.mobile_edge_to_edge_helper", {}, "When enabled, the normal phone player can occupy the full browser viewport and its menus open edge-to-edge."),
      mobile_layout_mode: maverickEditorI18n("ui.mobile_layout_mode_helper", {}, "Auto uses the available card space. Full keeps the phone player inline. Edge to edge opens the phone player over the dashboard with an exit button."),
      mobile_cover_flow: maverickEditorI18n("ui.mobile_cover_flow_helper", {}, "Adds the experimental vertical 3D cover flow to the main artwork area."),
      mobile_swipe_mode: maverickEditorI18n("ui.choose_whether_artwork_swipe_changes_track_or_browses_covers"),
      mobile_footer_search_enabled: maverickEditorI18n("ui.enable_or_disable_the_footer_search_button"),
      mobile_mic_mode: maverickEditorI18n("ui.matches_the_microphone_setting_from_the_in_card_settings_screen"),
      mobile_footer_mode: maverickEditorI18n("ui.choose_icons_text_or_both_for_the_footer"),
      mobile_studio_shortcut: maverickEditorI18n("ui.enable_or_disable_the_studio_button_in_the_footer_bar"),
      mobile_home_shortcut: maverickEditorI18n("ui.show_home_inside_quick_actions"),
      mobile_home_shortcut_path: maverickEditorI18n("ui.for_example_lovelace_home_or_any_other_home_assistant_path"),
      mobile_volume_mode: maverickEditorI18n("ui.mainly_relevant_on_larger_layouts"),
      mobile_volume_step_buttons: maverickEditorI18n("ui.show_plus_minus_buttons_next_to_the_volume_slider"),
      mobile_volume_step_percent: maverickEditorI18n("ui.volume_step_between_1_and_10_percent_default_5"),
      voice_assistant_enabled: maverickEditorI18n("ui.show_a_push_to_talk_button_for_music_and_assist_commands"),
      voice_assistant_mode: maverickEditorI18n("ui.hybrid_handles_music_locally_and_sends_unknown_commands_to_assist"),
      voice_assistant_agent_id: maverickEditorI18n("ui.optional_assist_agent_leave_empty_for_home_assistant_default"),
      voice_assistant_speak_feedback: maverickEditorI18n("ui.speak_voice_assistant_responses_out_loud"),
      flow_assistant_response_timeout_ms: "Maximum milliseconds to wait while Flow Assistant processes a captured command.",
      flow_assistant_listen_timeout_ms: "Maximum milliseconds Flow Assistant can wait for speech before showing a clear timeout.",
      flow_assistant_auto_close_ms: "Milliseconds to keep the Flow Assistant result open. Use 0 to keep it open.",
      mobile_radio_source_mode: maverickEditorI18n("ui.radio_source_helper", {}, "Choose whether the Radio tab prefers Music Assistant stations, RadioBrowser stations, or both."),
      mobile_radio_browser_country: maverickEditorI18n("ui.uses_the_same_base_country_list_shown_in_the_in_card_settings_screen"),
      mobile_main_bar_items: maverickEditorI18n("ui.choose_which_actions_appear_in_the_main_bar"),
      mobile_quick_actions: maverickEditorI18n("ui.choose_which_icons_appear_in_the_quick_action_row"),
      ...quickActionSlotHelpers,
      mobile_library_default_layout: maverickEditorI18n("ui.choose_how_library_pages_open_grid_or_list_can_still_be_changed_manually", {}, "Choose how library pages open. You can still switch Grid/List inside the library."),
      mobile_library_tabs: maverickEditorI18n("ui.choose_which_tabs_are_available_in_the_library_screen"),
      mobile_announcement_presets: maverickEditorI18n("ui.configure_ready_made_announcement_phrases"),
      mobile_announcement_volume: maverickEditorI18n("ui.adds_to_the_current_volume_only_during_announcements_then_restores_the_p"),
      mobile_custom_color: maverickEditorI18n("ui.choose_the_accent_color_for_the_mobile_layout"),
      active_player_helper_entity: maverickEditorI18n("ui.optional_input_text_helper_updated_with_the_active_player_entity_id_for_2"),
      announcement_tts_entity: maverickEditorI18n("ui.tts_entity_used_by_the_announcement_screen"),
      announcement_tts_language: maverickEditorI18n("ui.auto_leaves_home_assistant_cloud_voice_defaults_untouched_manual_choices"),
      ambient_light_enabled: maverickEditorI18n("ui.sync_selected_lights_to_the_current_artwork_color"),
      ambient_light_entities: maverickEditorI18n("ui.choose_only_the_lights_that_should_follow_the_music"),
      ambient_light_player_map: maverickEditorI18n("ui.ambient_light_player_map_helper"),
      ambient_light_brightness: maverickEditorI18n("ui.maximum_brightness_for_music_lighting"),
      ambient_light_transition: maverickEditorI18n("ui.soft_transition_time_for_music_lighting"),
      ambient_light_cooldown: maverickEditorI18n("ui.minimum_seconds_between_light_updates"),
      screensaver_enabled: maverickEditorI18n("ui.show_a_calm_clock_artwork_display_after_idle_time"),
      lrclib_lyrics_enabled: "Opt in to send the current track title, artist, album, and duration to https://lrclib.net when Music Assistant does not provide embedded lyrics. Disabled by default.",
      screensaver_auto_lyrics_when_playing: maverickEditorI18n("ui.screensaver_lyrics_while_playing_helper", {}, "When enabled, screensaver opens in lyrics mode while music is playing and stays in clock mode when idle."),
      screensaver_controls_enabled: maverickEditorI18n("ui.show_previous_next_controls_on_the_screensaver"),
      screensaver_control_buttons: maverickEditorI18n("ui.choose_which_buttons_appear_on_the_screensaver"),
      screensaver_message: maverickEditorI18n("ui.short_optional_message_shown_on_the_screensaver"),
      screensaver_clock_size: maverickEditorI18n("ui.screensaver_clock_size_helper"),
      screensaver_clock_x: maverickEditorI18n("ui.screensaver_clock_x_helper"),
      screensaver_clock_y: maverickEditorI18n("ui.screensaver_clock_y_helper"),
      power_button_enabled: maverickEditorI18n("ui.show_power_button_in_the_player_controls"),
      power_button_name: maverickEditorI18n("ui.optional_name_for_the_auxiliary_button"),
      power_button_icon: maverickEditorI18n("ui.choose_the_auxiliary_button_icon"),
      power_button_entity: maverickEditorI18n("ui.optional_entity_for_the_power_button_leave_empty_to_stop_the_active_player"),
      ...auxiliaryHelpers,
      discovery_mode_enabled: maverickEditorI18n("ui.show_the_fullscreen_discovery_mode_in_actions"),
      pinned_player_entities: maverickEditorI18n("ui.choose_music_assistant_players_only_the_in_card_pinning_list_shows_only"),
      pinned_player_master: MaverickEditorLocale.detectEditorHebrew() ? "בחר נגן ראשי אחד מתוך הנגנים המוצמדים. ה־Sticky תמיד חוזר אליו." : "Choose one primary player from the pinned players. Sticky always returns to it.",
      entity_sticky: MaverickEditorLocale.detectEditorHebrew() ? "מאפשר לבחור ולעבוד זמנית עם כל נגן זמין, ולאחר 10 שניות ללא פעולה חוזר ל־MASTER." : "Allows temporary access to any available player, then returns to MASTER after 10 idle seconds.",
      pinned_players_exclusive: MaverickEditorLocale.detectEditorHebrew() ? "כאשר מופעל, רק נגני PINNED מוצגים. כאשר כבוי, כל הנגנים הזמינים נשארים נגישים." : "When enabled, only PINNED players are shown. When disabled, every available player remains accessible.",
      excluded_player_entities: maverickEditorI18n("ui.choose_music_assistant_players_to_hide_from_the_card"),
      player_sort_mode: maverickEditorI18n("ui.choose_how_players_are_sorted"),
      player_order_entities: maverickEditorI18n("ui.set_custom_player_order"),
      ...playerOrderSlotHelpers,
      music_assistant_timeout_ms: "Maximum milliseconds to wait for Music Assistant service responses before showing an error.",
    },
    options: {
      settings_source: [
        { value: "ui", label: maverickEditorI18n("ui.in_card_ui") },
        { value: "card", label: maverickEditorI18n("ui.card_configuration") },
      ],
      layout_mode: [
        { value: "auto", label: "Auto" },
        { value: "mobile", label: maverickEditorI18n("ui.mobile") },
        { value: "tablet", label: maverickEditorI18n("ui.tablet") },
      ],
      language: visibleLanguageOptions(),
      theme_mode: [
        { value: "auto", label: "Auto" },
        { value: "dark", label: maverickEditorI18n("ui.dark") },
        { value: "light", label: maverickEditorI18n("ui.light") },
        { value: "custom", label: maverickEditorI18n("ui.custom") },
      ],
      night_mode: [
        { value: "off", label: maverickEditorI18n("ui.off") },
        { value: "auto", label: "Auto" },
        { value: "on", label: maverickEditorI18n("ui.on") },
      ],
      performance_profile: [
        { value: "full", label: "Full" },
        { value: "high", label: "High" },
        { value: "low", label: "Low" },
        { value: "ultra_lite", label: "Ultra Lite" },
      ],
      night_mode_days: [
        { value: 0, label: maverickEditorI18n("ui.sun") },
        { value: 1, label: maverickEditorI18n("ui.mon") },
        { value: 2, label: maverickEditorI18n("ui.tue") },
        { value: 3, label: maverickEditorI18n("ui.wed") },
        { value: 4, label: maverickEditorI18n("ui.thu") },
        { value: 5, label: maverickEditorI18n("ui.fri") },
        { value: 6, label: maverickEditorI18n("ui.sat") },
      ],
      mobile_custom_text_tone: [
        { value: "light", label: maverickEditorI18n("ui.light") },
        { value: "dark", label: maverickEditorI18n("ui.dark") },
      ],
      mobile_dynamic_theme_mode: [
        { value: "off", label: maverickEditorI18n("ui.off") },
        { value: "auto", label: "Auto" },
        { value: "strong", label: maverickEditorI18n("ui.strong") },
      ],
      mobile_background_motion_mode: [
        { value: "off", label: maverickEditorI18n("ui.off") },
        { value: "subtle", label: maverickEditorI18n("ui.subtle") },
        { value: "strong", label: maverickEditorI18n("ui.strong") },
        { value: "extreme", label: maverickEditorI18n("ui.extreme") },
      ],
      mobile_compact_widget_mode: [
        { value: "auto", label: "Auto" },
        { value: "full", label: maverickEditorI18n("ui.full", {}, "Full") },
        { value: "mini", label: maverickEditorI18n("ui.mini_widget", {}, "Mini widget") },
      ],
      mobile_layout_mode: [
        { value: "auto", label: "Auto" },
        { value: "full", label: maverickEditorI18n("ui.full", {}, "Full") },
        { value: "edge_to_edge", label: maverickEditorI18n("ui.edge_to_edge", {}, "Edge to edge") },
      ],
      mobile_swipe_mode: [
        { value: "play", label: maverickEditorI18n("ui.change_track") },
        { value: "browse", label: maverickEditorI18n("ui.browse_covers") },
      ],
      mobile_mic_mode: [
        { value: "on", label: maverickEditorI18n("ui.on") },
        { value: "off", label: maverickEditorI18n("ui.off") },
        { value: "smart", label: maverickEditorI18n("ui.smart") },
      ],
      announcement_tts_language: [
        { value: "auto", label: maverickEditorI18n("ui.auto_cloud_default") },
        { value: "en-US", label: "English (US)" },
        { value: "en-GB", label: "English (UK)" },
      ],
      mobile_footer_mode: [
        { value: "icon", label: maverickEditorI18n("ui.icon_only") },
        { value: "text", label: maverickEditorI18n("ui.text_only") },
        { value: "both", label: maverickEditorI18n("ui.icon_plus_text") },
      ],
      mobile_volume_mode: [
        { value: "button", label: maverickEditorI18n("ui.button") },
        { value: "always", label: maverickEditorI18n("ui.always_visible") },
      ],
      voice_assistant_mode: [
        { value: "hybrid", label: maverickEditorI18n("ui.hybrid_music_plus_assist") },
        { value: "music", label: maverickEditorI18n("ui.music_only") },
        { value: "assist", label: maverickEditorI18n("ui.assist_only") },
      ],
      mobile_radio_source_mode: [
        { value: "combined", label: "Combined" },
        { value: "ma_first", label: "Music Assistant first" },
        { value: "ma_only", label: "Music Assistant only" },
        { value: "radiobrowser_only", label: "RadioBrowser only" },
      ],
      mobile_library_default_layout: [
        { value: "grid", label: maverickEditorI18n("ui.grid") },
        { value: "list", label: maverickEditorI18n("ui.list") },
      ],
      screensaver_clock_mode: [
        { value: "digital", label: maverickEditorI18n("ui.digital") },
        { value: "analog", label: maverickEditorI18n("ui.analog") },
      ],
      screensaver_control_buttons: [
        { value: "previous", label: maverickEditorI18n("ui.previous") },
        { value: "play_pause", label: maverickEditorI18n("ui.play_pause") },
        { value: "next", label: maverickEditorI18n("ui.next") },
        { value: "mute", label: maverickEditorI18n("ui.mute") },
        { value: "power", label: maverickEditorI18n("ui.auxiliary_button") },
        { value: "like", label: maverickEditorI18n("ui.like_2") },
        { value: "lyrics", label: maverickEditorI18n("ui.lyrics") },
        { value: "lyrics_sync", label: maverickEditorI18n("ui.sync_lyrics") },
        { value: "lyrics_font_minus", label: maverickEditorI18n("ui.smaller_lyrics") },
        { value: "lyrics_font_plus", label: maverickEditorI18n("ui.larger_lyrics") },
        { value: "voice", label: maverickEditorI18n("ui.flow_assistant", {}, "FLOW ASSISTANT") },
      ],
      power_button_action: [
        { value: "stop_player", label: maverickEditorI18n("ui.stop_player") },
        { value: "toggle", label: maverickEditorI18n("ui.toggle") },
        { value: "turn_on", label: maverickEditorI18n("ui.turn_on") },
        { value: "turn_off", label: maverickEditorI18n("ui.turn_off") },
        { value: "scene", label: maverickEditorI18n("ui.scene") },
        { value: "script", label: maverickEditorI18n("ui.script") },
      ],
      auxiliary_button_icons: [
        { value: "power", label: maverickEditorI18n("ui.power") },
        { value: "home", label: maverickEditorI18n("ui.home") },
        { value: "speaker", label: maverickEditorI18n("ui.players") },
        { value: "music_note", label: maverickEditorI18n("ui.music") },
        { value: "wand", label: maverickEditorI18n("ui.surprise_me") },
        { value: "grid", label: maverickEditorI18n("ui.actions_2") },
        { value: "settings", label: maverickEditorI18n("ui.settings") },
        { value: "heart_outline", label: maverickEditorI18n("ui.like_2") },
        { value: "play", label: maverickEditorI18n("ui.play") },
        { value: "stop", label: maverickEditorI18n("ui.stop_all") },
        { value: "radio", label: maverickEditorI18n("ui.radio") },
        { value: "timer", label: maverickEditorI18n("ui.timer") },
        { value: "info", label: maverickEditorI18n("ui.info") },
      ],
      player_sort_mode: [
        { value: "default", label: maverickEditorI18n("ui.default_order") },
        { value: "alphabetical", label: maverickEditorI18n("ui.alphabetical") },
        { value: "custom", label: maverickEditorI18n("ui.custom_order") },
      ],
      ma_interface_target: [
        { value: "_self", label: "_self" },
        { value: "_blank", label: "_blank" },
      ],
      engine_mode: [
        { value: "required", label: "Required" },
      ],
      mobile_main_bar_items: [
        { value: "home", label: maverickEditorI18n("ui.home") },
        { value: "search", label: maverickEditorI18n("ui.search") },
        { value: "library", label: maverickEditorI18n("ui.library_2") },
        { value: "players", label: maverickEditorI18n("ui.players") },
        { value: "actions", label: maverickEditorI18n("ui.actions_2") },
        { value: "settings", label: maverickEditorI18n("ui.settings") },
        { value: "theme", label: maverickEditorI18n("ui.theme_toggle_2") },
      ],
      mobile_quick_actions: quickActionOptions,
      mobile_quick_action_slots: [
        { value: "", label: maverickEditorI18n("ui.none") },
        ...quickActionOptions,
      ],
      mobile_library_tabs: [
        { value: "library_search", label: maverickEditorI18n("ui.search") },
        { value: "library_playlists", label: maverickEditorI18n("ui.playlists") },
        { value: "library_artists", label: maverickEditorI18n("ui.artists") },
        { value: "library_albums", label: maverickEditorI18n("ui.albums") },
        { value: "library_tracks", label: maverickEditorI18n("ui.tracks") },
        { value: "library_radio", label: maverickEditorI18n("ui.radio") },
        { value: "library_podcasts", label: maverickEditorI18n("ui.podcasts") },
        { value: "library_liked", label: maverickEditorI18n("ui.liked") },
      ],
    },
  };
}

export function getRadioBrowserCountrySelectorOptions(translateFn = maverickEditorI18n, language = "") {
  const lang = language || (MaverickEditorLocale.detectEditorHebrew() ? "he" : "en");
  return maverickRadioBrowserCountrySelectorOptions(translateFn, lang);
}

export function getMobileCardConfigForm() {
  const t = getMobileEditorTexts();
  return {
    schema: [
      { name: "player_design", selector: { select: { mode: "dropdown", options: [
        { value: "immersive", label: MaverickEditorLocale.detectEditorHebrew() ? "Immersive — עטיפה גדולה ומניפת פעולות" : "Immersive — artwork and action fan" },
        { value: "classic", label: MaverickEditorLocale.detectEditorHebrew() ? "קלאסי — העיצוב הקיים" : "Classic — current design" },
      ] } } },
      { name: "performance_profile", selector: { select: { mode: "dropdown", options: t.options.performance_profile } } },
      {
        type: "expandable",
        name: "general_section",
        title: t.sections.general,
        flatten: true,
        schema: [
          {
            type: "grid",
            name: "general_grid",
            flatten: true,
            column_min_width: "220px",
            schema: [
              { name: "settings_source", selector: { select: { mode: "dropdown", options: t.options.settings_source } } },
              { name: "layout_mode", selector: { select: { mode: "dropdown", options: t.options.layout_mode } } },
              { name: "height", selector: { number: { min: 280, max: 1800, step: 10, mode: "box" } } },
              { name: "language", selector: { select: { mode: "dropdown", options: t.options.language } } },
              { name: "mobile_show_up_next", selector: { boolean: {} } },
              { name: "rtl", selector: { boolean: {} } },
              { name: "hotel_mode", selector: { boolean: {} } },
              { name: "mobile_compact_mode", selector: { boolean: {} } },
              { name: "mobile_layout_mode", selector: { select: { mode: "dropdown", options: t.options.mobile_layout_mode } } },
              { name: "mobile_compact_widget_mode", selector: { select: { mode: "dropdown", options: t.options.mobile_compact_widget_mode } } },
              { name: "pinned_player_entities", selector: { entity: { multiple: true, filter: [{ integration: "music_assistant", domain: "media_player" }] } } },
              { name: "pinned_player_master", selector: { entity: { multiple: false, filter: [{ integration: "music_assistant", domain: "media_player" }] } } },
              { name: "entity_sticky", selector: { boolean: {} } },
              { name: "pinned_players_exclusive", selector: { boolean: {} } },
              { name: "excluded_player_entities", selector: { entity: { multiple: true, filter: [{ integration: "music_assistant", domain: "media_player" }] } } },
              { name: "player_sort_mode", selector: { select: { mode: "dropdown", options: t.options.player_sort_mode } } },
            ],
          },
          {
            type: "grid",
            name: "player_order_grid",
            flatten: true,
            column_min_width: "220px",
            schema: [],
          },
        ],
      },
      {
        type: "expandable",
        name: "appearance_section",
        title: t.sections.appearance,
        flatten: true,
        schema: [
          {
            type: "grid",
            name: "appearance_grid",
            flatten: true,
            column_min_width: "220px",
            schema: [
              { name: "theme_mode", selector: { select: { mode: "dropdown", options: t.options.theme_mode } } },
              { name: "night_mode", selector: { select: { mode: "dropdown", options: t.options.night_mode } } },
              { name: "main_opacity", selector: { number: { min: 0.3, max: 1, step: 0.02, mode: "slider" } } },
              { name: "popup_opacity", selector: { number: { min: 0.4, max: 1, step: 0.02, mode: "slider" } } },
              { name: "mobile_custom_color", selector: { text: { type: "color" } } },
              { name: "mobile_dynamic_theme_mode", selector: { select: { mode: "dropdown", options: t.options.mobile_dynamic_theme_mode } } },
              { name: "mobile_background_motion_mode", selector: { select: { mode: "dropdown", options: t.options.mobile_background_motion_mode } } },
              { name: "mobile_custom_text_tone", selector: { select: { mode: "dropdown", options: t.options.mobile_custom_text_tone } } },
              { name: "mobile_font_scale", selector: { number: { min: 0.5, max: 1.5, step: 0.05, mode: "slider" } } },
              { name: "mobile_icon_scale", selector: { number: { min: 0.8, max: 1.25, step: 0.05, mode: "slider" } } },
              { name: "mobile_footer_mode", selector: { select: { mode: "dropdown", options: t.options.mobile_footer_mode } } },
              { name: "action_menu_labels", selector: { boolean: {} } },
              { name: "show_source_badge", selector: { boolean: {} } },
              { name: "show_quality_badge", selector: { boolean: {} } },
              { name: "volume_wheel", selector: { boolean: {} } },
              { name: "fan_theme", selector: { select: { mode: "dropdown", options: [{value:"adaptive",label:MaverickEditorLocale.detectEditorHebrew() ? "מותאם לעטיפה" : "Artwork"},{value:"dark",label:MaverickEditorLocale.detectEditorHebrew() ? "כהה" : "Dark"},{value:"light",label:MaverickEditorLocale.detectEditorHebrew() ? "בהיר" : "Light"}] } } },

            ],
          },
        ],
      },
      {
        type: "expandable",
        name: "behavior_section",
        title: t.sections.behavior,
        flatten: true,
        schema: [
          {
            type: "grid",
            name: "behavior_grid",
            flatten: true,
            column_min_width: "220px",
            schema: [
              { name: "mobile_swipe_mode", selector: { select: { mode: "dropdown", options: t.options.mobile_swipe_mode } } },
              { name: "mobile_cover_flow", selector: { boolean: {} } },
              { name: "mobile_mic_mode", selector: { select: { mode: "dropdown", options: t.options.mobile_mic_mode } } },
              { name: "mobile_home_shortcut", selector: { boolean: {} } },
              { name: "mobile_home_shortcut_path", selector: { text: {} } },
              { name: "mobile_volume_mode", selector: { select: { mode: "dropdown", options: t.options.mobile_volume_mode } } },
              { name: "mobile_volume_step_buttons", selector: { boolean: {} } },
              { name: "mobile_volume_step_percent", selector: { number: { min: 1, max: 10, step: 1, mode: "slider" } } },
              { name: "mobile_radio_source_mode", selector: { select: { mode: "dropdown", options: t.options.mobile_radio_source_mode } } },
              { name: "mobile_radio_browser_country", selector: { select: { mode: "dropdown", options: getRadioBrowserCountrySelectorOptions() } } },
            ],
          },
        ],
      },
      {
        type: "expandable",
        name: "connection_section",
        title: t.sections.connection,
        flatten: true,
        schema: [
          {
            type: "grid",
            name: "connection_grid",
            flatten: true,
            column_min_width: "220px",
            schema: [
              { name: "card_id", selector: { text: {} } },
              { name: "engine_mode", selector: { select: { mode: "dropdown", options: t.options.engine_mode } } },
              { name: "engine_instance_id", selector: { text: {} } },
              { name: "engine_profile_id", selector: { text: {} } },
              { name: "engine_timeout_ms", selector: { number: { min: 1000, max: 30000, step: 500, mode: "box" } } },
              { name: "config_entry_id", selector: { text: {} } },
              { name: "active_player_helper_entity", selector: { entity: { multiple: false, filter: [{ domain: "input_text" }] } } },
              { name: "ma_interface_url", selector: { text: {} } },
              { name: "ma_interface_target", selector: { select: { mode: "dropdown", options: t.options.ma_interface_target } } },
              { name: "show_ma_button", selector: { boolean: {} } },
              { name: "show_theme_toggle", selector: { boolean: {} } },
              { name: "cache_ttl", selector: { number: { min: 0, max: 3600000, step: 1000, mode: "box" } } },
              { name: "music_assistant_timeout_ms", selector: { number: { min: 3000, max: 60000, step: 1000, mode: "box" } } },
              { name: "lrclib_lyrics_enabled", selector: { boolean: {} } },
            ],
          },
        ],
      },
      {
        type: "expandable",
        name: "voice_assistant_section",
        title: t.sections.voice_assistant,
        helper: t.helpers.voice_assistant_enabled,
        flatten: true,
        schema: [
          {
            type: "grid",
            name: "voice_assistant_grid",
            flatten: true,
            column_min_width: "220px",
            schema: [
              { name: "voice_assistant_enabled", label: t.labels.voice_assistant_enabled, helper: t.helpers.voice_assistant_enabled, selector: { boolean: {} } },
              { name: "voice_assistant_mode", label: t.labels.voice_assistant_mode, helper: t.helpers.voice_assistant_mode, selector: { select: { mode: "dropdown", options: t.options.voice_assistant_mode } } },
              { name: "voice_assistant_agent_id", label: t.labels.voice_assistant_agent_id, helper: t.helpers.voice_assistant_agent_id, selector: { entity: { multiple: false, filter: [{ domain: "conversation" }] } } },
              { name: "voice_assistant_speak_feedback", label: t.labels.voice_assistant_speak_feedback, helper: t.helpers.voice_assistant_speak_feedback, selector: { boolean: {} } },
              { name: "flow_assistant_response_timeout_ms", label: t.labels.flow_assistant_response_timeout_ms, helper: t.helpers.flow_assistant_response_timeout_ms, selector: { number: { min: 5000, max: 60000, step: 1000, mode: "box" } } },
              { name: "flow_assistant_listen_timeout_ms", label: t.labels.flow_assistant_listen_timeout_ms, helper: t.helpers.flow_assistant_listen_timeout_ms, selector: { number: { min: 5000, max: 30000, step: 1000, mode: "box" } } },
              { name: "flow_assistant_auto_close_ms", label: t.labels.flow_assistant_auto_close_ms, helper: t.helpers.flow_assistant_auto_close_ms, selector: { number: { min: 0, max: 30000, step: 500, mode: "box" } } },
            ],
          },
        ],
      },
      {
        type: "expandable",
        name: "smart_home_section",
        title: t.sections.smart_home,
        flatten: true,
        schema: [
          {
            type: "grid",
            name: "smart_home_grid",
            flatten: true,
            column_min_width: "220px",
            schema: [
              { name: "ambient_light_enabled", selector: { boolean: {} } },
              { name: "ambient_light_entities", selector: { entity: { multiple: true, filter: [{ domain: "light" }] } } },
              { name: "ambient_light_player_map", selector: { text: { multiple: true } } },
              { name: "ambient_light_brightness", selector: { number: { min: 1, max: 100, step: 1, mode: "slider" } } },
              { name: "ambient_light_transition", selector: { number: { min: 0, max: 120, step: 1, mode: "box" } } },
              { name: "ambient_light_cooldown", selector: { number: { min: 0, max: 120, step: 1, mode: "box" } } },
              { name: "power_button_enabled", selector: { boolean: {} } },
              { name: "power_button_name", selector: { text: {} } },
              { name: "power_button_icon", selector: { icon: {} } },
              { name: "power_button_action", selector: { select: { mode: "dropdown", options: t.options.power_button_action } } },
              { name: "power_button_entity", selector: { entity: { multiple: false } } },
              ...Array.from({ length: 3 }, (_, offset) => {
                const index = offset + 2;
                return [
                  { name: `aux_button_${index}_enabled`, selector: { boolean: {} } },
                  { name: `aux_button_${index}_name`, selector: { text: {} } },
                  { name: `aux_button_${index}_icon`, selector: { icon: {} } },
                  { name: `aux_button_${index}_action`, selector: { select: { mode: "dropdown", options: t.options.power_button_action } } },
                  { name: `aux_button_${index}_entity`, selector: { entity: { multiple: false } } },
                ];
              }).flat(),
              { name: "discovery_mode_enabled", selector: { boolean: {} } },
            ],
          },
        ],
      },
      {
        type: "expandable",
        name: "screensaver_section",
        title: t.sections.screensaver,
        flatten: true,
        schema: [
          {
            type: "grid",
            name: "screensaver_grid",
            flatten: true,
            column_min_width: "220px",
            schema: [
              { name: "screensaver_enabled", selector: { boolean: {} } },
              { name: "lrclib_lyrics_enabled", selector: { boolean: {} } },
              { name: "screensaver_auto_lyrics_when_playing", selector: { boolean: {} } },
              { name: "screensaver_controls_enabled", selector: { boolean: {} } },
              { name: "screensaver_control_buttons", selector: { select: { multiple: true, mode: "list", options: t.options.screensaver_control_buttons } } },
              { name: "screensaver_clock_mode", selector: { select: { mode: "dropdown", options: t.options.screensaver_clock_mode } } },
              { name: "screensaver_clock_size", selector: { number: { min: 0.75, max: 1.45, step: 0.05, mode: "slider" } } },
              { name: "screensaver_clock_x", selector: { number: { min: 8, max: 92, step: 1, mode: "slider" } } },
              { name: "screensaver_clock_y", selector: { number: { min: 8, max: 70, step: 1, mode: "slider" } } },
              { name: "screensaver_timeout_seconds", selector: { number: { min: 15, max: 3600, step: 5, mode: "box" } } },
              { name: "screensaver_message", selector: { text: {} } },
            ],
          },
        ],
      },
      {
        type: "expandable",
        name: "mainbar_section",
        title: t.sections.mainbar,
        flatten: true,
        schema: [
          {
            name: "mobile_main_bar_items",
            selector: {
              select: {
                multiple: true,
                mode: "list",
                options: t.options.mobile_main_bar_items,
              },
            },
          },
          { name: "mobile_studio_shortcut", selector: { boolean: {} } },
        ],
      },
      {
        type: "expandable",
        name: "quickactions_section",
        title: t.sections.quickactions,
        flatten: true,
        schema: [
          {
            name: "mobile_quick_actions",
            selector: {
              select: {
                multiple: true,
                mode: "list",
                options: t.options.mobile_quick_actions,
              },
            },
          },
          {
            type: "grid",
            name: "quickactions_order_grid",
            flatten: true,
            column_min_width: "180px",
            schema: Array.from({ length: 10 }, (_, index) => ({
              name: `mobile_quick_action_${index + 1}`,
              selector: {
                select: {
                  mode: "dropdown",
                  options: t.options.mobile_quick_action_slots,
                },
              },
            })),
          },
        ],
      },
      {
        type: "expandable",
        name: "library_section",
        title: t.sections.library,
        flatten: true,
        schema: [
          { name: "mobile_library_default_layout", selector: { select: { mode: "dropdown", options: t.options.mobile_library_default_layout } } },
          {
            name: "mobile_library_tabs",
            selector: {
              select: {
                multiple: true,
                mode: "list",
                options: t.options.mobile_library_tabs,
              },
            },
          },
        ],
      },
      {
        type: "expandable",
        name: "announcements_section",
        title: t.sections.announcements,
        flatten: true,
        schema: [
          {
            type: "grid",
            name: "announcements_grid",
            flatten: true,
            column_min_width: "220px",
            schema: [
              { name: "mobile_announcement_presets", selector: { text: { multiple: true } } },
              { name: "mobile_announcement_volume", selector: { number: { min: 20, max: 50, step: 1, mode: "slider" } } },
              { name: "announcement_tts_entity", selector: { entity: { multiple: false } } },
              { name: "announcement_tts_language", selector: { select: { mode: "dropdown", options: t.options.announcement_tts_language } } },
            ],
          },
        ],
      },
    ],
    computeLabel: (schema) => maverickEditorLabelFor(schema, t.labels),
    computeHelper: (schema) => maverickEditorHelperFor(schema, t.helpers),
    assertConfig: (config) => {
      if (!config || typeof config !== "object" || Array.isArray(config)) {
        throw new Error("Card config must be an object");
      }
    },
  };
}
