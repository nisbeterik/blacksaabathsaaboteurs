"""
LLM Integration Layer — Dev 3
Handles:
  - State serialization (BaseState → structured prompt text)
  - System prompt construction
  - OpenRouter API calls (Gemini model)
  - Conversation history management
  - Error handling and context-length management
"""

import os
from typing import Optional

import requests

from state import BaseState, Aircraft, Mission

# ---------------------------------------------------------------------------
# Configuration
# ---------------------------------------------------------------------------

OPENROUTER_API_URL = "https://openrouter.ai/api/v1/chat/completions"

# Primary model — Gemini Flash is fast and has a huge context window
PRIMARY_MODEL = "google/gemini-2.0-flash-001"
# Fallback if primary quota is exceeded
FALLBACK_MODEL = "google/gemini-flash-1.5"

# Max tokens to request in LLM response
MAX_RESPONSE_TOKENS = 1024

# How many recent conversation turns to keep in context (each turn = user + assistant)
MAX_HISTORY_TURNS = 8


# ---------------------------------------------------------------------------
# State Serializer
# ---------------------------------------------------------------------------

STATUS_LABELS = {
    "green":      "READY",
    "red":        "IN MAINTENANCE",
    "grey":       "CANNIBALIZED",
    "on_mission": "ON MISSION",
}


def _fmt_aircraft(ac: Aircraft) -> str:
    status = STATUS_LABELS.get(ac.status, ac.status.upper())
    payload = ", ".join(ac.current_payload) if ac.current_payload else "none"
    line = (
        f"  {ac.id} [{ac.type}] — {status} | "
        f"Life: {ac.remaining_life}h | "
        f"Config: {ac.configuration} | "
        f"Payload: {payload} | "
        f"Location: {ac.location}"
    )
    if ac.fault:
        line += f"\n    ⚠ FAULT: {ac.fault}"
        if ac.maintenance_eta is not None:
            line += f" (ETA: {ac.maintenance_eta}h)"
    return line


def _fmt_mission(m: Mission) -> str:
    assigned = ", ".join(m.assigned_aircraft) if m.assigned_aircraft else "UNASSIGNED"
    needed = m.required_aircraft - len(m.assigned_aircraft)
    shortfall = f" ⚠ SHORTFALL: need {needed} more" if needed > 0 else ""
    return (
        f"  {m.id} [{m.type}] — {m.required_config} × {m.required_aircraft} | "
        f"Dep: {m.departure_hour:02d}:00 → Ret: {m.return_hour:02d}:00 | "
        f"Assigned: {assigned}{shortfall}"
    )


