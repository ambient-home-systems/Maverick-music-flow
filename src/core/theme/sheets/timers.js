// Sleep timer and wake schedule styles: the corner chip, the quick-action FAB
// and the Timers page. Order is preserved by card-styles.js.
export default function() {
  return `        .menu-sheet.sheet-schedules {
          height:calc(100% - 8px);
          max-height:calc(100% - 8px);
          margin-top:0;
        }
        .menu-body.sheet-schedules {
          min-height:0;
          padding:16px 14px 20px;
          overflow:auto;
        }
        .menu-body.sheet-schedules .settings-shell {
          min-height:0;
          height:100%;
          display:grid;
          grid-template-rows:auto minmax(0,1fr);
          align-content:start;
          gap:14px;
        }
        .sleep-timer-corner {
          position:absolute;
          inset-block-start:auto;
          inset-block-end:calc(102px + env(safe-area-inset-bottom, 0px));
          z-index:12;
          display:grid;
          gap:8px;
          align-items:start;
          pointer-events:auto;
        }
        .sleep-timer-corner.right,
        .sleep-timer-corner.left {
          inset-inline-start:50%;
          inset-inline-end:auto;
          justify-items:center;
          transform:translateX(-50%);
        }
        .sleep-timer-corner[hidden],
        .sleep-timer-chip[hidden],
        .sleep-timer-menu[hidden] {
          display:none !important;
        }
        .card:not(.layout-tablet).has-sleep-timer .player-focus,
        .card:not(.layout-tablet).has-sleep-timer .player-focus-nav {
          margin-top:0;
        }
        .sleep-timer-chip,
        .sleep-timer-menu-btn {
          border:none;
          color:inherit;
          font:inherit;
        }
        .sleep-timer-chip {
          min-height:40px;
          padding:0 12px;
          border-radius:999px;
          display:inline-flex;
          align-items:center;
          gap:8px;
          border:1px solid rgba(255,255,255,.14);
          background:rgba(12,16,24,.68);
          color:#fff;
          box-shadow:0 14px 26px rgba(0,0,0,.22);
          backdrop-filter:blur(18px);
          -webkit-backdrop-filter:blur(18px);
          font-size:calc(12px * var(--v2-font-scale));
          font-weight:800;
        }
        .sleep-timer-chip .ui-ic { width:16px; height:16px; }
        .sleep-timer-menu {
          display:grid;
          grid-auto-flow:column;
          gap:8px;
          padding:8px;
          border-radius:18px;
          border:1px solid rgba(255,255,255,.12);
          background:rgba(9,12,18,.74);
          box-shadow:0 18px 34px rgba(0,0,0,.24);
          backdrop-filter:blur(20px);
          -webkit-backdrop-filter:blur(20px);
        }
        .sleep-timer-menu-btn {
          min-width:54px;
          min-height:38px;
          padding:0 12px;
          border-radius:14px;
          background:rgba(255,255,255,.08);
          color:#fff;
          font-size:calc(12px * var(--v2-font-scale));
          font-weight:800;
        }
        .sleep-timer-menu-btn.danger {
          background:rgba(255,122,122,.14);
          color:#ffd2d2;
        }
        .sleep-timer-menu-btn.ghost {
          background:rgba(255,255,255,.06);
          color:rgba(255,255,255,.82);
        }
        .theme-light .sleep-timer-chip {
          background:rgba(255,255,255,.86);
          border-color:rgba(147,161,183,.18);
          color:#1f2633;
        }
        .theme-light .sleep-timer-menu {
          background:rgba(255,255,255,.88);
          border-color:rgba(147,161,183,.18);
        }
        .theme-light .sleep-timer-menu-btn {
          background:rgba(240,244,250,.96);
          color:#1f2633;
        }
        .theme-light .sleep-timer-menu-btn.danger {
          background:rgba(255,236,236,.92);
          color:#8b2935;
        }
        .theme-light .sleep-timer-menu-btn.ghost {
          background:rgba(245,248,252,.84);
          color:#516177;
        }
        .schedule-tabs {
          display:grid;
          grid-template-columns:repeat(3, minmax(0, 1fr));
          gap:8px;
          padding:6px;
          border-radius:18px;
          background:rgba(255,255,255,.07);
          border:1px solid rgba(255,255,255,.1);
        }
        .schedule-tabs .settings-pill {
          min-height:44px;
          padding:0 10px;
          border-radius:14px;
        }
        .schedule-list {
          display:grid;
          gap:10px;
        }
        .schedule-row {
          display:grid;
          grid-template-columns:minmax(0,1fr) auto;
          align-items:center;
          gap:10px;
          padding:10px;
          border-radius:18px;
          background:rgba(255,255,255,.06);
          border:1px solid rgba(255,255,255,.1);
        }
        .schedule-row.disabled {
          opacity:.58;
        }
        .schedule-row.editing {
          border-color:color-mix(in srgb, var(--ma-accent) 42%, rgba(255,255,255,.12));
          background:color-mix(in srgb, var(--ma-accent) 12%, rgba(255,255,255,.06));
        }
        .schedule-row-main {
          min-width:0;
          border:none;
          background:transparent;
          color:inherit;
          font:inherit;
          display:grid;
          grid-template-columns:auto minmax(0,1fr);
          align-items:center;
          gap:12px;
          text-align:inherit;
          cursor:pointer;
        }
        .schedule-row-time {
          min-width:58px;
          min-height:42px;
          padding:0 10px;
          border-radius:14px;
          display:grid;
          place-items:center;
          font-size:18px;
          font-weight:950;
          color:var(--ma-accent);
          background:rgba(0,0,0,.16);
          direction:ltr;
        }
        .schedule-row-copy {
          min-width:0;
          display:grid;
          gap:4px;
        }
        .schedule-row-title {
          font-size:14px;
          font-weight:950;
          overflow:hidden;
          text-overflow:ellipsis;
          white-space:nowrap;
        }
        .schedule-row-sub {
          font-size:12px;
          font-weight:800;
          color:rgba(255,255,255,.62);
          overflow:hidden;
          text-overflow:ellipsis;
          white-space:nowrap;
        }
        .schedule-row-actions {
          display:flex;
          gap:6px;
          align-items:center;
        }
        .schedule-row-actions .settings-pill {
          min-height:38px;
          padding:0 10px;
          border-radius:12px;
        }
        .schedule-row-actions .ui-ic {
          width:16px;
          height:16px;
        }
        .theme-light .schedule-tabs,
        .theme-light .schedule-row {
          background:rgba(255,255,255,.74);
          border-color:rgba(147,161,183,.18);
        }
        .theme-light .schedule-row-time {
          background:rgba(238,243,248,.9);
        }
        .theme-light .schedule-row-sub {
          color:rgba(55,68,85,.62);
        }
        .scheduled-start-card {
          border-color:color-mix(in srgb, var(--ma-accent) 22%, rgba(255,255,255,.12));
          background:
            radial-gradient(circle at 12% 12%, color-mix(in srgb, var(--ma-accent) 14%, transparent), transparent 34%),
            rgba(255,255,255,.08);
        }
        .scheduled-start-grid {
          display:grid;
          grid-template-columns:minmax(116px, .78fr) minmax(0, 1fr) minmax(0, 1.16fr);
          gap:12px;
          align-items:stretch;
        }
        .scheduled-start-grid.two-col {
          grid-template-columns:repeat(2, minmax(0,1fr));
        }
        .wake-schedule-layout {
          min-height:0;
          height:100%;
          display:grid;
          grid-template-columns:minmax(280px, .9fr) minmax(0, 1.25fr);
          gap:14px;
          align-items:start;
          overflow:auto;
          overscroll-behavior:contain;
          padding:0 2px 8px;
        }
        .wake-schedule-list-card,
        .wake-schedule-editor-card {
          min-height:0;
          align-self:start;
        }
        .wake-schedule-list-card {
          max-height:100%;
          overflow:auto;
        }
        .wake-schedule-editor-card {
          overflow:visible;
        }
        .scheduled-start-field {
          display:grid;
          gap:10px;
          padding:14px;
          border-radius:18px;
          background:rgba(255,255,255,.06);
          border:1px solid rgba(255,255,255,.12);
        }
        .theme-light .scheduled-start-card {
          background:
            radial-gradient(circle at 12% 12%, color-mix(in srgb, var(--ma-accent) 12%, transparent), transparent 34%),
            rgba(255,255,255,.72);
        }
        .theme-light .scheduled-start-field {
          background:rgba(255,255,255,.76);
          border-color:rgba(147,161,183,.2);
        }
        .sleep-timer-action-row {
          display:grid;
          grid-template-columns:repeat(3, minmax(0, 1fr));
          gap:10px;
          width:100%;
        }
        .sleep-timer-action-row.with-cancel {
          grid-template-columns:repeat(4, minmax(0, 1fr));
        }
        .sleep-timer-action-btn {
          min-height:52px;
          border:none;
          border-radius:18px;
          display:grid;
          place-items:center;
          background:linear-gradient(135deg, color-mix(in srgb, var(--ma-accent) 24%, rgba(255,255,255,.08)), rgba(255,255,255,.07));
          border:1px solid color-mix(in srgb, var(--ma-accent) 22%, rgba(255,255,255,.1));
          color:#fff;
          font:inherit;
          font-size:16px;
          font-weight:950;
          cursor:pointer;
          box-shadow:0 14px 26px rgba(0,0,0,.12);
        }
        .sleep-timer-action-btn.danger {
          color:#ffe1d9;
          background:rgba(255,100,100,.16);
          border-color:rgba(255,122,122,.24);
        }
        .theme-light .sleep-timer-action-btn {
          color:#1f2633;
          background:linear-gradient(135deg, color-mix(in srgb, var(--ma-accent) 18%, rgba(255,255,255,.88)), rgba(246,249,252,.82));
          border-color:color-mix(in srgb, var(--ma-accent) 18%, rgba(147,161,183,.2));
          box-shadow:0 14px 26px rgba(110,127,153,.12);
        }
        .theme-light .sleep-timer-action-btn.danger {
          color:#8b2935;
          background:rgba(255,236,236,.92);
          border-color:rgba(255,122,122,.18);
        }
@media (max-width: 760px) {
          .menu-body.sheet-schedules .settings-shell {
            height:auto;
            min-height:100%;
            grid-template-rows:auto auto;
          }
          .scheduled-start-grid {
            grid-template-columns:minmax(0,1fr);
          }
          .menu-body.sheet-schedules .scheduled-start-field,
          .menu-body.sheet-schedules .night-time-card {
            min-width:0;
            max-width:100%;
            overflow:hidden;
          }
          .menu-body.sheet-schedules .settings-actions {
            grid-template-columns:minmax(0,1fr);
          }
          .menu-body.sheet-schedules .settings-pill {
            min-width:0;
            max-width:100%;
            white-space:normal;
            overflow-wrap:anywhere;
          }
          .wake-schedule-layout {
            height:auto;
            grid-template-columns:minmax(0,1fr);
            overflow:visible;
          }
          .wake-schedule-list-card {
            max-height:none;
            overflow:visible;
          }
          .night-window-grid {
            grid-template-columns:minmax(0,1fr);
          }
}
        .mobile-timer-fab{width:42px;min-width:42px;gap:5px;padding:0 10px!important;overflow:hidden;white-space:nowrap;}
        .mobile-timer-fab.active{width:auto;min-width:76px;color:var(--ma-accent);}
        .mobile-timer-fab .mobile-timer-label{font-size:calc(11px * var(--v2-font-scale));font-weight:900;line-height:1;direction:ltr;}
        .mobile-timer-fab .mobile-timer-label[hidden]{display:none!important;}
.card.aspect-wide:not(.layout-tablet) .mobile-art-actions .mobile-timer-fab.active,
.card.height-tight:not(.layout-tablet) .mobile-art-actions .mobile-timer-fab.active{
  width:auto!important;
  min-width:62px!important;
  flex:0 0 auto!important;
}
@media (max-width: 820px) {
  .card:not(.layout-tablet) .sleep-timer-corner{top:calc(74px + env(safe-area-inset-top, 0px))!important;inset-block-start:calc(74px + env(safe-area-inset-top, 0px))!important;inset-block-end:auto;right:16px!important;left:auto!important;inset-inline-start:auto!important;inset-inline-end:16px!important;transform:none;justify-items:end;z-index:13;}
  .card:not(.layout-tablet) .sleep-timer-chip{min-height:30px;padding:0 9px;gap:5px;font-size:calc(11px * var(--v2-font-scale));box-shadow:0 10px 20px rgba(0,0,0,.18);}
  .card:not(.layout-tablet) .sleep-timer-chip .ui-ic{width:13px;height:13px;}
  .card:not(.layout-tablet) .sleep-timer-menu{grid-auto-flow:row;position:absolute;inset-block-start:36px;right:0;left:auto;inset-inline-start:auto;inset-inline-end:0;}
}
.mobile-timer-fab,
.mobile-timer-fab.active{display:inline-flex!important;align-items:center!important;justify-content:center!important;flex-direction:row!important;width:auto!important;min-width:42px!important;height:42px!important;gap:6px!important;padding:0 11px!important;color:#fff!important;background:rgba(14,18,28,.34)!important;border-color:rgba(255,255,255,.16)!important;box-shadow:0 12px 24px rgba(0,0,0,.14), inset 0 1px 0 rgba(255,255,255,.08)!important;}
.mobile-timer-fab[hidden],
.mobile-timer-fab.hidden{display:none!important;}
.theme-light .mobile-timer-fab,
.theme-light .mobile-timer-fab.active{color:#1f2633!important;background:rgba(255,255,255,.76)!important;border-color:rgba(141,155,177,.22)!important;box-shadow:0 12px 26px rgba(111,126,150,.16)!important;}
.mobile-timer-fab.active{min-width:78px!important;}
.mobile-timer-fab .ui-ic{flex:0 0 auto!important;}
.mobile-timer-fab .mobile-timer-label{display:inline-block!important;color:inherit!important;font-weight:950!important;direction:ltr!important;line-height:1!important;white-space:nowrap!important;}
.mobile-timer-fab .mobile-timer-label[hidden]{display:none!important;}
.card.layout-tablet .sleep-timer-corner,
.card.layout-tablet .sleep-timer-corner.left,
.card.layout-tablet .sleep-timer-corner.right{
  top:auto!important;
  bottom:22px!important;
  left:auto!important;
  right:76px!important;
  transform:none!important;
  justify-items:end!important;
  align-items:center!important;
  z-index:8!important;
}
.card.layout-tablet .sleep-timer-chip{
  min-height:34px!important;
  padding:0 12px!important;
  gap:7px!important;
}
.card.layout-tablet > .sleep-timer-corner,
.card.layout-tablet > .sleep-timer-corner.left,
.card.layout-tablet > .sleep-timer-corner.right {
  position:absolute!important;
  inset:auto auto 22px 76px!important;
  top:auto!important;
  right:auto!important;
  bottom:22px!important;
  left:76px!important;
  transform:none!important;
  justify-items:start!important;
  z-index:9!important;
}
.card.layout-tablet .menu-sheet.sheet-schedules{width:min(calc(100% - 96px), 1080px)!important;max-width:min(calc(100% - 96px), 1080px)!important;height:calc(100% - 26px)!important;max-height:calc(100% - 26px)!important;}
.card.layout-tablet .menu-body.sheet-schedules{justify-items:stretch!important;align-content:start!important;overflow:auto!important;padding:20px 28px 28px!important;scrollbar-gutter:stable!important;}
.card.layout-tablet .menu-body.sheet-schedules .settings-shell{width:min(100%, 920px)!important;margin:0 auto!important;display:grid!important;grid-template-rows:auto auto!important;gap:18px!important;height:auto!important;min-height:auto!important;overflow:visible!important;}
.card.layout-tablet .schedule-tabs{width:100%!important;max-width:none!important;}
.card.layout-tablet .schedule-content{width:100%!important;display:grid!important;gap:16px!important;align-content:start!important;}
.card.layout-tablet .schedule-panel-card,
.card.layout-tablet .wake-schedule-layout,
.card.layout-tablet .wake-schedule-list-card,
.card.layout-tablet .wake-schedule-editor-card{width:100%!important;max-width:none!important;}
.card.layout-tablet .wake-schedule-layout{height:auto!important;display:grid!important;grid-template-columns:minmax(0,1fr)!important;gap:16px!important;overflow:visible!important;align-items:stretch!important;}
.card.layout-tablet .wake-schedule-list-card{max-height:none!important;overflow:visible!important;}
.card.layout-tablet .scheduled-start-grid,
.card.layout-tablet .scheduled-start-grid.two-col,
.card.layout-tablet .night-window-grid{grid-template-columns:minmax(0,1fr)!important;}
.card.layout-tablet .sleep-timer-action-row,
.card.layout-tablet .sleep-timer-action-row.with-cancel{grid-template-columns:repeat(3,minmax(0,1fr))!important;}
.card.layout-tablet .sleep-timer-action-row.with-cancel .danger{grid-column:1 / -1!important;}
.card.layout-tablet .menu-body.sheet-schedules .settings-group,
.card.layout-tablet .menu-body.sheet-schedules .scheduled-start-card,
.card.layout-tablet .menu-body.sheet-schedules .schedule-panel-card,
.card.layout-tablet .menu-body.sheet-schedules .schedule-row,
.card.layout-tablet .menu-body.sheet-schedules .settings-pill,
.card.layout-tablet .menu-body.sheet-schedules .night-time-card,
.card.layout-tablet .menu-body.sheet-schedules .scheduled-start-field,
.card.layout-tablet .menu-body.sheet-schedules select,
.card.layout-tablet .menu-body.sheet-schedules input{
  animation:none!important;
  transition:none!important;
  transform:none!important;
  will-change:auto!important;
}
.card.layout-tablet .menu-body.sheet-schedules select,
.card.layout-tablet .menu-body.sheet-schedules input,
.card.layout-tablet .menu-body.sheet-schedules .settings-pill,
.card.layout-tablet .menu-body.sheet-schedules .night-time-card,
.card.layout-tablet .menu-body.sheet-schedules .scheduled-start-field{
  backdrop-filter:none!important;
  -webkit-backdrop-filter:none!important;
}
.menu-body.sheet-schedules{
  contain:layout paint;
  overscroll-behavior:contain;
}
.menu-body.sheet-schedules select,
.menu-body.sheet-schedules input,
.menu-body.sheet-schedules .night-time-card,
.menu-body.sheet-schedules .scheduled-start-field{
  transform:none!important;
  transition:none!important;
  will-change:auto!important;
}
.menu-body.sheet-schedules select:focus,
.menu-body.sheet-schedules input:focus{
  scroll-margin-block:120px 160px;
}
.menu-body.sheet-schedules .settings-select{
  min-height:58px;
  line-height:1.2;
}
`;
}
