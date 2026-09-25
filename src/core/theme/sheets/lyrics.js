// Lyrics modal styles. Order is preserved by card-styles.js.
export default function() {
  return `        .lyrics-backdrop {
          position:absolute; inset:0; z-index:70; display:none; align-items:center; justify-content:center;
          padding:max(12px, env(safe-area-inset-top)) max(12px, env(safe-area-inset-right)) max(12px, env(safe-area-inset-bottom)) max(12px, env(safe-area-inset-left));
          background:
            radial-gradient(circle at 18% 16%, rgba(var(--dynamic-accent-rgb,245 166 35) / .22), transparent 28%),
            linear-gradient(180deg, rgba(8,10,16,.62), rgba(6,8,14,.86));
          backdrop-filter:blur(18px); -webkit-backdrop-filter:blur(18px);
          overscroll-behavior:contain;
          overflow:hidden;
          isolation:isolate;
        }
        .lyrics-backdrop.open { display:flex; }
        .lyrics-backdrop::before {
          content:"";
          position:absolute;
          inset:-14%;
          z-index:0;
          pointer-events:none;
          background:var(--lyrics-dynamic-art, none) center/cover no-repeat;
          filter:blur(52px) saturate(1.18) brightness(.82);
          opacity:0;
          transform:scale(1.12);
          transition:opacity .24s ease;
        }
        .lyrics-backdrop.has-lyrics-art::before { opacity:.52; }
        .lyrics-backdrop::after {
          content:"";
          position:absolute;
          inset:0;
          z-index:0;
          pointer-events:none;
          background:
            radial-gradient(circle at 50% 18%, rgba(255,255,255,.10), transparent 30%),
            linear-gradient(180deg, rgba(6,8,14,.34), rgba(6,8,14,.78) 48%, rgba(4,6,12,.92));
        }
        .card.layout-tablet.lyrics-modal-open {
          overflow:hidden;
        }
        .card:not(.layout-tablet).lyrics-modal-open {
          overflow:hidden;
        }
        .lyrics-sheet {
          position:relative; z-index:1; isolation:isolate;
          width:min(1160px, calc(100% - 8px)); max-height:calc(100% - 8px); overflow:hidden; display:grid; grid-template-rows:auto minmax(0,1fr);
          border-radius:28px; border:1px solid rgba(255,255,255,.14);
          background:linear-gradient(180deg, rgba(18,21,32,.74), rgba(9,11,18,.88));
          box-shadow:0 28px 72px rgba(0,0,0,.38), inset 0 1px 0 rgba(255,255,255,.08);
          backdrop-filter:blur(26px) saturate(1.08);
          -webkit-backdrop-filter:blur(26px) saturate(1.08);
        }
        .theme-light .lyrics-sheet { background:rgba(255,255,255,.92); border-color:rgba(147,161,183,.2); }
        .lyrics-sheet::before {
          content:"";
          position:absolute;
          inset:-22%;
          z-index:0;
          pointer-events:none;
          background:var(--lyrics-dynamic-art, none) center/cover no-repeat;
          filter:blur(42px) saturate(1.16);
          transform:scale(1.1);
          opacity:.18;
        }
        .lyrics-sheet::after {
          content:"";
          position:absolute;
          inset:0;
          z-index:0;
          pointer-events:none;
          background:
            linear-gradient(180deg, rgba(18,21,32,.78), rgba(11,13,21,.86)),
            radial-gradient(circle at 50% 0%, rgba(var(--dynamic-accent-rgb,245 166 35) / .14), transparent 42%);
        }
        .theme-light .lyrics-sheet::after {
          background:
            linear-gradient(180deg, rgba(255,255,255,.82), rgba(245,248,253,.92)),
            radial-gradient(circle at 50% 0%, rgba(var(--dynamic-accent-rgb,245 166 35) / .12), transparent 42%);
        }
        .lyrics-head,
        .lyrics-body {
          position:relative;
          z-index:1;
        }
        .lyrics-head { display:grid; grid-template-columns:minmax(0,1fr) auto; align-items:start; gap:14px; padding:18px 16px 14px; border-bottom:1px solid rgba(255,255,255,.08); }
        .theme-light .lyrics-head { border-bottom-color:rgba(143,159,181,.16); }
        .lyrics-title-wrap { min-width:0; display:grid; gap:6px; text-align:center; }
        .lyrics-title-brand {
          width:120px;
          max-width:56%;
          margin-inline:auto;
          color:rgba(255,255,255,.64);
          opacity:.96;
          display:grid;
          place-items:center;
        }
        .theme-light .lyrics-title-brand {
          color:rgba(31,38,51,.42);
        }
        .lyrics-title { font-size:22px; font-weight:900; line-height:1.08; }
        .lyrics-sub { font-size:13px; color:rgba(255,255,255,.72); }
        .theme-light .lyrics-sub { color:rgba(55,68,85,.68); }
        .lyrics-head-actions { display:flex; align-items:center; justify-content:flex-end; flex-wrap:wrap; gap:10px; justify-self:end; }
        .lyrics-offset-controls,
        .lyrics-font-controls {
          display:inline-flex;
          align-items:center;
          gap:4px;
          padding:4px;
          border-radius:999px;
          background:rgba(255,255,255,.07);
          border:1px solid rgba(255,255,255,.08);
        }
        .lyrics-offset-btn,
        .lyrics-offset-label {
          border:none;
          min-width:34px;
          height:32px;
          border-radius:999px;
          display:inline-grid;
          place-items:center;
          background:transparent;
          color:rgba(255,255,255,.88);
          font:inherit;
          font-size:13px;
          font-weight:900;
        }
        .lyrics-offset-btn:active,
        .lyrics-offset-label:active {
          transform:scale(.96);
        }
        .lyrics-offset-label {
          min-width:52px;
          padding:0 8px;
          background:rgba(255,255,255,.08);
          color:#fff;
        }
        .lyrics-sync-btn {
          border:none;
          min-height:40px;
          padding:0 12px;
          border-radius:999px;
          display:inline-flex;
          align-items:center;
          gap:8px;
          background:rgba(255,255,255,.08);
          color:rgba(255,255,255,.86);
          font:inherit;
          font-size:13px;
          font-weight:800;
        }
        .lyrics-sync-btn.active {
          background:color-mix(in srgb, var(--ma-accent) 22%, rgba(255,255,255,.08));
          color:#fff;
          box-shadow:0 10px 24px color-mix(in srgb, var(--ma-accent) 22%, transparent);
        }
        .theme-light .lyrics-sync-btn {
          background:rgba(240,244,250,.92);
          color:#253041;
        }
        .theme-light .lyrics-offset-controls,
        .theme-light .lyrics-font-controls {
          background:rgba(240,244,250,.86);
          border-color:rgba(143,159,181,.16);
        }
        .theme-light .lyrics-offset-btn,
        .theme-light .lyrics-offset-label {
          color:#253041;
        }
        .theme-light .lyrics-offset-label {
          background:rgba(255,255,255,.82);
        }
        .theme-light .lyrics-sync-btn.active {
          background:color-mix(in srgb, var(--ma-accent) 16%, rgba(240,244,250,.96));
        }
        .lyrics-body { min-height:0; height:100%; overflow:auto; padding:clamp(24px, 4vw, 42px) clamp(18px, 5vw, 72px) 32px; white-space:pre-wrap; line-height:1.92; font-size:calc(clamp(18px, 3vw, 30px) * var(--lyrics-font-scale, 1)); color:#fff; text-align:center; scroll-behavior:smooth; display:grid; justify-items:center; overscroll-behavior:contain; -webkit-overflow-scrolling:touch; }
        .theme-light .lyrics-body { color:#1f2633; }
        .lyrics-state { display:grid; place-items:center; min-height:220px; text-align:center; color:rgba(255,255,255,.72); }
        .theme-light .lyrics-state { color:rgba(55,68,85,.68); }
        .lyrics-pre { margin:0; font:inherit; white-space:pre-wrap; text-align:center; }
        .lyrics-timeline {
          width:min(100%, 920px);
          margin-inline:auto;
          display:grid;
          gap:14px;
          padding:10px 4px 44vh;
        }
        .lyrics-line {
          width:100%;
          text-align:center;
          opacity:.42;
          transform:scale(.96);
          transform-origin:center;
          color:rgba(255,255,255,.78);
          font-weight:800;
          line-height:1.48;
          letter-spacing:.01em;
          transition:opacity .22s ease, transform .22s ease, color .22s ease, text-shadow .22s ease;
        }
        .lyrics-line.active {
          opacity:1;
          transform:scale(1.14);
          color:#fff;
          font-weight:950;
          text-shadow:0 0 22px color-mix(in srgb, var(--ma-accent) 46%, transparent), 0 8px 28px rgba(0,0,0,.34);
        }
        .theme-light .lyrics-line { color:rgba(31,38,51,.6); }
        .theme-light .lyrics-line.active {
          color:#101722;
          text-shadow:0 10px 26px color-mix(in srgb, var(--ma-accent) 28%, transparent);
        }
        .card.layout-tablet .lyrics-backdrop {
          align-items:center;
          padding:max(44px, env(safe-area-inset-top)) max(34px, env(safe-area-inset-right)) max(34px, env(safe-area-inset-bottom)) max(34px, env(safe-area-inset-left));
        }
        .card.layout-tablet .lyrics-sheet {
          width:min(1320px, calc(100% - 96px));
          max-height:calc(100% - 96px);
          border-radius:34px;
        }
        .card.layout-tablet .lyrics-head {
          align-items:center;
          gap:16px;
          padding:22px 24px 18px;
        }
        .card.layout-tablet .lyrics-title-wrap {
          min-width:0;
          padding-inline:24px;
        }
        .card.layout-tablet .lyrics-title,
        .card.layout-tablet .lyrics-sub {
          white-space:nowrap;
          overflow:hidden;
          text-overflow:ellipsis;
        }
        .card.layout-tablet .lyrics-title {
          font-size:clamp(24px, 2.8vw, 34px);
          line-height:1.18;
        }
        .card.layout-tablet .lyrics-body {
          padding-block-start:clamp(34px, 5vh, 56px);
        }
        @media (min-width: 901px) {
          .card:not(.layout-tablet) .lyrics-head {
            align-items:center;
            grid-template-columns:minmax(0, 1fr) minmax(280px, auto);
          }
          .card:not(.layout-tablet) .lyrics-head-actions {
            display:flex !important;
            visibility:visible !important;
            opacity:1 !important;
            flex-wrap:nowrap;
            max-width:min(640px, 48vw);
            overflow:auto;
            scrollbar-width:none;
          }
          .card:not(.layout-tablet) .lyrics-head-actions::-webkit-scrollbar {
            display:none;
          }
          .card:not(.layout-tablet) .lyrics-offset-controls,
          .card:not(.layout-tablet) .lyrics-font-controls,
          .card:not(.layout-tablet) .lyrics-sync-btn {
            flex:0 0 auto;
          }
        }
        @media (max-width: 600px) {
          .lyrics-backdrop {
            align-items:center;
            padding:max(8px, env(safe-area-inset-top)) max(8px, env(safe-area-inset-right)) max(8px, env(safe-area-inset-bottom)) max(8px, env(safe-area-inset-left));
          }
          .lyrics-sheet {
            width:100%;
            height:min(560px, calc(100% - 18px));
            max-height:calc(100% - 18px);
            border-radius:22px;
          }
          .lyrics-head {
            grid-template-columns:minmax(0,1fr);
            align-items:start;
            gap:8px;
            padding:12px 10px 10px;
          }
          .lyrics-title-wrap {
            gap:4px;
            text-align:center;
          }
          .lyrics-title,
          .lyrics-sub {
            overflow:hidden;
            text-overflow:ellipsis;
          }
          .lyrics-title {
            font-size:16px;
            line-height:1.1;
            white-space:nowrap;
          }
          .lyrics-sub {
            font-size:12px;
            display:-webkit-box;
            -webkit-line-clamp:2;
            -webkit-box-orient:vertical;
          }
          .lyrics-head-actions {
            justify-self:center;
            flex-wrap:nowrap;
            gap:6px;
            max-width:100%;
            overflow:auto;
            scrollbar-width:none;
          }
          .lyrics-head-actions::-webkit-scrollbar {
            display:none;
          }
          .lyrics-sync-btn {
            min-height:36px;
            padding:0 10px;
            font-size:12px;
            white-space:nowrap;
          }
          .lyrics-offset-btn,
          .lyrics-offset-label {
            min-width:30px;
            height:30px;
            font-size:12px;
          }
          .lyrics-offset-label {
            min-width:46px;
          }
          .lyrics-body {
            padding:16px 14px 24px;
            font-size:calc(clamp(18px, 5.6vw, 26px) * var(--lyrics-font-scale, 1));
            align-content:start;
          }
          .lyrics-line.active {
            transform:scale(1.06);
          }
          .lyrics-timeline {
            width:100%;
            gap:16px;
            padding-bottom:42vh;
          }
        }
`;
}
