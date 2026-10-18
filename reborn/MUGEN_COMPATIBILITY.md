# M.U.G.E.N 1.1 Beta 1 compatibility matrix

No full parity claim. “Partial” means the explicit subset below, not arbitrary package support.

| System | Status | Evidence / limit |
| --- | --- | --- |
| Fixed tick timing | Implemented for fixtures | 30/60/120Hz delta tests yield identical 600-tick snapshots |
| Ordered StateDefs/controllers | Partial | -3/-2/-1 order and bounded transitions; fixtures only |
| Controllers | Partial | ChangeState, CtrlSet, VelSet, VelAdd, PosAdd, HitDef, PowerAdd, LifeAdd, ChangeAnim; literal parameter subset |
| Trigger groups | Partial | triggerall AND; repeated numbered triggers AND; numbered groups OR; limited variables |
| Expressions | Partial | literals, basic arithmetic/comparison/logical operators, precedence, short circuit; no redirections/functions/ranges/variables |
| CMD | Partial | Single button, simultaneous button, held-button matching; no motions, charge, releases, direction semantics |
| AIR | Partial | actions, durations, loop point, collision defaults/overrides; no interpolation/blending transforms |
| SFF v1 / v2 | Pending | No binary sprite decoder |
| SND / ACT / FNT | Pending | No binary audio, palette or font decoder |
| External character gameplay | Pending | Content Lab inspects folders; never registers them as playable |
| Common states / physics | Fixture implementation | movement/guard/recovery are simplified core rules |
| HitDef | Partial | damage/chip, pause, stun, horizontal velocity, low guard eligibility; no attribute resolution / juggle / fall semantics |
| Combos/cancels | Fixture implementation | confirmed chains through parsed state rules and actual hitstun |
| Helpers / projectiles / throws | Pending | No entities or custom opponent states |
| Superpause / hit overrides | Pending | Global fixture hitpause only |
| Stage loading / backgrounds | Pending | One original programmatic stage; no DEF backgrounds/controllers |
| Camera | Fixture implementation | visual horizontal follow/zoom; not stage-configured 1.1 semantics |
| Motifs / lifebars / screenpacks | Pending | Browser UI currently supplies menus/HUD |
| Arcade / Versus / Survival / Training / Watch | Fixture implementations | modes have distinct rules; not all original engine options |
| Team modes | Pending | Not exposed as selectable modes |
| Audio | Fixture implementation | original synthesized impacts; no imported sounds/music |
| Persistence | Partial | settings and inspection reports only |
| Desktop/mobile controls | Implemented, unverified on hardware | logic tested where applicable, device/browser QA pending |

Sources consulted: Elecbyte CNS and AIR docs (version 1.1/2013); Ikemen GO README and build instructions. Elecbyte's linked readme.txt could not be retrieved through the web reader. Ikemen is a useful implementation reference, not evidence of exact Elecbyte behavior. A browser port of Ikemen has not been built or validated.
