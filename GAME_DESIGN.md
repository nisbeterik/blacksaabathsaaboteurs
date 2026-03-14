# SAAB Base Commander — Game Design

## Vision

A single-player roguelike-strategy simulator of a Swedish Air Force dispersed road base
(vägbas). The player acts as Base Battalion Commander (BC), making decisions about aircraft
allocation, maintenance prioritisation, and resource management across a 7-day crisis
escalation campaign.

The AI assistant (LLM) is a key tool: it analyses situations, identifies options, and
argues trade-offs. There is rarely a "right" answer — only choices with different risks
and consequences. The AI helps the player reason, not replace their judgement.

---

## Campaign Arc (7 Days)

The campaign escalates automatically. The player cannot prevent escalation — they can only
manage its consequences.

| Days | Phase | Flavour |
|------|-------|---------|
| 1–2  | Fred  | Peacetime — limited missions, learning the systems, low pressure |
| 3–4  | Kris  | Crisis — elevated readiness, restricted logistics, more ATO missions |
| 5–7  | Krig  | War — full combat ops, hard mission quotas, constant attrition |

Phase escalation fires as a narrative event when the day rolls over:
- Day 3 start: "Intelligence confirms threat escalation. Phase: Fred → Kris."
- Day 5 start: "Hostilities confirmed. Phase: Kris → Krig."

---

## Game End

### Win: Survive all 7 days
Campaign ends when Day 8 begins. Final score determines the commander grade.

### Defeat: Fail state triggered mid-campaign
Any of the following ends the campaign immediately:

| Fail State | Threshold | Attribution |
|------------|-----------|-------------|
| Fleet collapse | Fewer than 3 operational aircraft (green + airborne + returning) | Mixed |
| Score collapse | Campaign score drops below 400 | Decision |
| Strategic defeat | 4 or more aircraft written off | Mixed |

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
| Sortie completed (aircraft returns) | +10 | — | Always |
| Sortie success (outcome roll) | +20 | luck | Narrative outcome in log |
| Sortie failure (outcome roll) | -10 | luck | Outcome in log |
| Missed departure (mission left unassigned) | -30 | **decision** | How many green aircraft were available |
| Wrong config assigned when correct was available | -15 | **decision** | Which correct-config aircraft was idle |
| Aircraft life ≤ 20h sent on mission | -20 | **decision** | Player chose to fly a grounded-threshold aircraft |
| Aircraft written off | -50 | mixed | Aircraft ID |
| Day ends with ≥ 6 operational aircraft | +15 | — | Daily bonus |
| BIT/post-mission fault (random) | -5 | **luck** | Not the player's fault |
| Random event fault | -5 | **luck** | Not the player's fault |
| QRA scramble — manned | +25 | luck | Intercept success |
| QRA scramble — unmanned | -40 | **decision** | Player chose not to man QRA |

### Commander Grades

| Score | Grade |
|-------|-------|
| 900–1000+ | **Gold — Outstanding** |
| 750–899   | **Silver — Commended** |
| 600–749   | **Bronze — Satisfactory** |
| 400–599   | **Marginal — Needs Improvement** |
| < 400     | **Busted — Campaign Failed** (immediate defeat) |

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
| Unassigned / undermanned | Scramble missed — "Airspace undefended" | -40 (decision) |

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
The run ends in **victory** (Day 7 survived) or **defeat** (fail state).

The debrief screen shows what happened and why — helping the player learn from each run.
The AI can be asked "what went wrong?" and will analyse the score log.

---

## Key Numbers

| Constant | Value |
|----------|-------|
| Campaign length | 7 days |
| Starting score | 1000 |
| Defeat threshold | < 400 |
| Written-off defeat | ≥ 4 aircraft |
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
| QRA scramble score (unmanned) | -40 (decision) |
