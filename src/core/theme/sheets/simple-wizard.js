// FLOW wizard styles. Order is preserved by card-styles.js.
export default function() {
  return `        .simple-wizard-shell {
          display:grid;
          gap:18px;
          min-height:100%;
          align-content:start;
        }
        .simple-wizard-shell button {
          font:inherit;
          cursor:pointer;
        }
        .simple-wizard-progress {
          display:grid;
          grid-template-columns:repeat(3, minmax(0, 1fr));
          gap:10px;
        }
        .simple-wizard-progress-step {
          min-width:0;
          display:grid;
          grid-template-columns:28px minmax(0,1fr);
          align-items:center;
          gap:8px;
          padding:9px;
          border-radius:18px;
          background:linear-gradient(145deg, rgba(255,255,255,.08), rgba(255,255,255,.04));
          border:1px solid rgba(255,255,255,.12);
          color:rgba(255,255,255,.68);
          box-shadow:inset 0 1px 0 rgba(255,255,255,.08);
        }
        .simple-wizard-progress-step span {
          width:28px;
          height:28px;
          display:grid;
          place-items:center;
          border-radius:12px;
          background:rgba(255,255,255,.08);
          color:#fff;
          font-size:13px;
          font-weight:950;
        }
        .simple-wizard-progress-step strong {
          min-width:0;
          overflow:hidden;
          text-overflow:ellipsis;
          white-space:nowrap;
          font-size:12px;
          font-weight:900;
        }
        .simple-wizard-progress-step.active {
          color:#fff;
          border-color:color-mix(in srgb, var(--ma-accent) 34%, transparent);
          background:
            linear-gradient(145deg, color-mix(in srgb, var(--ma-accent) 22%, rgba(255,255,255,.08)), rgba(255,255,255,.05)),
            radial-gradient(circle at 15% 20%, rgba(255,255,255,.16), transparent 45%);
          box-shadow:0 16px 30px color-mix(in srgb, var(--ma-accent) 16%, transparent);
        }
        .simple-wizard-progress-step.done span {
          background:color-mix(in srgb, var(--ma-accent) 72%, #fff 10%);
        }
        .simple-wizard-toolbar {
          display:flex;
          justify-content:flex-end;
          margin-top:-4px;
        }
        .simple-wizard-reset-btn {
          min-height:38px;
          padding:0 18px;
          border-radius:999px;
          border:1px solid rgba(255,255,255,.14);
          background:linear-gradient(145deg, rgba(255,255,255,.1), rgba(255,255,255,.045));
          color:rgba(255,255,255,.82);
          font-size:13px;
          font-weight:900;
          box-shadow:inset 0 1px 0 rgba(255,255,255,.08), 0 12px 22px rgba(0,0,0,.12);
        }
        .simple-wizard-reset-btn:active {
          transform:translateY(1px);
        }
        .simple-wizard-panel {
          display:grid;
          gap:16px;
          animation:simpleWizardIn .2s ease;
        }
        @keyframes simpleWizardIn {
          from { opacity:0; transform:translateY(8px); }
          to { opacity:1; transform:translateY(0); }
        }
        .simple-wizard-title {
          color:#fff;
          font-size:24px;
          line-height:1.12;
          font-weight:950;
        }
        .simple-wizard-player-grid,
        .simple-wizard-option-grid {
          display:grid;
          grid-template-columns:repeat(2, minmax(0, 1fr));
          gap:12px;
        }
        .simple-wizard-player,
        .simple-wizard-option,
        .simple-wizard-source {
          min-width:0;
          width:100%;
          display:grid;
          align-items:center;
          gap:12px;
          border:none;
          color:#fff;
          text-align:inherit;
          background:
            linear-gradient(145deg, rgba(255,255,255,.12), rgba(255,255,255,.045)),
            radial-gradient(circle at 14% 18%, rgba(255,255,255,.08), transparent 42%);
          border:1px solid rgba(255,255,255,.13);
          box-shadow:inset 0 1px 0 rgba(255,255,255,.08), 0 20px 38px rgba(0,0,0,.17);
          transition:transform .16s ease, border-color .16s ease, background-color .16s ease, box-shadow .16s ease;
        }
        .simple-wizard-player {
          grid-template-columns:54px minmax(0,1fr) 34px;
          min-height:88px;
          padding:12px;
          border-radius:22px;
        }
        .simple-wizard-option {
          grid-template-columns:48px minmax(0,1fr);
          min-height:92px;
          padding:14px;
          border-radius:22px;
        }
        .simple-wizard-source-grid {
          display:grid;
          grid-template-columns:repeat(2, minmax(0, 1fr));
          gap:12px;
        }
        .simple-wizard-source {
          min-height:86px;
          justify-items:center;
          text-align:center;
          padding:14px;
          border-radius:22px;
        }
        .simple-wizard-source span,
        .simple-wizard-option-icon,
        .simple-wizard-player-icon,
        .simple-wizard-player-art,
        .simple-wizard-check {
          display:grid;
          place-items:center;
        }
        .simple-wizard-source .ui-ic {
          width:28px;
          height:28px;
        }
        .simple-wizard-source strong {
          font-size:18px;
          font-weight:950;
        }
        .simple-wizard-player-art,
        .simple-wizard-player-icon,
        .simple-wizard-option-icon {
          width:48px;
          height:48px;
          border-radius:16px;
          overflow:hidden;
          background:rgba(255,255,255,.08);
          color:var(--ma-accent);
          border:1px solid rgba(255,255,255,.12);
        }
        .simple-wizard-player-art img {
          width:100%;
          height:100%;
          object-fit:cover;
          display:block;
        }
        .simple-wizard-option-icon .ui-ic,
        .simple-wizard-player-icon .ui-ic,
        .simple-wizard-player-art .ui-ic {
          width:24px;
          height:24px;
        }
        .simple-wizard-player-copy,
        .simple-wizard-review-copy {
          min-width:0;
          display:grid;
          gap:3px;
        }
        .simple-wizard-option-title {
          display:block;
          min-width:0;
          overflow:hidden;
          text-overflow:ellipsis;
          white-space:nowrap;
          font-size:17px;
          line-height:1.2;
          font-weight:950;
        }
        .simple-wizard-option-sub {
          display:block;
          min-width:0;
          overflow:hidden;
          text-overflow:ellipsis;
          white-space:nowrap;
          color:rgba(255,255,255,.68);
          font-size:12px;
          line-height:1.25;
          font-weight:750;
        }
        .simple-wizard-check {
          width:34px;
          height:34px;
          border-radius:14px;
          background:rgba(255,255,255,.08);
          color:rgba(255,255,255,.76);
        }
        .simple-wizard-check .ui-ic {
          width:18px;
          height:18px;
        }
        .simple-wizard-player.active,
        .simple-wizard-option.active,
        .simple-wizard-source.active {
          border-color:color-mix(in srgb, var(--ma-accent) 42%, transparent);
          background:
            linear-gradient(145deg, color-mix(in srgb, var(--ma-accent) 20%, rgba(255,255,255,.09)), rgba(255,255,255,.055)),
            radial-gradient(circle at 18% 18%, color-mix(in srgb, var(--ma-accent) 22%, transparent), transparent 46%);
          box-shadow:0 20px 36px color-mix(in srgb, var(--ma-accent) 18%, rgba(0,0,0,.16));
        }
        .simple-wizard-option.free {
          border-style:solid;
          background:
            linear-gradient(145deg, rgba(255,255,255,.13), rgba(255,255,255,.05)),
            radial-gradient(circle at 84% 18%, color-mix(in srgb, var(--ma-accent) 18%, transparent), transparent 42%);
        }
        .simple-wizard-player.active .simple-wizard-check,
        .simple-wizard-option.active .simple-wizard-option-icon {
          background:color-mix(in srgb, var(--ma-accent) 72%, rgba(255,255,255,.16));
          color:#fff;
        }
        .simple-wizard-player.is-playing .simple-wizard-player-art {
          box-shadow:0 0 0 2px color-mix(in srgb, var(--ma-accent) 48%, transparent);
        }
        .simple-wizard-search {
          display:grid;
          gap:8px;
          color:rgba(255,255,255,.76);
          font-size:13px;
          font-weight:850;
        }
        .simple-wizard-search input {
          width:100%;
          min-height:58px;
          border-radius:20px;
          border:1px solid rgba(255,255,255,.13);
          background:rgba(255,255,255,.08);
          color:#fff;
          padding:0 16px;
          font:inherit;
          font-size:16px;
          outline:none;
        }
        .simple-wizard-search input:focus {
          border-color:color-mix(in srgb, var(--ma-accent) 46%, transparent);
          box-shadow:0 0 0 3px color-mix(in srgb, var(--ma-accent) 16%, transparent);
        }
        .simple-wizard-footer {
          position:sticky;
          inset-block-end:0;
          display:grid;
          grid-template-columns:repeat(2, minmax(0, 1fr));
          gap:10px;
          padding-top:8px;
          background:linear-gradient(180deg, transparent, rgba(14,16,24,.86) 30%, rgba(14,16,24,.94));
          z-index:2;
        }
        .simple-wizard-footer.triple {
          grid-template-columns:minmax(0,.8fr) minmax(0,.8fr) minmax(0,1.2fr);
        }
        .simple-wizard-footer.single {
          grid-template-columns:minmax(0,1fr);
        }
        .simple-wizard-primary,
        .simple-wizard-secondary {
          min-width:0;
          min-height:58px;
          border-radius:19px;
          border:1px solid rgba(255,255,255,.14);
          color:#fff;
          font-size:16px;
          font-weight:950;
          text-align:center;
          display:grid;
          place-items:center;
        }
        .simple-wizard-primary {
          background:
            linear-gradient(135deg, color-mix(in srgb, var(--ma-accent) 76%, #ffffff 10%), color-mix(in srgb, var(--ma-accent) 48%, #4f7cff 34%));
          box-shadow:0 18px 32px color-mix(in srgb, var(--ma-accent) 22%, rgba(0,0,0,.2));
        }
        .simple-wizard-secondary {
          background:rgba(255,255,255,.08);
        }
        .simple-wizard-primary:disabled {
          opacity:.44;
          cursor:not-allowed;
          box-shadow:none;
        }
        .simple-wizard-loading {
          min-height:260px;
          justify-items:center;
          align-content:center;
          text-align:center;
        }
        .simple-wizard-loader {
          width:82px;
          height:82px;
          display:grid;
          place-items:center;
          border-radius:28px;
          color:#fff;
          background:color-mix(in srgb, var(--ma-accent) 28%, rgba(255,255,255,.08));
          border:1px solid color-mix(in srgb, var(--ma-accent) 32%, transparent);
          animation:simpleWizardPulse 1.25s ease-in-out infinite;
        }
        .simple-wizard-loader .ui-ic {
          width:34px;
          height:34px;
        }
        @keyframes simpleWizardPulse {
          0%, 100% { transform:scale(1); opacity:.84; }
          50% { transform:scale(1.06); opacity:1; }
        }
        .simple-wizard-review-card {
          min-width:0;
          display:grid;
          grid-template-columns:108px minmax(0,1fr);
          gap:14px;
          align-items:center;
          padding:14px;
          border-radius:26px;
          background:
            linear-gradient(145deg, rgba(255,255,255,.13), rgba(255,255,255,.06)),
            radial-gradient(circle at 18% 16%, color-mix(in srgb, var(--ma-accent) 22%, transparent), transparent 48%);
          border:1px solid color-mix(in srgb, var(--ma-accent) 26%, rgba(255,255,255,.12));
          box-shadow:0 22px 42px rgba(0,0,0,.18);
        }
        .simple-wizard-review-art {
          width:108px;
          aspect-ratio:1/1;
          border-radius:24px;
          overflow:hidden;
          display:grid;
          place-items:center;
          background:rgba(255,255,255,.08);
          color:var(--ma-accent);
        }
        .simple-wizard-review-art img {
          width:100%;
          height:100%;
          object-fit:cover;
          display:block;
        }
        .simple-wizard-review-kicker {
          color:color-mix(in srgb, var(--ma-accent) 78%, #fff 18%);
          font-size:13px;
          font-weight:900;
        }
        .simple-wizard-review-title {
          min-width:0;
          overflow:hidden;
          text-overflow:ellipsis;
          display:-webkit-box;
          -webkit-line-clamp:2;
          -webkit-box-orient:vertical;
          color:#fff;
          font-size:24px;
          line-height:1.12;
          font-weight:950;
        }
        .simple-wizard-review-sub {
          min-width:0;
          overflow:hidden;
          text-overflow:ellipsis;
          white-space:nowrap;
          color:rgba(255,255,255,.7);
          font-size:14px;
          font-weight:750;
        }
        .simple-wizard-section-head {
          min-width:0;
          display:flex;
          align-items:end;
          justify-content:space-between;
          gap:10px;
          color:#fff;
          padding:0 2px;
        }
        .simple-wizard-section-head span {
          font-size:18px;
          font-weight:950;
        }
        .simple-wizard-section-head small {
          min-width:0;
          color:rgba(255,255,255,.6);
          font-size:12px;
          font-weight:800;
          text-align:end;
        }
        .simple-wizard-result-grid {
          display:grid;
          grid-template-columns:repeat(2, minmax(0, 1fr));
          gap:12px;
        }
        .simple-wizard-result {
          min-width:0;
          width:100%;
          min-height:112px;
          display:grid;
          grid-template-columns:76px minmax(0,1fr) 34px;
          align-items:center;
          gap:12px;
          padding:12px;
          border-radius:24px;
          border:1px solid rgba(255,255,255,.13);
          background:
            linear-gradient(145deg, rgba(255,255,255,.115), rgba(255,255,255,.045)),
            radial-gradient(circle at 16% 16%, rgba(255,255,255,.08), transparent 42%);
          color:#fff;
          text-align:inherit;
          box-shadow:inset 0 1px 0 rgba(255,255,255,.08), 0 20px 36px rgba(0,0,0,.16);
          transition:transform .16s ease, border-color .16s ease, background .16s ease, box-shadow .16s ease;
        }
        .simple-wizard-result.active {
          border-color:color-mix(in srgb, var(--ma-accent) 48%, transparent);
          background:
            linear-gradient(145deg, color-mix(in srgb, var(--ma-accent) 21%, rgba(255,255,255,.095)), rgba(255,255,255,.055)),
            radial-gradient(circle at 18% 14%, color-mix(in srgb, var(--ma-accent) 24%, transparent), transparent 48%);
          box-shadow:0 22px 42px color-mix(in srgb, var(--ma-accent) 18%, rgba(0,0,0,.18));
        }
        .simple-wizard-result-art {
          width:76px;
          aspect-ratio:1/1;
          display:grid;
          place-items:center;
          overflow:hidden;
          border-radius:22px;
          background:rgba(255,255,255,.08);
          border:1px solid rgba(255,255,255,.12);
          color:var(--ma-accent);
        }
        .simple-wizard-result-art img {
          width:100%;
          height:100%;
          object-fit:cover;
          display:block;
        }
        .simple-wizard-result-art .ui-ic {
          width:28px;
          height:28px;
        }
        .simple-wizard-result-copy {
          min-width:0;
          display:grid;
          gap:4px;
        }
        .simple-wizard-result-kicker {
          color:color-mix(in srgb, var(--ma-accent) 78%, #fff 16%);
          font-size:12px;
          font-weight:900;
        }
        .simple-wizard-result-title {
          min-width:0;
          overflow:hidden;
          text-overflow:ellipsis;
          display:-webkit-box;
          -webkit-line-clamp:2;
          -webkit-box-orient:vertical;
          color:#fff;
          font-size:17px;
          line-height:1.16;
          font-weight:950;
        }
        .simple-wizard-result-sub {
          min-width:0;
          overflow:hidden;
          text-overflow:ellipsis;
          white-space:nowrap;
          color:rgba(255,255,255,.65);
          font-size:12px;
          font-weight:760;
        }
        .simple-wizard-result-check {
          width:34px;
          height:34px;
          display:grid;
          place-items:center;
          border-radius:14px;
          background:rgba(255,255,255,.08);
          color:rgba(255,255,255,.78);
        }
        .simple-wizard-result.active .simple-wizard-result-check {
          background:color-mix(in srgb, var(--ma-accent) 72%, rgba(255,255,255,.16));
          color:#fff;
        }
        .simple-wizard-result-check .ui-ic {
          width:18px;
          height:18px;
        }
        .simple-wizard-candidates {
          display:flex;
          gap:8px;
          overflow:auto;
          padding-bottom:2px;
          scrollbar-width:none;
        }
        .simple-wizard-candidates::-webkit-scrollbar { display:none; }
        .simple-wizard-candidate {
          flex:0 0 auto;
          max-width:190px;
          min-height:42px;
          padding:0 14px;
          border-radius:16px;
          border:1px solid rgba(255,255,255,.12);
          background:rgba(255,255,255,.07);
          color:#fff;
          font-size:13px;
          font-weight:850;
        }
        .simple-wizard-candidate span {
          display:block;
          overflow:hidden;
          text-overflow:ellipsis;
          white-space:nowrap;
        }
        .simple-wizard-candidate.active {
          border-color:color-mix(in srgb, var(--ma-accent) 42%, transparent);
          background:color-mix(in srgb, var(--ma-accent) 18%, rgba(255,255,255,.08));
        }
        .surprise-popup.simple-wizard-popup {
          z-index:92;
        }
        .simple-wizard-popup-card {
          width:min(300px, calc(100% - 28px));
        }
        .theme-light .simple-wizard-progress-step,
        .theme-light .simple-wizard-player,
        .theme-light .simple-wizard-option,
        .theme-light .simple-wizard-source,
        .theme-light .simple-wizard-search input,
        .theme-light .simple-wizard-secondary,
        .theme-light .simple-wizard-reset-btn,
        .theme-light .simple-wizard-result,
        .theme-light .simple-wizard-candidate {
          background:rgba(255,255,255,.84);
          border-color:rgba(147,161,183,.2);
          color:#16202d;
          box-shadow:0 14px 28px rgba(110,127,153,.12);
        }
        .theme-light .simple-wizard-title,
        .theme-light .simple-wizard-option-title,
        .theme-light .simple-wizard-review-title,
        .theme-light .simple-wizard-section-head,
        .theme-light .simple-wizard-result-title {
          color:#16202d;
        }
        .theme-light .simple-wizard-option-sub,
        .theme-light .simple-wizard-review-sub,
        .theme-light .simple-wizard-section-head small,
        .theme-light .simple-wizard-result-sub,
        .theme-light .simple-wizard-search {
          color:#5f6c80;
        }
        .theme-light .simple-wizard-footer {
          background:linear-gradient(180deg, transparent, rgba(248,250,253,.9) 30%, rgba(248,250,253,.96));
        }
        @media (max-width:560px) {
          .simple-wizard-player-grid,
          .simple-wizard-option-grid,
          .simple-wizard-source-grid,
          .simple-wizard-result-grid {
            grid-template-columns:minmax(0,1fr);
          }
          .simple-wizard-toolbar {
            justify-content:stretch;
          }
          .simple-wizard-reset-btn {
            width:100%;
          }
          .simple-wizard-review-card {
            grid-template-columns:82px minmax(0,1fr);
          }
          .simple-wizard-result {
            grid-template-columns:66px minmax(0,1fr) 32px;
            min-height:94px;
            border-radius:22px;
          }
          .simple-wizard-result-art {
            width:66px;
            border-radius:19px;
          }
          .simple-wizard-review-art {
            width:82px;
            border-radius:20px;
          }
          .simple-wizard-review-title {
            font-size:20px;
          }
          .simple-wizard-footer.triple {
            grid-template-columns:minmax(0,1fr);
          }
        }
`;
}
