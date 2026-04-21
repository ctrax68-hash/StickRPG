# Stick RPG Mobile

A mobile-first browser remake of the classic XGen Studios Flash game **Stick RPG**, built as a single-page HTML5 app with touch controls.

## Play

Open `index.html` in any modern browser — no server, no build step, no dependencies.

For GitHub Pages, just push to a repo and enable Pages on the `main` branch. The game will be live at `https://<username>.github.io/<repo>/`.

-----

## File Structure

```
stick-rpg-mobile/
├── index.html   — HTML shell + all game markup
├── style.css    — All styles (HUD, modal, minimap, achievements, etc.)
├── game.js      — All game logic (~1870 lines)
└── README.md
```

-----

## Features

### Core Gameplay

- Top-down 2D open world with D-pad touch controls
- 19 unique SVG-drawn buildings across 4 quadrants
- Camera follows player across a 1200×1100 world
- Save/load via `localStorage` with auto-save

### Stats & Progression

- **STR / INT / CHA / Karma** — all capped at 99
- **Energy system** — drains on work/training, restores with food/sleep
- **Time of day clock** — buildings open/close on real hours
- **Day cycle** — bank interest, loan growth, stock price drift on sleep

### Jobs

- McStick’s, New Lines Inc, Jim’s Gym, Police Dept
- Promotions every 2 shifts, energy required to work

### Economy

- Bank deposits, withdrawals, loans (5%/day interest)
- Stock market — buy/sell shares, price drifts ±20%/day
- Real estate — Apartment ($500), Condo ($2500), Mansion ($10k)
- Car purchase ($3000) at Bus Depot

### Crime Path

- Back Alley dealer — buy/sell cocaine, rob the bank
- **Heitkamp Masonry** — rob the vault (STR-based, 3-day cooldown)
- Street fights — random encounters, STR-based outcomes

### Apartment Furnishing

Each item unlocks a daily usable perk:

|Item         |Cost |Perk                       |
|-------------|-----|---------------------------|
|🛏️ Bed        |$200 |+10 sleep energy           |
|📺 TV         |$400 |Free +1 CHA/day            |
|🛋️ Couch      |$600 |Free +20 energy rest       |
|💻 Desk       |$800 |Study at home +1 INT for $5|
|🎮 Console    |$1200|Free +1 CHA +15 energy/day |
|🏆 Trophy Case|$2000|Permanent +5 CHA           |

### Karma System

- Good karma (15+): discounts at shops & hospital
- Evil karma (-30+): markups at shops, bonuses at shady places
- Karma description shown in apartment and status screens

### Win Conditions

- 🌀 **Escape** — Car + $10k + STR/INT/CHA 30 + 3 furnishings → use portal at Castle
- 🗳️ **President** — KAR 50 + $50k
- 👹 **Dictator** — KAR -50 + $50k

### Street Events

Random encounters while walking: fights, NPCs with dialogue choices, found money, drunk encounters, investment scams

### Achievements (20 total)

First Paycheck, Grand, Ten Large, First Blood, Street Fighter, Getting Buff, Big Brain, Charmer, Saint, Villain, Home Owner, Car Owner, Fully Furnished, Investor, Debt Free, Criminal, Still Alive, Month In, Ready to Escape

### Polish

- **Sky changes color** by time of day (sunrise → day → sunset → night)
- **Mini-map** — live top-right overlay with all buildings + player dot
- **Stat pop animations** — floating +/- numbers on every stat change
- **Web Audio sound effects** — coin, lose, level-up fanfare, punch, buy, achievement (no files, pure tone synthesis)
- **Bug reporter panel** — in-game bug reporting with full state snapshot

-----

## Buildings

|Building        |Location    |Hours    |
|----------------|------------|---------|
|Your Apt        |Top-left    |24/7     |
|University      |Top-left    |8AM–10PM |
|Castle          |Top-left    |24/7     |
|New Lines Inc   |Top-left    |8AM–6PM  |
|Jim’s Gym       |Top-left    |6AM–11PM |
|City Bank       |Top-right   |9AM–5PM  |
|Hospital        |Top-right   |24/7     |
|Real Estate     |Top-right   |9AM–6PM  |
|Police Dept     |Top-right   |24/7     |
|Food Mart       |Top-right   |7AM–11PM |
|McStick’s       |Bottom-left |6AM–12AM |
|The Bar         |Bottom-left |4PM–12AM |
|Back Alley      |Bottom-left |8PM–12AM |
|Shop            |Bottom-left |7AM–11PM |
|Heitkamp Masonry|Bottom-left |24/7     |
|Casino          |Bottom-right|12PM–12AM|
|Bus Depot       |Bottom-right|6AM–10PM |
|Clinic          |Bottom-right|24/7     |
|Court House     |Bottom-right|24/7     |

-----

## Tech

- Pure HTML5 / CSS3 / Vanilla JS — zero dependencies, zero build tools
- SVG buildings drawn programmatically via `createElementNS`
- Web Audio API for sound (no audio files)
- Canvas API for minimap
- `localStorage` for persistence
- Touch events with `passive: false` for responsive D-pad

-----

## License

MIT