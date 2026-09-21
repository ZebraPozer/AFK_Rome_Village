# AFK Rome Village — browser prototype

Run from the project directory:

```sh
python3 -m http.server 4173 --bind 127.0.0.1 --directory prototype
```

Open http://127.0.0.1:4173. No build, installation, backend or account is required.

## Current loop

- The player prepares the village, then starts one of five finite waves.
- Four orc-raider variants spawn in rotation on the left, spread across several depth lanes, and move toward the village: axe raider, tattooed dual-sword fighter, helmeted shield guard and a larger red elite in blackened armor.
- The legionary holds the gate and automatically defeats enemies in range.
- Enemies stop to attack the legionary before they can damage the gate.
- Food fully heals the legionary; upgrades increase both damage and maximum health.
- After a defeat the legionary returns with 30% health while the farm keeps producing.
- Defeated enemies award two coins.
- The farmer produces food every three seconds, including between waves.
- Food upgrades the legionary; coins improve the farm and gate.
- Coins can buy and upgrade an indestructible spike barricade that deals passive contact damage.
- A defeated wave can be retried without losing permanent upgrades.
- Wave five ends with a unique orc brute boss sprite and unlocks an archer on the scene.
- Pause, 1×/2× speed and reset controls are available.

## Wave difficulty

Wave one keeps the original stats. Later waves scale enemy HP and attack from
the wave number and permanent combat upgrades. The roster stays capped at the
existing 16 enemies; attack cadence, rewards and gate damage remain unchanged.

With `s = wave - 1` and `d = guard DPS / starting guard DPS`:

- HP multiplier: `(1 + 0.3s + 0.06s²) × (1 + 0.35(√d − 1) + 0.12 × spikesLevel^0.75)`.
- Attack multiplier: `(1 + 0.12s) × (maxGuardHp / 100)^0.25`.

The adaptation grows more slowly than player power. Farm, gate, saved resources,
current HP and time spent waiting do not increase difficulty. Each wave locks its
multipliers on the first attempt and retains them on retries, so upgrading after
a loss helps. Reset clears these snapshots. Ambient patrols keep their base stats.
The panel previews the next wave's multipliers before launch.

Run the deterministic combat and difficulty checks with:

```sh
node prototype/tests/wave-balance.cjs
```

These are initial tuning values, not a substitute for playtesting. At full health,
the fixed-step simulation clears wave 4 with guard level 4 / spikes level 1 at
1 guard HP; wave 5 with guard level 5 / spikes level 2 ends at 4 gate HP. Different
enemy timing and preparation can change those outcomes.

The guard, raider and farmer sprites are extracted at runtime from the approved concept sheets. The boss uses a dedicated transparent production asset. Background removal is intentionally simple and local to this prototype. Production assets for Unreal should use clean transparent source files and a proper rig or sprite sequence.
