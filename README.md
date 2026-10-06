# UNDER REVIEW // Signal Run

An unofficial, privacy-themed community mini game built around the emotional loop of waiting for an allowlist review.

**Live demo:** https://under-review-signal-run.vercel.app

## The mechanic

The player is shielded by default. Holding `Space` selectively reveals the player and allows proof fragments to be collected, but scanner cones can only detect a revealed identity. Reveal energy is limited and recharges while shielded. Collect seven real fragments before the 45-second review window closes.

Each run assigns one of nine procedurally rendered identity palettes inspired by the collection's broad visual language: pastel spectrum, color bars, violet checks, blue gradients, magenta, cobalt, matrix green, yellow halftone, and concentric color rings. No project artwork is copied or bundled.

Difficulty increases across three stages. Later stages add moving scanners, unstable decoy fragments, wider fields of view, a fifth scanner node, and an intermittent shielded recharge zone. Clean collections inside a short time window build a zero-trace score combo.

The mechanic translates the cypherpunk idea of selective revelation into play instead of using zkSNARKS artwork or application data.

## Run locally

```bash
python3 -m http.server 4173
```

Then open `http://localhost:4173`.

## Controls

- Move: arrow keys or WASD
- Reveal: hold Space
- Mobile: on-screen direction and reveal controls

Completing a run generates a downloadable, procedurally created pixel identity card. Everything runs locally in the browser. No wallet, login, analytics, or network request is used.
