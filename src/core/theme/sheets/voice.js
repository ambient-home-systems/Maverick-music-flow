// voice styles. Order is preserved by card-styles.js.
export default function() {
  return `.maverick-loading-state.compact {
          min-height:120px;
        }
        .maverick-loading-content {
          display:grid;
          justify-items:center;
          gap:12px;
        }
        .maverick-loading-mark {
          position:relative;
          width:72px;
          height:72px;
          display:grid;
          place-items:center;
          filter:drop-shadow(0 18px 32px rgba(0,0,0,.20));
        }
        .maverick-loading-ring {
          position:absolute;
          inset:8px;
          border-radius:999px;
          border:2px solid rgba(255,255,255,.10);
          border-top-color:color-mix(in srgb, var(--ma-accent) 88%, #fff 8%);
          animation:maverickLoadingSpin 1.4s linear infinite;
        }
        .maverick-loading-ring.secondary {
          inset:18px;
          opacity:.58;
          animation-duration:2.1s;
          animation-direction:reverse;
        }
        .maverick-loading-core {
          width:15px;
          height:15px;
          border-radius:999px;
          background:var(--ma-accent);
          box-shadow:0 0 26px color-mix(in srgb, var(--ma-accent) 58%, transparent);
          animation:maverickLoadingPulse 1.2s ease-in-out infinite;
        }
        .maverick-loading-text {
          color:var(--ma-text-2);
          font-size:13px;
          font-weight:850;
        }
        @keyframes maverickLoadingSpin { to { transform:rotate(360deg); } }
        @keyframes maverickLoadingPulse {
          0%,100% { transform:scale(.86); opacity:.62; }
          50% { transform:scale(1.08); opacity:1; }
        }
        @media (prefers-reduced-motion: reduce) {
          .maverick-loading-ring,
          .maverick-loading-core {
            animation:none;
          }
        }
        .menu-backdrop {
          position:absolute; inset:0; z-index:30; display:none; align-items:stretch; justify-content:center;
          padding:max(30px, env(safe-area-inset-top)) max(10px, env(safe-area-inset-right)) max(12px, env(safe-area-inset-bottom)) max(10px, env(safe-area-inset-left));
          background:rgba(8,10,16,.48); backdrop-filter:blur(18px); -webkit-backdrop-filter:blur(18px);
        }
        .menu-backdrop.open { display:flex; }
        .menu-backdrop.search-open {
          align-items:stretch;
        }
        .card.layout-tablet .menu-backdrop {
          align-items:stretch;
          justify-content:flex-start;
          padding:max(14px, env(safe-area-inset-top)) 14px max(14px, env(safe-area-inset-bottom)) 14px;
        }
        .queue-action-backdrop {
          position:fixed; inset:0; z-index:85; display:none; align-items:center; justify-content:center;
          padding:max(20px, env(safe-area-inset-top)) 16px max(20px, env(safe-area-inset-bottom));
          background:rgba(8,10,16,.28);
          backdrop-filter:blur(12px);
          -webkit-backdrop-filter:blur(12px);
        }
        .queue-action-backdrop.open { display:flex; }
        .queue-action-sheet {
          width:min(100%, 292px);
          max-height:min(78vh, 520px);
          overflow:auto;
          padding:12px;
          border-radius:24px;
          border:1px solid rgba(255,255,255,.12);
          background:rgba(17,19,28,.92);
          box-shadow:0 24px 56px rgba(0,0,0,.28);
          display:grid;
          gap:10px;
        }
        .queue-action-sheet.tablet-volume-sheet-host {
          width:min(760px, calc(100cqi - 72px));
          padding:0;
          border:none;
          background:transparent;
          box-shadow:none;
        }
        .theme-light .queue-action-sheet {
          background:rgba(255,255,255,.94);
          border-color:rgba(141,155,177,.22);
          box-shadow:0 18px 38px rgba(111,126,150,.18);
        }
        .queue-action-item {
          min-height:56px;
          border:none;
          border-radius:18px;
          display:flex;
          align-items:center;
          justify-content:center;
          gap:10px;
          padding:12px 14px;
          color:inherit;
          background:transparent;
          font:inherit;
          font-size:14px;
          font-weight:800;
          cursor:pointer;
          text-align:center;
        }
        .queue-action-item.compact {
          min-height:46px;
          border-radius:15px;
          background:rgba(255,255,255,.07);
          border:1px solid rgba(255,255,255,.12);
        }
        .queue-move-control {
          display:grid;
          grid-template-columns:minmax(0,1fr) auto;
          gap:8px;
          align-items:end;
          padding:8px;
          border-radius:18px;
          background:rgba(255,255,255,.055);
          border:1px solid rgba(255,255,255,.1);
        }
        .queue-move-control label,
        .queue-inline-move {
          min-width:0;
          display:grid;
          gap:5px;
          color:rgba(255,255,255,.72);
          font-size:10px;
          font-weight:850;
        }
        .queue-move-control input,
        .queue-inline-move input {
          width:100%;
          min-width:0;
          height:38px;
          border-radius:13px;
          border:1px solid rgba(255,255,255,.14);
          background:rgba(255,255,255,.08);
          color:inherit;
          text-align:center;
          font:inherit;
          font-size:14px;
          font-weight:900;
          outline:none;
        }
        .theme-light .queue-move-control {
          background:rgba(31,38,51,.045);
          border-color:rgba(147,161,183,.2);
        }
        .theme-light .queue-move-control label,
        .theme-light .queue-inline-move {
          color:#5b687c;
        }
        .theme-light .queue-move-control input,
        .theme-light .queue-inline-move input {
          background:rgba(255,255,255,.88);
          border-color:rgba(147,161,183,.24);
          color:#172033;
        }
        .queue-action-item:hover {
          background:rgba(255,255,255,.06);
          transform:translateY(-1px);
        }
        .theme-light .queue-action-item:hover {
          background:rgba(31,38,51,.06);
        }
        .queue-action-item .ui-ic {
          width:16px;
          height:16px;
        }
        .queue-action-item.warn {
          color:#ffcf86;
        }
        .queue-action-item:not(.warn) .ui-ic,
        .queue-action-item:not(.warn) {
          color:var(--ma-accent);
        }
        .queue-action-header {
          display:grid;
          gap:4px;
          padding:8px 10px 10px;
          text-align:center;
          border-bottom:1px solid rgba(255,255,255,.08);
          margin-bottom:4px;
        }
        .queue-action-brand,
        .smart-voice-brand {
          width:118px;
          max-width:56%;
          margin-inline:auto;
          color:rgba(255,255,255,.68);
          opacity:.96;
          display:grid;
          place-items:center;
        }
        .theme-light .queue-action-header {
          border-bottom-color:rgba(141,155,177,.16);
        }
        .theme-light .queue-action-brand,
        .theme-light .smart-voice-brand {
          color:rgba(31,38,51,.48);
        }
        .queue-action-player {
          font-size:11px;
          font-weight:900;
          letter-spacing:.08em;
          text-transform:uppercase;
          color:rgba(255,255,255,.56);
        }
        .theme-light .queue-action-player {
          color:rgba(55,68,85,.54);
        }
        .queue-action-title {
          font-size:16px;
          font-weight:900;
          line-height:1.2;
          color:inherit;
        }
        .confirm-sheet {
          width:min(100%, 460px);
          max-width:calc(100% - 28px);
          min-height:0;
          padding:24px;
        }
        .confirm-copy {
          color:var(--muted);
          line-height:1.75;
          font-size:15px;
        }
        .confirm-actions {
          display:grid;
          grid-template-columns:repeat(2, minmax(0, 1fr));
          gap:12px;
          margin-top:20px;
        }
        .confirm-actions .menu-item {
          min-height:54px;
          justify-content:center;
          text-align:center;
        }
        .clean-all-confirm-backdrop {
          position:absolute;
          z-index:92;
          background:rgba(8,10,16,.24);
          backdrop-filter:blur(10px);
          -webkit-backdrop-filter:blur(10px);
        }
        .clean-all-confirm-sheet {
          position:relative;
          width:min(420px, calc(100vw - 36px));
          max-height:none;
          padding:18px;
          gap:16px;
          border-radius:26px;
          background:rgba(18,21,30,.9);
          box-shadow:0 22px 60px rgba(0,0,0,.3);
        }
        .clean-all-confirm-head {
          display:grid;
          grid-template-columns:48px minmax(0, 1fr);
          gap:14px;
          align-items:start;
          padding-inline-end:40px;
        }
        .clean-all-confirm-icon {
          width:48px;
          height:48px;
          border-radius:18px;
          display:grid;
          place-items:center;
          background:linear-gradient(145deg, rgba(255,85,95,.2), rgba(255,255,255,.06));
          border:1px solid rgba(255,105,115,.24);
        }
        .clean-all-confirm-icon .ui-ic {
          width:22px;
          height:22px;
        }
        .clean-all-confirm-title {
          font-size:18px;
          font-weight:950;
          line-height:1.2;
          color:#fff;
          margin-block-end:6px;
        }
        .clean-all-confirm-close {
          position:absolute;
          inset-block-start:12px;
          inset-inline-end:12px;
          width:34px;
          height:34px;
          border-radius:14px;
          border:1px solid rgba(255,255,255,.12);
          background:rgba(255,255,255,.08);
          color:#fff;
          font-size:22px;
          line-height:1;
          cursor:pointer;
        }
        .confirm-actions.clean-all-confirm-actions {
          margin-top:0;
        }
        .clean-all-confirm-actions {
          grid-template-columns:repeat(2, minmax(0, 1fr));
          gap:10px;
        }
        .clean-all-confirm-btn {
          min-width:0;
          min-height:46px;
          border-radius:16px;
          border:1px solid rgba(255,255,255,.12);
          display:inline-flex;
          align-items:center;
          justify-content:center;
          padding:0 14px;
          color:#fff;
          background:rgba(255,255,255,.08);
          font-size:14px;
          font-weight:900;
          line-height:1;
          cursor:pointer;
          box-shadow:inset 0 1px 0 rgba(255,255,255,.1);
        }
        .clean-all-confirm-btn.danger-confirm-action {
          color:#ffd9d9;
          background:linear-gradient(145deg, rgba(255,85,95,.24), rgba(255,85,95,.1));
          border:1px solid rgba(255,105,115,.3);
        }
        .danger-confirm-icon {
          color:#ffb6b6;
        }
        .theme-light .clean-all-confirm-btn {
          color:#16202d;
          background:rgba(31,38,51,.06);
          border-color:rgba(31,38,51,.1);
        }
        .theme-light .clean-all-confirm-btn.danger-confirm-action {
          color:#b4232b;
          background:#fff1f2;
          border-color:rgba(180,35,43,.18);
        }
        .theme-light .clean-all-confirm-sheet {
          background:rgba(255,255,255,.94);
          border-color:rgba(141,155,177,.22);
          box-shadow:0 18px 44px rgba(111,126,150,.2);
        }
        .theme-light .clean-all-confirm-title {
          color:#16202d;
        }
        .theme-light .clean-all-confirm-close {
          color:#16202d;
          background:rgba(31,38,51,.06);
          border-color:rgba(31,38,51,.1);
        }
        .theme-light .danger-confirm-icon {
          color:#b4232b;
        }
        `;
}
