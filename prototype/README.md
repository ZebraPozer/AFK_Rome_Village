# AFK Rome Village — browser prototype

Run from the project directory:

```sh
python3 -m http.server 4173 --bind 127.0.0.1 --directory prototype
```

Open http://127.0.0.1:4173. No build, installation, backend or account is required.

## Current loop and town progression

The player starts each wave manually. The guard fights automatically, the farmer
produces food every three seconds, and ambient patrols provide slow coin income.
Every wave and retry restores guard health for free. Recovery between fights is
free too. Food upgrades the guard; coins upgrade the farm and spikes.

Town I starts with one farmhouse and no archer or tower. Guard and farm upgrades
cap at level 5. Spikes unlock after wave three and cap at level 2. Ordinary wave
victories do not increase these caps. AFK wealth cannot bypass the town tier.

Defeating the wave-five boss unlocks a free town upgrade button. Town II adds a
second house, a tower and an archer without another purchase or a new currency.
The guard/farm/spikes caps increase to 10/10/4. Repeated clicks or rewards cannot
claim another tier. Reset restores town I and removes the archer and tower.
The archer fires one damage every 3.6 seconds and can fight ambient patrols after
the finale. Wave six and later town tiers are not implemented yet.

First victories award `6 + 3 * wave` coins plus enemy kill rewards, with no food
bonus. Three ambient patrol kills award one coin. The first wave pays 11 coins
including its kill, enough for the first farm upgrade (6 coins).
Saving and income while the browser is closed are not implemented yet.
Pause, reset and 1x/100x simulation controls are available.

## Wave difficulty

The five playable waves contain 1, 2, 2, 3 and 4 enemies, respectively; the last
includes the boss. Spawns are at least four seconds apart, at most two enemies
are alive at once, and the boss enters after the others are defeated. Waves
6–10 are not playable yet; the fallback roster has only four enemies, within
the early-game limit of five. Wave one has fixed stats; later waves scale enemy
HP and attack from the wave number and permanent combat upgrades.

With `s = wave - 1` and `d = guard DPS / starting guard DPS`:

- HP multiplier: `(1 + 0.3s + 0.06s²) × (1 + 0.35(√d − 1) + 0.12 × spikesLevel^0.75) × roster tuning`.
- Attack multiplier: `(1 + 0.12s) × (maxGuardHp / 100)^0.25`.

Roster HP tuning for waves 1–5 is `9.8325, 5.4, 4.69, 2.96, 0.702` (wave one
uses its value directly). Small groups have enough HP to pose a threat. If
the guard falls and the wave passes the defense, the attempt fails even when
the gate survives; enemies getting through never award a victory bonus.

The adaptation grows more slowly than player power. Farm, gate, saved resources,
current HP and time spent waiting do not increase difficulty. Each wave locks its
multipliers on the first attempt and retains them on retries, so upgrading after
a loss helps. Reset clears these snapshots. Ambient patrols keep their base stats.
The panel previews the next wave's multipliers before launch.

Run the deterministic combat and difficulty checks with:

```sh
node prototype/tests/wave-balance.cjs
```

The deterministic farm/upgrade/play route ends with 31%, 37%, 40%, 36% and 22% guard
HP across the five waves. Different purchases and preparation can change those
outcomes; these are calibration results rather than guaranteed health values.

`node prototype/tools/balance-bot.cjs` runs a reproducible five-wave player:
between waves it prioritizes the farm, buys available defenses and waits for
enough food to bring the guard to the upcoming wave's level, then plays
the real combat loop. The report includes preparation time and separate 2- and
10-minute AFK purchase scenarios. The regression test requires this route to win with the
guard (not the gate) at 10–40% HP after every wave. This is a tension band, not
an exact 20% target, so purchases can still create visible advantages and combat
does not feel secretly scripted to one result.

The guard, raider and farmer sprites are extracted at runtime from the approved concept sheets. The boss uses a dedicated transparent production asset. Background removal is intentionally simple and local to this prototype. Production assets for Unreal should use clean transparent source files and a proper rig or sprite sequence.
