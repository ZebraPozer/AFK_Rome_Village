# AFK Rome Village — browser prototype

Run from the project directory:

```sh
python3 -m http.server 4173 --bind 127.0.0.1 --directory prototype
```

Open http://127.0.0.1:4173. No build, installation, backend or account is required.

## Current loop

- The player prepares the village, then starts one of five finite waves.
- Four orc-raider variants spawn in rotation on the left and move toward the village on the X axis: axe raider, tattooed dual-sword fighter, helmeted shield guard and a larger red elite in blackened armor.
- The legionary holds the gate and automatically defeats enemies in range.
- Enemies stop to attack the legionary before they can damage the gate.
- Food fully heals the legionary; upgrades increase both damage and maximum health.
- After a defeat the legionary returns with 30% health while the farm keeps producing.
- Defeated enemies award two coins.
- The farmer produces food every three seconds, including between waves.
- Food upgrades the legionary; coins improve the farm and gate.
- A defeated wave can be retried without losing permanent upgrades.
- Wave five ends with a unique orc brute boss sprite and unlocks an archer on the scene.
- Pause, 1×/2× speed and reset controls are available.

The guard, raider and farmer sprites are extracted at runtime from the approved concept sheets. The boss uses a dedicated transparent production asset. Background removal is intentionally simple and local to this prototype. Production assets for Unreal should use clean transparent source files and a proper rig or sprite sequence.
