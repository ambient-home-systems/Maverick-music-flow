// Night mode styles: the quick row under the player. The night card surface
// and the night focus pill stay in compact.js and player.js, where competing
// rules depend on their place in the cascade. Order is preserved by card-styles.js.
export default function() {
  return `        .night-quick-row {
          display:flex;
          flex-wrap:wrap;
          gap:8px;
          align-items:center;
          margin-top:10px;
          justify-content:center;
        }
        .night-quick-row.auto-mode {
          justify-content:center;
        }
        .night-quick-row.on-mode {
          justify-content:center;
        }
        .night-quick-btn {
          min-height:34px;
          padding:0 12px;
          border-radius:999px;
          border:1px solid rgba(255,255,255,.14);
          background:rgba(255,255,255,.08);
          color:inherit;
          display:inline-flex;
          align-items:center;
          gap:8px;
          font:inherit;
          font-size:12px;
          font-weight:850;
          letter-spacing:.01em;
          cursor:pointer;
          box-shadow:0 10px 24px rgba(0,0,0,.12);
          backdrop-filter:blur(18px);
          -webkit-backdrop-filter:blur(18px);
          transition:transform .16s ease, border-color .18s ease, background-color .18s ease, box-shadow .18s ease;
        }
        .night-quick-btn .ui-ic {
          width:16px;
          height:16px;
        }
        .night-quick-btn.icon-only {
          width:34px;
          min-width:34px;
          height:34px;
          min-height:34px;
          padding:0;
          justify-content:center;
          border-radius:999px;
        }
        .night-quick-btn.icon-only .ui-ic {
          width:17px;
          height:17px;
        }
        .night-quick-btn.soft {
          background:rgba(255,255,255,.05);
        }
        .night-quick-btn.active {
          border-color:color-mix(in srgb, var(--ma-accent) 32%, rgba(171,185,255,.46));
          background:linear-gradient(135deg, color-mix(in srgb, var(--ma-accent) 16%, rgba(111,126,255,.16)), rgba(255,255,255,.08));
          box-shadow:0 12px 28px color-mix(in srgb, var(--ma-accent) 12%, rgba(7,10,20,.22));
        }
        .theme-light .night-quick-btn {
          background:rgba(255,255,255,.72);
          border-color:rgba(147,161,183,.2);
          box-shadow:0 10px 24px rgba(110,127,153,.12);
        }
        .theme-light .night-quick-btn.soft {
          background:rgba(255,255,255,.56);
        }
        .theme-light .night-quick-btn.active {
          background:linear-gradient(135deg, color-mix(in srgb, var(--ma-accent) 20%, white 80%), rgba(255,255,255,.88));
        }
        .compact-copy .night-quick-row {
          margin-top:8px;
        }
        .compact-copy .night-quick-btn {
          min-height:30px;
          padding:0 10px;
          font-size:11px;
          box-shadow:none;
          background:rgba(255,255,255,.06);
        }
        .compact-copy .night-quick-btn.icon-only {
          width:30px;
          min-width:30px;
          height:30px;
          min-height:30px;
          padding:0;
        }
`;
}
