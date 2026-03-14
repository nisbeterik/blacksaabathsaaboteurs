# SAAB Base Commander — Game Design

## Vision

A single-player roguelike-strategy simulator of a Swedish Air Force dispersed road base
(vägbas). The player acts as Base Battalion Commander (BC), making decisions about aircraft
allocation, maintenance prioritisation, and resource management across a 3-day crisis
escalation campaign.

The AI assistant (LLM) is a key tool: it analyses situations, identifies options, and
argues trade-offs. There is rarely a "right" answer — only choices with different risks
and consequences. The AI helps the player reason, not replace their judgement.

---

## Campaign Arc (3 Days)

The campaign escalates automatically. The player cannot prevent escalation — they can only
manage its consequences.

| Day | Phase | Flavour |
|-----|-------|---------|
| 1   | Fred  | Peacetime — limited missions, learning the systems, low pressure |
| 2   | Kris  | Crisis — elevated readiness, restricted logistics, more ATO missions |
| 3   | Krig  | War — full combat ops, hard mission quotas, constant attrition |

Phase escalation fires as a narrative event when the day rolls over:
- Day 2 start: "Intelligence confirms threat escalation. Phase: Fred → Kris."
- Day 3 start: "Hostilities confirmed. Phase: Kris → Krig."

---

## Game End

### Win: Survive all 3 days
Campaign ends when Day 4 begins. Final score determines the commander grade.

### Defeat: Fail state triggered mid-campaign
Any of the following ends the campaign immediately:

| Fail State | Threshold | Attribution |
|------------|-----------|-------------|
| Fleet collapse | Fewer than 3 operational aircraft (green + airborne + returning) for 6+ hours | Mixed |
| Score collapse | Campaign score drops below 700 | Decision |
| Strategic defeat | 3 or more aircraft written off | Mixed |

---

## Aircraft Written Off

When an aircraft's `remaining_life` reaches 0, it is **permanently written off** (status:
`written_off`). It cannot return to service. A GripenE lost is a major strategic loss.

This makes life management genuinely consequential — sending GE08 (20h remaining) on
another sortie is gambling an aircraft worth hundreds of millions of SEK.

---

## Mission Resolution

When an aircraft completes a sortie, a success roll determines the outcome:

```
base_success = {DCA: 75%, RECCE: 85%, AI/ST: 70%, QRA: 90%, AEW: 80%}
config_match  = +10% if configuration matches required_config
config_miss   = -15% if configuration does not match
life > 100h   = +5%
life 50–100h  = 0%
life 20–50h   = -15%
life < 20h    = -30% (should be grounded — player fault if sent)
phase Kris    = -5%
phase Krig    = -15%
```

Outcome is logged in the event log. Failed sorties lose points and may generate
narrative consequences (enemy breach, mission regenerated on next ATO).

---

## Campaign Score

Starting score: **1000**. Tracked throughout the campaign. Determines final grade.

### Score events

| Event | Delta | Category | Detail logged |
|-------|-------|----------|---------------|
| Sortie success (outcome roll) | +10 | luck | Narrative outcome in log |
| Sortie failure (outcome roll) | -20 | luck | Outcome in log |
| Missed departure (mission left unassigned) | -80 | **decision** | How many green aircraft were available |
| Wrong config assigned when correct was available | -25 | **decision** | Which correct-config aircraft was idle |
| Aircraft life ≤ 20h sent on mission | -35 | **decision** | Player chose to fly a grounded-threshold aircraft |
| Aircraft written off | -100 | mixed | Aircraft ID |
| Day ends with ≥ 6 operational aircraft | +15 | — | Daily readiness bonus |
| Post-mission fault (random) | -10 | luck | Not the player's fault |
| BIT fault (random) | -10 | luck | Not the player's fault |
| QRA scramble — manned (≥2 assigned) | +25 | luck | Intercept success |
| QRA scramble — unmanned | -60 | **decision** | Player chose not to man QRA |
| RTB abort | -25 | **decision** | Player recalled aircraft mid-sortie |