def serialize_state(state: BaseState) -> str:
    """Convert a BaseState object into structured text for the LLM context."""
    lines = []

    lines.append(f"=== BASE STATE — Day {state.current_day}, {state.current_hour:02d}:00 ===")
    lines.append(f"Phase: {state.ato.phase}")
    lines.append("")

    # Aircraft fleet
    lines.append("--- FLEET STATUS ---")
    ready = [a for a in state.aircraft if a.status == "green"]
    maint = [a for a in state.aircraft if a.status == "red"]
    grey  = [a for a in state.aircraft if a.status == "grey"]
    onmis = [a for a in state.aircraft if a.status == "on_mission"]

    lines.append(f"Ready: {len(ready)} | On mission: {len(onmis)} | Maintenance: {len(maint)} | Cannibalized: {len(grey)}")
    lines.append("")
    for ac in state.aircraft:
        lines.append(_fmt_aircraft(ac))
    lines.append("")

    # Wear summary (sorted worst → best)
    lines.append("--- WEAR LEVELS (hours to heavy service, ascending) ---")
    sorted_ac = sorted(state.aircraft, key=lambda a: a.remaining_life)
    for ac in sorted_ac:
        filled = min(20, ac.remaining_life // 10)
        bar = "█" * filled + "░" * (20 - filled)
        lines.append(f"  {ac.id}: {ac.remaining_life:3d}h [{bar}]")
    lines.append("")

    # Resources
    r = state.resources
    lines.append("--- RESOURCES ---")
    lines.append(f"  Fuel: {r.fuel:,} L")
    if r.weapons:
        weapons_str = " | ".join(f"{k}: {v}" for k, v in r.weapons.items())
        lines.append(f"  Weapons: {weapons_str}")
    if r.exchange_units:
        ue_str = " | ".join(f"{k}: {v}" for k, v in r.exchange_units.items())
        lines.append(f"  Exchange Units (UE): {ue_str}")
    lines.append(f"  Spare parts: {r.spare_parts}")
    if r.personnel:
        pers_str = " | ".join(f"{k}: {v}" for k, v in r.personnel.items())
        lines.append(f"  Personnel: {pers_str}")
    lines.append("")

    # ATO
    lines.append(f"--- ATO — Day {state.ato.day} ({state.ato.phase}) ---")
    for m in state.ato.missions:
        lines.append(_fmt_mission(m))
    lines.append("")

    # Maintenance slots
    lines.append("--- MAINTENANCE SLOTS ---")
    for slot in state.maintenance_slots:
        occupants = ", ".join(slot.current_occupants) if slot.current_occupants else "empty"
        free = slot.capacity - len(slot.current_occupants)
        lines.append(f"  {slot.id} [{slot.type}] cap={slot.capacity} — {occupants} (free slots: {free})")
    lines.append("")

    # Recent event log
    lines.append("--- RECENT EVENTS ---")
    for event in state.event_log[-20:]:
        lines.append(f"  {event}")

    return "\n".join(lines)


# ---------------------------------------------------------------------------
# System Prompt
# ---------------------------------------------------------------------------

SYSTEM_PROMPT_TEMPLATE = """\
You are an AI decision support assistant at a Swedish Air Force dispersed road base (vägbas). \
You help the Base Battalion Commander make operational decisions during a 7-day crisis campaign.

CONTEXT:
- Campaign: Day {current_day}/7 | Phase: {phase} | Score: {campaign_score}/1000 ({campaign_grade})
- Missions: {missions_completed} completed / {missions_total} flown | Aircraft written off: {written_off_count}
- Your role is ADVISORY — you recommend, the humans decide
- Prioritize ROBUSTNESS over optimality — plans that survive chaos beat fragile optimal plans
- Phase "Fred" = peacetime, "Kris" = crisis, "Krig" = war — risk tolerance rises with phase

LIFE THRESHOLDS (hard rules):
- remaining_life ≤ 20h: GROUNDED — must not fly. Aircraft will be WRITTEN OFF if flown and life hits 0.
- remaining_life ≤ 50h: CAUTION — prefer alternatives; flag risk if used
- remaining_life > 100h: PREFERRED — prioritize to keep wear distribution even

TRADE-OFF REASONING (critical):
When the player asks for a recommendation, always:
1. Enumerate 2-3 concrete options (with specific aircraft IDs)
2. For each option: state the rough success probability and the downside risk
3. Argue the trade-off — what you gain vs what you risk
4. Make a clear recommendation, but acknowledge the uncertainty
Example format: "Option A: assign GE03 — 78% success, burns 2h life, leaves fleet balanced. Option B: assign GE08 — 52% success, risks write-off if post-mission fault. Recommend A unless urgency is extreme."

SCORE IMPACT AWARENESS:
- Sending a mis-configured aircraft when a correct one is idle: -15 pts (your decision)
- Sending aircraft with ≤20h life: -20 pts (your decision)
- Missing a mission departure unassigned: -30 pts (your decision)
- Random faults: -5 pts (bad luck, not your fault)
- Written-off aircraft: -50 pts + potential campaign defeat

RECENT SCORE EVENTS:
{score_log_text}

CURRENT BASE STATE:
{state_text}
"""


def build_system_prompt(state: BaseState) -> str:
    from engine import _grade  # avoid circular at module level
    state_text = serialize_state(state)

    # Score log — last 8 events
    if state.score_log:
        score_lines = []
        for e in state.score_log[-8:]:
            sign = "+" if e.delta >= 0 else ""
            score_lines.append(f"  [{e.category.upper()}] {sign}{e.delta} — {e.reason}: {e.detail}")
        score_log_text = "\n".join(score_lines)
    else:
        score_log_text = "  No score events yet."

    return SYSTEM_PROMPT_TEMPLATE.format(
        current_day=state.current_day,
        phase=state.ato.phase,
        campaign_score=state.campaign_score,
        campaign_grade=_grade(state.campaign_score),
        missions_completed=state.missions_completed,
        missions_total=state.missions_total,
        written_off_count=len(state.aircraft_written_off),
        score_log_text=score_log_text,
        state_text=state_text,
    )


# ---------------------------------------------------------------------------
# OpenRouter API Client
# ---------------------------------------------------------------------------

class LLMError(Exception):
    """Raised when the LLM API call fails in an unrecoverable way."""
    pass


def _call_openrouter(
    messages: list[dict],
    api_key: str,
    model: str = PRIMARY_MODEL,
    timeout: int = 30,
) -> str:
    """Make a single API call to OpenRouter. Returns the assistant's text."""
    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json",
        "HTTP-Referer": "https://saab-hackathon.local",
        "X-Title": "Saab Air Base Commander",
    }
    payload = {
        "model": model,
        "messages": messages,
        "max_tokens": MAX_RESPONSE_TOKENS,
        "temperature": 0.3,   # low temp for consistent, reliable military advice
    }

    try:
        resp = requests.post(
            OPENROUTER_API_URL,
            headers=headers,
            json=payload,
            timeout=timeout,
        )
        resp.raise_for_status()
        data = resp.json()
        return data["choices"][0]["message"]["content"]

    except requests.exceptions.Timeout:
        raise LLMError("API request timed out. Check connectivity.")
    except requests.exceptions.HTTPError as e:
        status = e.response.status_code if e.response else "?"
        raise LLMError(f"API returned HTTP {status}: {e.response.text[:200] if e.response else str(e)}")
    except (KeyError, IndexError) as e:
        raise LLMError(f"Unexpected API response format: {e}")
    except requests.exceptions.RequestException as e:
        raise LLMError(f"Network error: {e}")


