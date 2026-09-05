# Dashboard AnyDesire Premium Polish (Dark-Mode Depth/Contrast)

Status: awaiting EXECUTE approval.

Scope: `app/home.html` only — the `<style>` block (lines 12–249) and the four
inline colors in the mockup renderer (lines 346–359). No JS logic changes.

## Tokens added to `:root`
- `--text-secondary: #c7c0d9` — legible secondary copy (card names).
- `--text-tertiary: #a9a2c0` — dim but readable meta (sizes, tags, misc).
- `--skeleton: rgba(244,241,250,0.18)` — light skeleton bars.
- `--skeleton-strong: rgba(244,241,250,0.34)` — frame lines.
- `--card-bg` = `linear-gradient(180deg, rgba(255,255,255,0.045), rgba(255,255,255,0.012)), var(--bg-secondary)`.

## Changes
1. Typography: `.hero p` → rgba(255,255,255,0.62); `.tpl-meta` → --text-tertiary;
   `.stat-chip .lbl` → rgba(255,255,255,0.5); `.tpl-name` → --text-secondary.
2. Cards: `.tpl-card` uses --card-bg, `border: 1px solid rgba(255,255,255,0.07)`,
   resting `box-shadow: 0 10px 40px rgba(0,0,0,0.4)`, hover `0 26px 60px rgba(0,0,0,0.55)`.
3. Stats: `.stat-chip .num` → 1.7rem/800/var(--text); labels 0.72rem at 50% white;
   padding 16px 22px; gap 14px.
4. Pills: `.pill.active` → `background: rgba(168,85,247,0.16); color:#d8b4fe;
   border:1px solid rgba(168,85,247,0.3)` (glass tint, not solid CTA).
5. Thumbnails: skeleton bars → var(--skeleton); inner bg `#171225`→`#211a38`;
   dark panel in JS `#0f0c18`→`#2a2244`; frame borders → var(--skeleton-strong).
6. Header: `.site-header` + `box-shadow: 0 8px 30px rgba(0,0,0,0.18)`.

## Verification
CDP (9222) on http://127.0.0.1:5198/app/home.html — computed-style asserts:
card backgroundImage, pill.active color, hero p alpha, .num size, grid renders 8,
no console errors.