### Commander Grades

| Score | Grade |
|-------|-------|
| ≥ 950     | **Gold — Outstanding** |
| 875–949   | **Silver — Commended** |
| 800–874   | **Bronze — Satisfactory** |
| 700–799   | **Marginal — Survived** |
| < 700     | **Campaign Failed** (immediate defeat) |

---

## AI Assistant — Trade-off Reasoning

The LLM is a co-pilot, not an oracle. It should:

1. **Enumerate options** — present 2–3 realistic choices, not just one recommendation
2. **Assign rough probabilities** — "using GE08 gives ~45% success; waiting 2h for GE03 gives 74%"
3. **Argue the trade-off** — what you gain vs what you risk for each option
4. **Flag attribution** — "if you choose X and it fails, that's an acceptable risk; if you choose Y and it fails, you took an avoidable gamble"

The score log (last 10 events) is injected into the LLM context so the assistant can
explain why the score changed and what the player could have done differently.

---

## Decision Points (Trade-offs)

These are the core decisions the player must navigate:

- **Which aircraft to assign?** High life vs available config vs fleet balance
- **Use UE now or save it?** Mission urgency vs strategic reserve
- **Send GE08 or wait?** Partial coverage now vs full coverage later (written-off risk)
- **Scrub a mission or fly under-strength?** Score hit now vs risk of failure later
- **Prioritise maintenance or fly?** More sorties now vs fleet health tomorrow

---

## QRA Scramble Events

QRA (Quick Reaction Alert) is a standing mission that appears on every Kris/Krig ATO.
It requires 2 × DCA/CAP aircraft on standby 24h.

**The trade-off**: those 2 aircraft could fly offensive sorties instead.
**The consequence**: when a scramble event fires (random, 2× weighted in Krig phase):

| QRA status | Outcome | Score |
|---|---|---|
| 2+ aircraft assigned | Intercept success — "Airspace defended" | +25 (luck) |
| Unassigned / undermanned | Scramble missed — "Airspace undefended" | -60 (decision) |

Scramble events pause autoplay so the player sees what happened. Assigning to QRA is a real
strategic decision — you're sacrificing offensive capability for defensive coverage.

---

## Resource Management

### Fuel
- Each sortie costs 4,000L per aircraft.
- Tank capacity: 100,000L. Starting stock: 80,000L.
- Fuel never replenishes automatically. The player must **request a resupply convoy**.

### Resupply Convoy
- Triggered manually in the Resources tab: "Request Resupply (8h)"
- Arrives 8 game-hours after request: +30,000L fuel, +4 Robot-1, +2 Bomb-2, +1 Robot-15
- Only one convoy at a time. Must wait for the current one to arrive before requesting another.
- **Trade-off**: convoys can be ambushed (future event), and diverting logistics costs time.

### Exchange Units (UE)
Exchange Units are spare subsystems (Radar, EjectionSeat, HydraulicPump, SignalProcessor).
They are applied in the Resources tab to **reduce a specific aircraft's maintenance ETA by 4h**.

- Must have at least 1 of the UE type in stock.
- Target aircraft must be in maintenance (status: red) with ETA > 1h.
- UE is consumed (count decrements by 1).
- **Trade-off**: using a UE now may leave you short when a worse fault strikes tomorrow.

### Weapons
Weapons deplete each time an aircraft returns from an armed sortie (random fraction consumed).
Resupply convoy replenishes Robot-1, Bomb-2, Robot-15.

---

## Event System

Events fire from several sources:

| Source | Trigger | Example |
|--------|---------|---------|
| Autoplay (Events ON) | 4% chance per game-hour | BIT fault, new mission, QRA scramble |
| Campaign arc | Day rollover | Phase escalation on day 3, day 5 |
| Mission outcome | Sortie completes | Success/failure roll logged |
| Post-mission roll | Aircraft returns | Fault trigger (~33% base chance) |

**Note**: "Random Event" manual button and demo scenario scripts are removed from the
production build — events happen organically through autoplay. This preserves game tension
and prevents players from gaming the system.

