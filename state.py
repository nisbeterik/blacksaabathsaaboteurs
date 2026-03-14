from __future__ import annotations
from dataclasses import dataclass, field


@dataclass
class ScoreEvent:
    day: int
    hour: int
    delta: int          # positive = good, negative = bad
    reason: str         # short label shown in UI
    detail: str         # full explanation for debrief / LLM
    category: str       # 'decision' | 'luck' | 'mixed'


@dataclass
class Aircraft:
    id: str                        # e.g. "GE01", "GF02"
    type: str                      # "GripenE", "GripenF", "GlobalEye"
    status: str                    # "green", "red", "grey", "on_mission"
    remaining_life: int            # flight hours until heavy service (0-200)
    total_flight_hours: int        # total accumulated flight hours
    configuration: str             # "DCA/CAP", "RECCE", "AI/ST", "AEW&C"
    current_payload: list[str] = field(default_factory=list)
    location: str = "flight_line"  # "flight_line", "service_bay", "maint_workshop", "on_mission"
    maintenance_eta: int | None = None  # hours until maintenance complete
    fault: str | None = None            # current fault description if any
    return_eta: int | None = None       # hours until aircraft returns to base (when status="returning")
    pending_config: str | None = None   # target configuration applied when reconfiguration completes
    # status can be: "green", "red", "grey", "on_mission", "returning", "written_off"


@dataclass
class ResourceInventory:
    fuel: int                      # liters available
    weapons: dict[str, int] = field(default_factory=dict)
    exchange_units: dict[str, int] = field(default_factory=dict)
    spare_parts: int = 0
    personnel: dict[str, int] = field(default_factory=dict)
    tools: dict[str, int] = field(default_factory=dict)


@dataclass
class Mission:
    id: str
    type: str                      # "DCA", "RECCE", "AI/ST", "QRA", "AEW"
    required_aircraft: int
    required_config: str
    departure_hour: int            # hour in 24h cycle
    return_hour: int
    assigned_aircraft: list[str] = field(default_factory=list)
    description: str = ""
    outcome: str | None = None     # "success" | "failure" | None (pending)


@dataclass
class ATO:
    day: int
    phase: str                     # "Fred", "Kris", "Krig"
    missions: list[Mission] = field(default_factory=list)


@dataclass
class MaintenanceSlot:
    id: str
    type: str                      # "service_bay", "minor_workshop", "major_workshop"
    capacity: int
    current_occupants: list[str] = field(default_factory=list)


@dataclass
class BaseState:
    current_hour: int              # 0-23
    current_day: int
    aircraft: list[Aircraft]
    resources: ResourceInventory
    ato: ATO
    maintenance_slots: list[MaintenanceSlot]
    event_log: list[str] = field(default_factory=list)

    # Campaign / scoring
    campaign_score: int = 1000
    score_log: list[ScoreEvent] = field(default_factory=list)
    campaign_over: bool = False
    campaign_result: str | None = None       # "victory" | "defeat"
    campaign_over_reason: str | None = None
    aircraft_written_off: list[str] = field(default_factory=list)
    missions_completed: int = 0
    missions_total: int = 0
    low_fleet_hours: int = 0                 # consecutive hours with < 3 operational aircraft
    resupply_eta: int | None = None          # hours until resupply convoy arrives; None if not requested