# ---------------------------------------------------------------------------
# Conversation Manager
# ---------------------------------------------------------------------------

class LLMAssistant:
    """
    Stateful chat assistant that wraps OpenRouter + conversation history.

    Usage:
        assistant = LLMAssistant(api_key="sk-...")
        reply = assistant.chat("Which aircraft should I send?", current_state)
    """

    def __init__(self, api_key: Optional[str] = None):
        self.api_key = api_key or os.environ.get("OPENROUTER_API_KEY", "")
        if not self.api_key:
            raise ValueError(
                "No OpenRouter API key provided. "
                "Set OPENROUTER_API_KEY env var or pass api_key= to LLMAssistant()."
            )
        # History is stored as list of (user_msg, assistant_msg) tuples
        self._history: list[tuple[str, str]] = []

    def clear_history(self):
        """Reset conversation history (e.g. after a major state change)."""
        self._history = []

    def _build_messages(self, system_prompt: str, user_message: str) -> list[dict]:
        """
        Construct the messages array for the API call.
        Trims history to MAX_HISTORY_TURNS to avoid context overflow.
        """
        messages = [{"role": "system", "content": system_prompt}]

        # Keep only recent turns
        recent = self._history[-MAX_HISTORY_TURNS:]
        for user_turn, assistant_turn in recent:
            messages.append({"role": "user",      "content": user_turn})
            messages.append({"role": "assistant", "content": assistant_turn})

        messages.append({"role": "user", "content": user_message})
        return messages

    def chat(
        self,
        user_message: str,
        state: BaseState,
        retry_on_failure: bool = True,
    ) -> str:
        """
        Send a user message and get a response.
        Updates internal conversation history.
        Returns the assistant's reply as a string.
        """
        if not user_message.strip():
            return ""

        system_prompt = build_system_prompt(state)
        messages = self._build_messages(system_prompt, user_message)

        # Try primary model, fall back if it fails
        last_error = None
        models_to_try = [PRIMARY_MODEL, FALLBACK_MODEL] if retry_on_failure else [PRIMARY_MODEL]

        for model in models_to_try:
            try:
                reply = _call_openrouter(messages, self.api_key, model=model)
                # Store turn in history
                self._history.append((user_message, reply))
                return reply
            except LLMError as e:
                last_error = e
                continue

        # Both models failed — do NOT add to history so the user can retry cleanly
        error_reply = (
            f"⚠ LLM unavailable: {last_error}\n\n"
            "Operating in offline mode. Please consult paper-based SOPs."
        )
        return error_reply

    @property
    def history(self) -> list[tuple[str, str]]:
        """Returns history as list of (user, assistant) tuples."""
        return list(self._history)

    def history_as_messages(self) -> list[dict]:
        """Returns history as OpenAI-style message dicts (for debugging)."""
        msgs = []
        for user, assistant in self._history:
            msgs.append({"role": "user",      "content": user})
            msgs.append({"role": "assistant", "content": assistant})
        return msgs