---

## Roguelike Loop

Each **Reset** starts a new campaign run (Day 1, Fred phase, fresh fleet).
The run ends in **victory** (Day 3 survived) or **defeat** (fail state).

The debrief screen shows what happened and why — helping the player learn from each run.
The AI can be asked "what went wrong?" and will analyse the score log.

---

## Autoplay Speeds

The game has two time-advance modes, toggled with the Play/Pause button:

| Mode | Rate | Notes |
|------|------|-------|
| Normal | 4 seconds per game-hour | Standard ops tempo |
| Fast | 1 second per game-hour | Rapid time advance |

Autoplay pauses automatically on critical events (new fault, aircraft below 20h life, missed departure, day rollover, write-off, mission resolved with unassigned upcoming missions).

---

## Aircraft Pre-Assignment (Returning Aircraft)

An aircraft currently **on mission** (returning) can be pre-assigned to a future mission,
provided its estimated return time is before the future mission's departure:

```
current_hour + return_eta < mission.departure_hour
```

Such aircraft appear in the assignment panel highlighted in cyan with an **RTB+Xh** label.
The AI assistant is aware of this rule and will factor return times into its recommendations.

---

## AI Assistant Behaviour Notes

- Missions are always discussed in **chronological departure order** (earliest first).
- When a mission requires multiple aircraft, the AI will never recommend the same aircraft
  for two slots — each slot requires a distinct aircraft ID.
- The AI considers aircraft life thresholds, config match, and returning status when
  building its recommendations.
- Responses are capped at **150 words / 400 tokens** and must lead with a direct
  recommendation (aircraft ID + mission ID), followed by bullet-point options with
  estimated success % and key risk, ending with one trade-off sentence.

---

## Aircraft Reconfiguration

Ready (green) aircraft can be sent for reconfiguration to a different loadout from the Fleet tab.

- Takes **3 hours** (occupies a service bay slot)
- Aircraft status becomes `red` during reconfiguration (fault shows "Reconfiguration: X → Y")
- When maintenance completes, `pending_config` is applied — aircraft returns green with new config
- Cost: the aircraft is unavailable for 3h. Trade-off: correct config = +10% success vs −15% penalty

Available configurations: `DCA/CAP`, `RECCE`, `AI/ST`, `AEW&C`

---

## Start Screen

On first load, a start screen is shown before the game begins:
- Campaign briefing (3-day structure, phases)
- "Begin Campaign" button launches the main interface
- Defeat threshold and starting score displayed for reference

---

## Aircraft Mission Lifecycle

Aircraft follow a deterministic lifecycle tied to mission departure and return hours:

```
Assignment        Departure hour     Return hour        Landing
     ↓                  ↓                 ↓                ↓
  green ──────────────► on_mission ──────► returning ──────► green
  (pre-assigned)     (auto-dispatch)   (auto-return)   (post-mission roll)
```

### Deferred Dispatch
When a player assigns a green aircraft to a **future** mission (departure_hour > current_hour),
the aircraft stays `green` until `advance_time()` reaches `departure_hour`. At that point it is
automatically set to `on_mission`. This allows the player to plan assignments ahead of time
without aircraft being locked out of use immediately.

### Auto-Return
When `advance_time()` reaches a mission's `return_hour`, all assigned `on_mission` aircraft
are automatically returned via `return_from_mission()`. Flight hours are calculated from
the mission's actual duration. This triggers the success/failure roll and post-mission check.

### Pre-Assignment of Returning Aircraft
A `returning` aircraft (coming back from a previous mission) can be pre-assigned to a
**future** mission, provided:
```
current_hour + aircraft.return_eta < mission.departure_hour
```
The aircraft stays `returning` until it lands (return_eta → 0 → green). Once green, it
waits on the flight line until auto-dispatched at the future mission's departure_hour.

The backend enforces the ETA constraint; the frontend shows returning aircraft in cyan
with an `RTB+Xh` label in the assignment panel.

---

