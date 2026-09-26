// Dynamic theme styles: the card surface tinted by the artwork palette.
// Order is preserved by card-styles.js.
export default function() {
  return `        .card.dynamic-theme {
          border-color:rgba(var(--dynamic-accent-rgb, 224 161 27) / .24);
          box-shadow:
            0 24px 56px rgba(0,0,0,.28),
            0 0 0 1px rgba(var(--dynamic-accent-rgb, 224 161 27) / .08),
            0 18px 42px rgba(var(--dynamic-glow-rgb, 255 178 56) / .12);
        }
        .theme-light.card.dynamic-theme {
          box-shadow:
            0 22px 56px rgba(73,89,110,.16),
            0 0 0 1px rgba(var(--dynamic-accent-rgb, 224 161 27) / .08),
            0 18px 40px rgba(var(--dynamic-glow-rgb, 255 178 56) / .1);
        }
        .card.dynamic-theme .bg {
          background:
            radial-gradient(circle at 18% 18%, rgba(var(--dynamic-glow-rgb, 255 178 56) / calc(.16 * var(--dynamic-theme-strength, .82))), transparent 32%),
            radial-gradient(circle at 82% 12%, rgba(var(--dynamic-accent-rgb, 224 161 27) / calc(.12 * var(--dynamic-theme-strength, .82))), transparent 26%),
            linear-gradient(180deg, rgba(var(--dynamic-surface-rgb, 12 15 22) / .42), rgba(var(--dynamic-surface-rgb, 12 15 22) / .96)),
            #0c0f16;
        }
        .card.dynamic-theme .shade {
          background:
            linear-gradient(180deg, rgba(var(--dynamic-surface-rgb, 12 15 22) / .12), rgba(var(--dynamic-surface-rgb, 12 15 22) / .64) 34%, rgba(9,12,19,.96)),
            radial-gradient(circle at 50% 84%, rgba(var(--dynamic-accent-rgb, 224 161 27) / calc(.12 * var(--dynamic-theme-strength, .82))), transparent 28%);
        }
        .card.dynamic-theme .glow {
          background:
            radial-gradient(circle at 50% 76%, rgba(var(--dynamic-glow-rgb, 255 178 56) / calc(.22 * var(--dynamic-theme-strength, .82))), transparent 32%),
            radial-gradient(circle at 16% 18%, rgba(var(--dynamic-accent-rgb, 224 161 27) / calc(.14 * var(--dynamic-theme-strength, .82))), transparent 24%);
        }
        .theme-light.card.dynamic-theme .bg {
          filter:blur(32px) saturate(calc(1.04 + (.08 * var(--dynamic-theme-strength, .82)))) brightness(1.05);
          opacity:.88;
        }
        .theme-light.card.dynamic-theme .shade {
          background:
            linear-gradient(180deg, rgba(255,255,255,.06), rgba(239,244,250,.18) 16%, rgba(var(--dynamic-surface-rgb, 224 232 244) / .38) 56%, rgba(204,214,228,.76)),
            radial-gradient(circle at 50% 82%, rgba(var(--dynamic-accent-rgb, 224 161 27) / calc(.06 * var(--dynamic-theme-strength, .82))), transparent 26%);
        }
        .theme-light.card.dynamic-theme .glow {
          background:
            radial-gradient(circle at 18% 20%, rgba(var(--dynamic-glow-rgb, 255 178 56) / calc(.12 * var(--dynamic-theme-strength, .82))), transparent 24%),
            radial-gradient(circle at 82% 16%, rgba(var(--dynamic-accent-rgb, 224 161 27) / calc(.08 * var(--dynamic-theme-strength, .82))), transparent 20%),
            radial-gradient(circle at 50% 78%, rgba(var(--dynamic-glow-rgb, 255 178 56) / calc(.1 * var(--dynamic-theme-strength, .82))), transparent 24%);
        }
`;
}
