// Voice assistant styles: the Flow Assistant dialog, the smart voice confirm
// sheet, the empty-state mic and the library search mic. The player mic FAB
// stays in player.js so it keeps its place before the light-theme FAB rules.
// Order is preserved by card-styles.js.
export default function() {
  return `        .smart-voice-sheet {
          width:min(100%, 520px);
          gap:18px;
        }
        .smart-voice-head {
          display:grid;
          gap:6px;
          text-align:center;
        }
        .smart-voice-title {
          font-size:22px;
          font-weight:950;
        }
        .smart-voice-target {
          color:var(--muted);
          font-size:13px;
          font-weight:800;
        }
        .smart-voice-card {
          display:grid;
          gap:12px;
          padding:18px;
          border-radius:24px;
          background:rgba(255,255,255,.06);
          border:1px solid rgba(255,255,255,.1);
          text-align:center;
        }
        .theme-light .smart-voice-card {
          background:rgba(255,255,255,.82);
          border-color:rgba(147,161,183,.18);
        }
        .smart-voice-chip {
          width:fit-content;
          max-width:100%;
          margin:0 auto;
          display:inline-flex;
          align-items:center;
          gap:8px;
          padding:8px 14px;
          border-radius:999px;
          background:color-mix(in srgb, var(--ma-accent) 14%, rgba(255,255,255,.08));
          color:var(--ma-accent);
          font-size:12px;
          font-weight:900;
        }
        .smart-voice-chip .ui-ic { width:16px; height:16px; }
        .smart-voice-name {
          font-size:24px;
          font-weight:950;
          line-height:1.15;
        }
        .smart-voice-sub {
          color:var(--muted);
          font-size:14px;
          line-height:1.5;
        }
        .smart-voice-countdown {
          width:72px;
          height:72px;
          margin:6px auto 0;
          border-radius:50%;
          display:grid;
          place-items:center;
          background:color-mix(in srgb, var(--ma-accent) 16%, rgba(255,255,255,.08));
          border:1px solid color-mix(in srgb, var(--ma-accent) 28%, rgba(255,255,255,.12));
          color:var(--ma-accent);
          font-size:28px;
          font-weight:950;
          box-shadow:0 18px 34px rgba(0,0,0,.14);
        }
        .smart-voice-actions {
          grid-template-columns:repeat(3, minmax(0, 1fr));
        }
        .voice-assistant-dialog {
          position:absolute;
          inset:0;
          z-index:86;
          display:none;
          align-items:center;
          justify-content:center;
          padding:20px;
          pointer-events:none;
          background:rgba(2,6,14,.16);
          backdrop-filter:blur(8px) saturate(1.08);
          -webkit-backdrop-filter:blur(8px) saturate(1.08);
        }
        .voice-assistant-dialog.open {
          display:flex;
        }
        .voice-assistant-dialog.keep-screensaver {
          z-index:96;
          background:transparent;
          backdrop-filter:none;
          -webkit-backdrop-filter:none;
        }
        :host(.screensaver-page-open) .voice-assistant-dialog.keep-screensaver {
          position:fixed !important;
          inset:0 !important;
          width:100vw !important;
          height:100dvh !important;
          z-index:2147483202 !important;
          display:flex;
          padding:max(18px, env(safe-area-inset-top)) max(18px, env(safe-area-inset-right)) max(18px, env(safe-area-inset-bottom)) max(18px, env(safe-area-inset-left));
          pointer-events:none;
          background:transparent;
          backdrop-filter:none;
          -webkit-backdrop-filter:none;
        }
        :host(.screensaver-page-open) .voice-assistant-dialog.keep-screensaver .voice-assistant-panel {
          pointer-events:auto;
        }
        .voice-assistant-panel {
          position:relative;
          width:min(560px, calc(100% - 18px));
          display:grid;
          gap:18px;
          padding:22px;
          border-radius:34px;
          overflow:hidden;
          border:1px solid rgba(255,255,255,.18);
          background:
            linear-gradient(145deg, rgba(255,255,255,.16), rgba(255,255,255,.045) 42%, rgba(255,255,255,.08)),
            radial-gradient(circle at 18% 0%, color-mix(in srgb, var(--ma-accent) 22%, transparent), transparent 42%),
            rgba(8,12,22,.78);
          box-shadow:0 34px 92px rgba(0,0,0,.46), inset 0 1px 0 rgba(255,255,255,.16);
          backdrop-filter:blur(30px) saturate(1.18);
          -webkit-backdrop-filter:blur(30px) saturate(1.18);
          pointer-events:auto;
          color:#fff;
          animation:voiceAssistantPanelIn .26s cubic-bezier(.2,.85,.22,1) both;
          transform-origin:center;
        }
        .voice-assistant-dialog.keep-screensaver .voice-assistant-panel {
          width:min(520px, calc(100% - 28px));
          background:
            linear-gradient(145deg, rgba(255,255,255,.13), rgba(255,255,255,.035) 44%, rgba(255,255,255,.065)),
            radial-gradient(circle at 18% 0%, color-mix(in srgb, var(--ma-accent) 18%, transparent), transparent 42%),
            rgba(8,12,22,.66);
          box-shadow:0 26px 72px rgba(0,0,0,.38), inset 0 1px 0 rgba(255,255,255,.14);
        }
        .voice-assistant-panel::before {
          content:"";
          position:absolute;
          inset:0;
          pointer-events:none;
          background:linear-gradient(120deg, rgba(255,255,255,.18), transparent 28%, transparent 68%, rgba(255,255,255,.08));
          opacity:.42;
        }
        .voice-assistant-panel > * {
          position:relative;
          z-index:1;
        }
        @keyframes voiceAssistantPanelIn {
          from { opacity:0; transform:translateY(18px) scale(.96); filter:blur(8px); }
          to { opacity:1; transform:translateY(0) scale(1); filter:blur(0); }
        }
        .theme-light .voice-assistant-panel {
          background:
            linear-gradient(145deg, rgba(255,255,255,.94), rgba(255,255,255,.74)),
            radial-gradient(circle at 18% 0%, color-mix(in srgb, var(--ma-accent) 18%, transparent), transparent 42%);
          border-color:rgba(105,119,142,.18);
          color:#17202d;
          box-shadow:0 28px 76px rgba(86,103,127,.26), inset 0 1px 0 rgba(255,255,255,.78);
        }
        .theme-light .voice-assistant-brand {
          color:rgba(31,38,51,.42);
        }
        .voice-assistant-head {
          display:flex;
          align-items:center;
          justify-content:space-between;
          gap:12px;
        }
        .voice-assistant-title-row {
          min-width:0;
          display:flex;
          align-items:center;
          gap:12px;
        }
        .voice-assistant-copy {
          min-width:0;
          display:grid;
          gap:3px;
        }
        .voice-assistant-brand {
          width:94px;
          max-width:42vw;
          color:rgba(255,255,255,.58);
          opacity:.9;
          display:block;
          pointer-events:none;
        }
        .voice-assistant-icon {
          width:58px;
          height:58px;
          border-radius:24px;
          display:grid;
          place-items:center;
          color:var(--ma-accent);
          border:1px solid color-mix(in srgb, var(--ma-accent) 28%, rgba(255,255,255,.16));
          background:
            linear-gradient(145deg, rgba(255,255,255,.18), rgba(255,255,255,.055)),
            color-mix(in srgb, var(--ma-accent) 18%, rgba(255,255,255,.08));
          box-shadow:0 18px 38px color-mix(in srgb, var(--ma-accent) 16%, transparent), inset 0 1px 0 rgba(255,255,255,.16);
          transition:transform .2s ease, background-color .2s ease, box-shadow .2s ease;
        }
        .voice-assistant-dialog.status-listening .voice-assistant-icon {
          animation:voiceAssistantIconPulse 1.25s ease-in-out infinite;
        }
        .voice-assistant-dialog.status-success .voice-assistant-icon {
          transform:scale(1.05);
          color:#c9ffdf;
          background:rgba(73,214,127,.18);
          box-shadow:0 16px 32px rgba(73,214,127,.16);
        }
        .voice-assistant-dialog.status-error .voice-assistant-icon {
          color:#ffb7b7;
          background:rgba(255,107,107,.16);
          box-shadow:0 16px 32px rgba(255,107,107,.14);
        }
        @keyframes voiceAssistantIconPulse {
          0%,100% { transform:scale(1); box-shadow:0 18px 38px color-mix(in srgb, var(--ma-accent) 16%, transparent), inset 0 1px 0 rgba(255,255,255,.16); }
          50% { transform:scale(1.06); box-shadow:0 0 0 12px color-mix(in srgb, var(--ma-accent) 10%, transparent), 0 24px 48px color-mix(in srgb, var(--ma-accent) 20%, transparent), inset 0 1px 0 rgba(255,255,255,.18); }
        }
        .voice-assistant-icon .ui-ic { width:25px; height:25px; }
        .voice-assistant-title {
          display:block;
          font-size:22px;
          font-weight:950;
          line-height:1.1;
          letter-spacing:0;
        }
        .voice-assistant-status {
          display:block;
          margin-top:4px;
          color:rgba(255,255,255,.66);
          font-size:12px;
          font-weight:850;
        }
        .theme-light .voice-assistant-status { color:rgba(36,45,58,.64); }
        .voice-assistant-close {
          width:42px;
          height:42px;
          border-radius:16px;
          border:1px solid rgba(255,255,255,.14);
          background:rgba(255,255,255,.08);
          color:inherit;
          display:grid;
          place-items:center;
          cursor:pointer;
        }
        .theme-light .voice-assistant-close {
          background:rgba(255,255,255,.72);
          border-color:rgba(105,119,142,.16);
        }
        .voice-assistant-close .ui-ic { width:19px; height:19px; }
        .voice-assistant-meter {
          height:5px;
          border-radius:999px;
          overflow:hidden;
          background:rgba(255,255,255,.095);
        }
        .voice-assistant-meter span {
          display:block;
          width:42%;
          height:100%;
          border-radius:999px;
          background:linear-gradient(90deg, transparent, var(--ma-accent), transparent);
          animation:voiceAssistantMeter 1.2s ease-in-out infinite;
        }
        .voice-assistant-dialog.status-success .voice-assistant-meter span,
        .voice-assistant-dialog.status-error .voice-assistant-meter span {
          width:100%;
          animation:none;
          background:var(--ma-accent);
        }
        .voice-assistant-dialog.status-error .voice-assistant-meter span {
          background:#ff6b6b;
        }
        @keyframes voiceAssistantMeter {
          0% { transform:translateX(-110%); }
          100% { transform:translateX(260%); }
        }
        .voice-assistant-wave {
          display:flex;
          align-items:center;
          justify-content:center;
          gap:6px;
          width:max-content;
          min-width:118px;
          height:38px;
          margin:0 auto;
          padding:0 16px;
          border-radius:999px;
          background:rgba(255,255,255,.065);
          border:1px solid rgba(255,255,255,.08);
        }
        .voice-assistant-wave span {
          width:5px;
          height:10px;
          border-radius:999px;
          background:color-mix(in srgb, var(--ma-accent) 72%, white 28%);
          opacity:.72;
          transform-origin:center;
          animation:voiceAssistantWave 1s ease-in-out infinite;
        }
        .voice-assistant-wave span:nth-child(2) { animation-delay:.1s; }
        .voice-assistant-wave span:nth-child(3) { animation-delay:.2s; }
        .voice-assistant-wave span:nth-child(4) { animation-delay:.3s; }
        .voice-assistant-wave span:nth-child(5) { animation-delay:.4s; }
        .voice-assistant-dialog.status-processing .voice-assistant-wave span {
          animation-duration:.72s;
        }
        .voice-assistant-dialog.status-success .voice-assistant-wave span,
        .voice-assistant-dialog.status-error .voice-assistant-wave span {
          animation:none;
          height:8px;
          opacity:.36;
        }
        @keyframes voiceAssistantWave {
          0%,100% { transform:scaleY(.62); opacity:.42; }
          50% { transform:scaleY(2.25); opacity:1; }
        }
        .voice-assistant-lines {
          display:grid;
          gap:10px;
        }
        .voice-assistant-line {
          display:grid;
          gap:6px;
          padding:13px 15px;
          border-radius:20px;
          background:rgba(255,255,255,.062);
          border:1px solid rgba(255,255,255,.085);
          box-shadow:inset 0 1px 0 rgba(255,255,255,.045);
        }
        .theme-light .voice-assistant-line {
          background:rgba(255,255,255,.72);
          border-color:rgba(105,119,142,.12);
        }
        .voice-assistant-line-label {
          color:rgba(255,255,255,.56);
          font-size:11px;
          font-weight:950;
          text-transform:uppercase;
        }
        .theme-light .voice-assistant-line-label { color:rgba(36,45,58,.52); }
        .voice-assistant-line-text {
          min-height:22px;
          font-size:15px;
          font-weight:850;
          line-height:1.45;
          overflow-wrap:anywhere;
        }
        .voice-assistant-placeholder {
          color:rgba(255,255,255,.45);
        }
        .theme-light .voice-assistant-placeholder { color:rgba(36,45,58,.42); }
        .voice-assistant-actions {
          display:flex;
          gap:10px;
          justify-content:flex-end;
          flex-wrap:wrap;
        }
        .voice-assistant-actions button {
          min-height:42px;
          padding:0 15px;
          border-radius:14px;
          border:1px solid rgba(255,255,255,.12);
          background:rgba(255,255,255,.08);
          color:inherit;
          font-weight:900;
          cursor:pointer;
        }
        .voice-assistant-actions button[hidden] {
          display:none !important;
        }
        .voice-assistant-actions .primary {
          color:#17120a;
          border-color:transparent;
          background:linear-gradient(135deg, var(--ma-accent), color-mix(in srgb, var(--ma-accent) 72%, white 28%));
        }
        .empty-voice-btn {
          position:absolute;
          inset-inline-end:-8px;
          inset-block-end:-8px;
          z-index:4;
          width:46px;
          height:46px;
          border-radius:999px;
          border:1px solid color-mix(in srgb, var(--ma-accent) 28%, rgba(255,255,255,.16));
          background:linear-gradient(180deg, rgba(255,255,255,.16), rgba(255,255,255,.07));
          color:#fff7df;
          display:grid;
          place-items:center;
          cursor:pointer;
          box-shadow:0 14px 28px rgba(0,0,0,.24), 0 0 0 5px rgba(255,255,255,.045), inset 0 1px 0 rgba(255,255,255,.14);
          backdrop-filter:blur(16px) saturate(130%);
          -webkit-backdrop-filter:blur(16px) saturate(130%);
          transition:transform .16s ease, border-color .18s ease, background .18s ease, box-shadow .18s ease, color .18s ease;
        }
        .empty-voice-btn .ui-ic {
          width:20px;
          height:20px;
        }
        .empty-voice-btn:hover,
        .empty-voice-btn.listening,
        .empty-voice-btn.pressed,
        .empty-voice-btn.busy {
          color:#fff;
          border-color:color-mix(in srgb, var(--ma-accent) 54%, rgba(255,255,255,.18));
          background:linear-gradient(180deg, color-mix(in srgb, var(--ma-accent) 28%, rgba(255,255,255,.14)), rgba(255,255,255,.07));
          box-shadow:0 16px 32px color-mix(in srgb, var(--ma-accent) 20%, rgba(0,0,0,.22)), 0 0 0 7px color-mix(in srgb, var(--ma-accent) 10%, transparent), inset 0 1px 0 rgba(255,255,255,.16);
        }
        .empty-voice-btn.pressed,
        .empty-voice-btn.busy {
          transform:scale(.94);
        }
        .empty-voice-btn.busy {
          cursor:progress;
        }
        .empty-voice-btn.listening::after {
          content:"";
          position:absolute;
          inset:-8px;
          border-radius:inherit;
          border:1px solid color-mix(in srgb, var(--ma-accent) 44%, transparent);
          animation:voiceAssistantListenPulse 1.1s ease-out infinite;
        }
        .empty-voice-btn.busy:not(.listening)::after {
          content:"";
          position:absolute;
          inset:-6px;
          border-radius:inherit;
          border:1px solid color-mix(in srgb, var(--ma-accent) 38%, transparent);
          animation:voiceAssistantListenPulse 1s ease-out infinite;
          pointer-events:none;
        }
        .card.layout-tablet .empty-voice-btn {
          width:50px;
          height:50px;
          inset-inline-end:-10px;
          inset-block-end:-10px;
        }
        .theme-light .empty-voice-btn {
          color:#7a5210;
          background:linear-gradient(180deg, rgba(255,255,255,.88), rgba(239,244,250,.68));
          border-color:color-mix(in srgb, var(--ma-accent) 30%, rgba(147,161,183,.2));
          box-shadow:0 14px 28px rgba(111,126,150,.14), 0 0 0 5px rgba(255,255,255,.45), inset 0 1px 0 rgba(255,255,255,.78);
        }
        .theme-light .empty-voice-btn:hover,
        .theme-light .empty-voice-btn.listening {
          color:#6e4b10;
          background:linear-gradient(180deg, color-mix(in srgb, var(--ma-accent) 16%, white 84%), rgba(255,255,255,.8));
          box-shadow:0 16px 32px color-mix(in srgb, var(--ma-accent) 14%, rgba(111,126,150,.14)), 0 0 0 7px color-mix(in srgb, var(--ma-accent) 8%, transparent), inset 0 1px 0 rgba(255,255,255,.82);
        }
        .media-voice-btn {
          width:38px;
          height:38px;
          border:none;
          border-radius:14px;
          display:grid;
          place-items:center;
          color:#18120a;
          background:linear-gradient(135deg, var(--ma-accent), color-mix(in srgb, var(--ma-accent) 72%, white 28%));
          box-shadow:0 10px 20px color-mix(in srgb, var(--ma-accent) 18%, transparent);
          cursor:pointer;
          transition:transform .16s ease, box-shadow .16s ease, opacity .16s ease;
        }
        .media-voice-btn .ui-ic { width:19px; height:19px; }
        .media-voice-btn:active { transform:scale(.94); }
        .media-voice-btn.unsupported { opacity:.52; filter:saturate(.55); }
        .media-voice-btn.listening {
          animation:voicePulse 1s ease-in-out infinite;
          box-shadow:0 0 0 8px color-mix(in srgb, var(--ma-accent) 14%, transparent), 0 14px 26px color-mix(in srgb, var(--ma-accent) 22%, transparent);
        }
        @keyframes voicePulse {
          0%,100% { transform:scale(1); }
          50% { transform:scale(1.07); }
        }
`;
}
