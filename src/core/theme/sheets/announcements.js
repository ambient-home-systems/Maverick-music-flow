// Announcement styles: the Announce page and the studio announcement tray.
// Order is preserved by card-styles.js.
export default function() {
  return `        .announcements-shell {
          display:grid;
          gap:14px;
        }
        .announcement-target {
          min-height:68px;
          display:grid;
          grid-template-columns:54px minmax(0,1fr);
          align-items:center;
          gap:12px;
          padding:8px 12px;
          border-radius:22px;
          border:1px solid color-mix(in srgb, var(--ma-accent) 24%, transparent);
          background:color-mix(in srgb, var(--ma-accent) 12%, transparent);
          font-size:17px;
          font-weight:950;
        }
        .announcement-target-icon {
          width:46px;
          height:46px;
          border-radius:17px;
          display:grid;
          place-items:center;
          color:#18120a;
          background:linear-gradient(135deg, var(--ma-accent), color-mix(in srgb, var(--ma-accent) 72%, white 28%));
          box-shadow:0 14px 24px color-mix(in srgb, var(--ma-accent) 20%, transparent);
        }
        .announcement-target-icon .ui-ic {
          width:22px;
          height:22px;
        }
        .announcement-target-select {
          width:100%;
          min-width:0;
          min-height:48px;
          border:none;
          background:transparent;
          box-shadow:none;
          padding:0;
          font:inherit;
          color:inherit;
          white-space:nowrap;
          overflow:hidden;
          text-overflow:ellipsis;
        }
        .theme-dark .announcement-target {
          background:rgba(20,24,32,.74);
          border-color:rgba(255,255,255,.12);
        }
        .theme-dark .announcement-target-select {
          background:rgba(15,18,28,.82);
          color:#f4f6fb;
          border-radius:14px;
          padding:10px 12px;
          border:1px solid rgba(255,255,255,.12);
          color-scheme:dark;
        }
        .theme-dark #mobileAnnouncementTargetSelect option,
        .theme-dark #mobileAnnouncementTtsLanguageSelect option {
          background:#171d28;
          color:#f4f6fb;
        }
        .announcement-input-wrap {
          position:relative;
          display:grid;
        }
        .announcement-textarea {
          resize:vertical;
          min-height:124px;
          line-height:1.5;
          padding-inline-end:64px;
        }
        .announcement-voice-btn {
          position:absolute;
          inset-block-start:10px;
          inset-inline-end:10px;
          width:44px;
          height:44px;
          border:none;
          border-radius:16px;
          display:grid;
          place-items:center;
          color:#18120a;
          background:linear-gradient(135deg, var(--ma-accent), color-mix(in srgb, var(--ma-accent) 72%, white 28%));
          box-shadow:0 12px 22px color-mix(in srgb, var(--ma-accent) 18%, transparent);
          cursor:pointer;
        }
        .announcement-voice-btn .ui-ic { width:20px; height:20px; }
        .announcement-presets {
          display:flex;
          flex-wrap:wrap;
          gap:10px;
        }
        .announcement-send-btn {
          min-height:62px;
          display:flex !important;
          flex-direction:row !important;
          align-items:center;
          justify-content:center;
          gap:12px;
          font-size:17px;
        }
        .announcement-send-btn .ui-ic { width:24px; height:24px; flex:none; }
.control-room-announcement-tray{width:min(780px, calc(100% - 44px));grid-template-rows:auto auto auto;gap:14px;}
.control-room-announce-hero{display:flex;align-items:center;gap:14px;min-width:0;padding:6px 4px 0;}
.control-room-announce-icon{width:54px;height:54px;border-radius:20px;display:grid;place-items:center;flex:none;background:linear-gradient(145deg, rgba(var(--dynamic-accent-rgb,245 166 35) / .24), rgba(128,88,210,.24));border:1px solid rgba(var(--dynamic-accent-rgb,245 166 35) / .22);color:#fff;}
.control-room-announce-icon .ui-ic{width:25px;height:25px;}
.control-room-announce-copy{display:grid;gap:4px;min-width:0;}
.control-room-announce-panel{display:grid;gap:14px;}
.control-room-announce-compose{display:grid;gap:8px;font-size:calc(12px * var(--v2-font-scale));font-weight:900;color:rgba(255,255,255,.7);}
.control-room-announce-compose .announcement-textarea{width:100%;min-height:122px;resize:vertical;border-radius:22px;border:1px solid rgba(255,255,255,.12);background:rgba(255,255,255,.075);color:#fff;padding:16px 18px;font:inherit;font-weight:700;outline:none;box-sizing:border-box;}
.control-room-announce-compose .announcement-textarea:focus{border-color:rgba(var(--dynamic-accent-rgb,245 166 35) / .38);box-shadow:0 0 0 3px rgba(var(--dynamic-accent-rgb,245 166 35) / .12);}
.control-room-announce-controls{display:grid;grid-template-columns:minmax(0,1fr) minmax(180px, .42fr);gap:12px;align-items:stretch;}
.control-room-announce-volume-card{display:grid;align-content:center;gap:12px;min-height:82px;padding:14px 16px;border-radius:22px;border:1px solid rgba(255,255,255,.1);background:rgba(255,255,255,.055);}
.control-room-announce-volume-head{display:flex;align-items:center;justify-content:space-between;gap:12px;font-size:calc(12px * var(--v2-font-scale));font-weight:900;color:rgba(255,255,255,.7);}
.control-room-announce-volume-head strong{font-size:calc(16px * var(--v2-font-scale));font-weight:950;color:#fff;}
.control-room-announce-send{min-height:82px;border-radius:22px;font-size:calc(14px * var(--v2-font-scale));}
.theme-light .control-room-announce-compose .announcement-textarea{background:rgba(245,248,252,.94);border-color:rgba(28,42,68,.1);color:#17253a;}
@media (max-width: 980px) {
  .control-room-announce-controls{grid-template-columns:minmax(0,1fr);}
}
@media (max-height: 620px) {
  .control-room-announcement-tray{max-height:calc(100dvh - 116px);}
  .control-room-announce-compose .announcement-textarea{min-height:86px;}
}
.control-room-announcement-tray{width:min(760px, calc(100% - 64px))!important;}
.control-room-announce-icon{width:50px!important;height:50px!important;border-radius:17px!important;}
.control-room-announce-icon .ui-ic{width:22px!important;height:22px!important;}
.control-room-announce-compose .announcement-textarea{min-height:112px!important;color:var(--cr-text)!important;font-size:calc(13px * var(--v2-font-scale))!important;}
.control-room-announce-send{min-height:78px!important;}
`;
}