## Mission Outcomes

Every mission resolves to one of three outcomes when its aircraft return:

| Outcome | Trigger | Score |
|---------|---------|-------|
| `success` | Random roll passes success probability | +10 (sortie) +20 (success) |
| `failure` | Random roll fails success probability | +10 (sortie) −10 (failure) |
| `aborted` | Player orders RTB mid-mission | −20 (decision) |

Outcomes are displayed in the Gantt (✓/✗/↩ symbols with green/red/grey bars) and on
mission cards. Completed missions are filtered out of the assignment dropdown.

---

## Mission Success Probability

Each aircraft-mission pair has a calculated success probability:

```
base_success = { DCA: 75%, RECCE: 85%, AI/ST: 70%, QRA: 90%, AEW: 80% }
config_match  = +10% if aircraft.configuration == mission.required_config
config_miss   = −15% if configuration does not match
life > 100h   = +5%
life 50–100h  = 0%
life 20–50h   = −15%
life < 20h    = −30% (grounded threshold)
phase Kris    = −5%
phase Krig    = −15%
final         = clamp(result, 5%, 95%)
```

This formula is mirrored exactly in the frontend (`MissionsPanel.jsx: computeSuccessProb`)
and the backend (`engine.py: _compute_success_prob`). Keep them in sync.

The UI displays:
- **Assignment form**: each aircraft button shows its success % for the selected mission in green/amber/red
- **Mission cards**: shows average success % across assigned aircraft while mission is pending
- **Gantt bar**: turns green/red/grey after mission resolves

---

## Autoplay Pause Triggers

Autoplay (`▶ Play`) pauses automatically when any of the following occur:

| Trigger | Why |
|---------|-----|
| Mission resolves with unassigned upcoming missions | Freed aircraft may be needed for next sortie |
| New aircraft fault | Player may need to adjust assignments |
| Aircraft life drops to ≤ 20h | Grounding decision required |
| Missed departure | Alert player to scoring penalty |
| Day rollover | New ATO generated, player must plan |
| Aircraft written off | Major strategic event |

**Note**: Autoplay does NOT pause on mission resolution if all upcoming missions are already
fully assigned — no action is needed.

Toast message identifies the specific cause (e.g. "⏸ Paused — Mission M02 success — review & reassign").

---

## Resource Management UI

Resources were removed from a dedicated tab and integrated into the main UI:

| Resource | Location | Interaction |
|----------|----------|-------------|
| Fuel level | Header bar (⛽ X%) | Tooltip shows absolute L + sorties remaining |
| Resupply convoy | Header bar | Button → request 8h convoy; shows countdown when en route |
| Weapons | Header bar (Wpn: Xrds) | Hover tooltip shows per-weapon counts |
| Exchange Units | Fleet tab → maintenance cards | Buttons appear on red aircraft with ETA > 1h |

**Design rationale**: Fuel and resupply are always-visible strategic info — header placement
ensures the player never loses track of runway. UE application is contextual to the broken
aircraft, so it belongs in the Fleet card. The Resources tab was removed to reduce cognitive
load during a timed demo.

---

## Key Numbers

| Constant | Value |
|----------|-------|
| Campaign length | 3 days |
| Starting score | 1000 |
| Defeat threshold | < 700 |
| Written-off defeat | ≥ 3 aircraft |
| Fleet collapse threshold | < 3 operational |
| Random event chance | 4% per autoplay game-hour |
| Post-mission fault chance | ~33% |
| Fuel per sortie | 4,000 L |
| Aircraft life thresholds | 20h grounded / 50h caution / 100h preferred |
| Resupply convoy delay | 8 game-hours |
| Resupply fuel delivery | +30,000 L |
| Resupply weapons delivery | +4 Robot-1, +2 Bomb-2, +1 Robot-15 |
| UE maintenance reduction | -4h per unit applied (min 1h remaining) |
| QRA scramble score (manned) | +25 |
| QRA scramble score (unmanned) | -60 (decision) |
| Reconfiguration time | 3h per aircraft |
