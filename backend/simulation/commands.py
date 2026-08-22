"""Ask-Aegis command interpreter.

Parses free-text / slash commands typed into the operator command bar and
dispatches them against the live simulation control surface (the same operations
the REST API exposes). Every command resolves to a uniform result dict:

    {"success": bool, "message": str, "action"?: str, "data"?: dict}

``action`` is an optional hint the frontend acts on client-side — focusing a
vehicle on the map, opening a panel, or applying a sim-config echo — so the bar
can drive the whole console, not just the backend. Parsing is intentionally
forgiving: it accepts natural phrasings ("set speed to 2", "slow down"),
slash-prefixed forms ("/pause"), and shorthands ("2x"), and falls back to a
helpful message rather than an error whenever the intent is unclear.
"""
from __future__ import annotations

import re
from typing import Any, Dict, List, Optional

ALLOWED_SPEEDS = [0.5, 1.0, 2.0, 4.0, 8.0]

# Tokens that flip a disruption into manual "hold for approval" mode
# (auto_resolve=False), mirroring the console's hold toggle.
HOLD_FLAGS = {"hold", "--hold", "manual", "--manual", "review"}

# Panel aliases the bar can open client-side via an ``open_panel`` action.
PANEL_ALIASES: Dict[str, str] = {
    "console": "console", "operations": "console", "ops": "console",
    "disrupt": "console", "disruptions": "console", "disruption": "console",
    "analytics": "analytics", "metrics": "analytics", "stats": "analytics",
    "performance": "analytics",
    "incidents": "incidents", "incident": "incidents", "alerts": "incidents",
    "notifications": "incidents",
    "deliveries": "deliveries", "orders": "deliveries", "reports": "deliveries",
    "delivery": "deliveries",
    "scenarios": "scenarios", "missions": "scenarios", "scenario": "scenarios",
    "agents": "trace", "trace": "trace", "swarm": "trace", "pipeline": "trace",
    "settings": "settings", "preferences": "settings",
    "fleet": "fleet",
}

# Zone aliases → canonical traffic-zone keys (see world_data.ZONES).
ZONE_ALIASES: Dict[str, str] = {
    "downtown": "downtown", "financial": "financial", "mission": "mission",
    "soma": "soma", "sunset": "sunset", "port": "port",
    "bay_bridge": "bay_bridge", "bridge": "bay_bridge", "bay": "bay_bridge",
    "highway_101": "highway_101", "highway": "highway_101", "101": "highway_101",
    "freeway": "highway_101",
}

_VEHICLE_RE = re.compile(r"^#?[vV]\d+$")
_BARE_NUM_RE = re.compile(r"^\d{2,4}$")
_ORDER_RE = re.compile(r"^#?(?:ord[-_]?)?\d{3,}$", re.IGNORECASE)
_FLOAT_RE = re.compile(r"^\d+(?:\.\d+)?$")


class CommandInterpreter:
    """Interprets and executes operator commands against the simulation."""

    def __init__(self, engine, disruption_mgr, scenario_mgr):
        self.engine = engine
        self.disruption_mgr = disruption_mgr
        self.scenario_mgr = scenario_mgr

    # ------------------------------------------------------------------ entry
    async def interpret(self, raw: str) -> Dict[str, Any]:
        text = (raw or "").strip().lstrip("/").strip()
        if not text:
            return self._err("Type a command. `help` lists everything I can do.")

        low = text.lower()
        tokens = text.split()
        verb = tokens[0].lower()
        rest = tokens[1:]

        # Shorthand: "2x", "0.5x"
        m = re.fullmatch(r"(\d+(?:\.\d+)?)x", low)
        if m:
            return await self._apply_speed(float(m.group(1)))

        # Natural "slow down" / "speed up" nudges.
        if low in ("slow down", "slower"):
            return await self._nudge_speed(-1)
        if low in ("speed up", "faster"):
            return await self._nudge_speed(+1)

        auto_resolve, clean = self._strip_hold(rest)

        if verb in ("help", "?", "commands", "h"):
            return self._help()
        if verb in ("status", "sitrep", "report", "state", "stat", "summary"):
            return self._status()
        if verb in ("pause", "hold", "freeze", "halt", "stop"):
            return await self._set_pause(True)
        if verb in ("resume", "play", "start", "continue", "unpause", "run"):
            return await self._set_pause(False)
        if verb in ("reset", "restart", "wipe"):
            return await self._reset()
        if verb in ("speed", "rate", "tempo", "set"):
            return await self._speed_from_tokens(rest)
        if verb in ("breakdown", "break", "fault", "disable", "stall"):
            return await self._breakdown(clean, auto_resolve)
        if verb in ("traffic", "congestion", "jam", "gridlock"):
            return await self._traffic(clean, auto_resolve, verb)
        if verb in ("weather", "storm", "rain", "fog", "snow"):
            return await self._weather(clean, auto_resolve, verb)
        if verb in ("delay", "late"):
            return await self._delay(clean, auto_resolve)
        if verb in ("repair", "fix", "restore"):
            return await self._repair(clean)
        if verb in ("scenario", "level", "mission"):
            return await self._scenario(clean)
        if verb in ("resolve", "approve", "dispatch", "execute", "engage"):
            return await self._resolve()
        if verb in ("focus", "find", "select", "track", "locate"):
            return self._focus(clean)
        if verb in ("open", "show", "view", "panel", "goto", "go"):
            return self._open(clean)

        return self._err(
            f"Unknown command `{verb}`. Try `help` for the full list."
        )

    # -------------------------------------------------------------- sim control
    async def _set_pause(self, paused: bool) -> Dict[str, Any]:
        already = self.engine.is_paused == paused
        self.engine.is_paused = paused
        await self.engine.broadcast({
            "type": "SIMULATION_CONFIG",
            "speed_multiplier": self.engine.speed_multiplier,
            "is_paused": self.engine.is_paused,
        })
        if paused:
            msg = "Simulation already paused." if already else "Simulation paused."
        else:
            msg = "Simulation already running." if already else "Simulation resumed."
        return self._ok(msg, action="sim_config", data={"is_paused": paused})

    async def _speed_from_tokens(self, tokens: List[str]) -> Dict[str, Any]:
        for t in tokens:
            t = t.lower().rstrip("x")
            if _FLOAT_RE.fullmatch(t):
                return await self._apply_speed(float(t))
        return self._err(
            "Set a speed like `speed 2` (allowed: 0.5, 1, 2, 4, 8)."
        )

    async def _apply_speed(self, speed: float) -> Dict[str, Any]:
        if speed not in ALLOWED_SPEEDS:
            allowed = ", ".join(self._fmt(s) for s in ALLOWED_SPEEDS)
            return self._err(f"Speed must be one of {allowed}. Example: `speed 2`.")
        self.engine.speed_multiplier = speed
        await self.engine.broadcast({
            "type": "SIMULATION_CONFIG",
            "speed_multiplier": speed,
            "is_paused": self.engine.is_paused,
        })
        return self._ok(
            f"Speed set to {self._fmt(speed)}×.",
            action="sim_config",
            data={"speed_multiplier": speed},
        )

    async def _nudge_speed(self, direction: int) -> Dict[str, Any]:
        cur = self.engine.speed_multiplier
        idx = ALLOWED_SPEEDS.index(cur) if cur in ALLOWED_SPEEDS else 1
        idx = max(0, min(len(ALLOWED_SPEEDS) - 1, idx + direction))
        return await self._apply_speed(ALLOWED_SPEEDS[idx])

    async def _reset(self) -> Dict[str, Any]:
        self.engine.reset_simulation()
        await self.engine.broadcast({
            "type": "INITIAL_STATE",
            "state": self.engine.get_full_state(),
        })
        return self._ok(
            "Simulation world reset to its pristine state.", action="reset"
        )

    # --------------------------------------------------------------- disruptions
    async def _breakdown(self, tokens: List[str], auto_resolve: bool) -> Dict[str, Any]:
        vtok = self._find_vehicle_token(tokens)
        vehicle = self._resolve_vehicle(vtok)
        if vtok and not vehicle:
            return self._err(f"No vehicle `{vtok}` in the fleet.")
        vehicle_id = vehicle.id if vehicle else "V481"
        fault_words = [t for t in tokens if t != vtok]
        fault_type = " ".join(fault_words).strip() or "Engine Failure"
        inc = await self.disruption_mgr.trigger_breakdown(
            vehicle_id=vehicle_id, fault_type=fault_type, auto_resolve=auto_resolve
        )
        return self._incident_result(inc, auto_resolve, focus_vehicle=vehicle_id)

    async def _traffic(self, tokens: List[str], auto_resolve: bool, verb: str) -> Dict[str, Any]:
        zone_id = None
        for t in tokens:
            z = ZONE_ALIASES.get(t.lower())
            if z:
                zone_id = z
                break
        condition = self._traffic_condition(tokens, verb)
        inc = await self.disruption_mgr.trigger_traffic_spike(
            zone_id=zone_id or "highway_101", condition=condition, auto_resolve=auto_resolve
        )
        return self._incident_result(inc, auto_resolve)

    async def _weather(self, tokens: List[str], auto_resolve: bool, verb: str) -> Dict[str, Any]:
        condition = self._weather_condition(tokens, verb)
        inc = await self.disruption_mgr.trigger_weather_alert(
            condition=condition, auto_resolve=auto_resolve
        )
        return self._incident_result(inc, auto_resolve)

    async def _delay(self, tokens: List[str], auto_resolve: bool) -> Dict[str, Any]:
        otok = self._find_order_token(tokens)
        order_id = self._normalize_order(otok) if otok else "ORD-4811"
        minutes = None
        for t in tokens:
            if t == otok:
                continue
            if _FLOAT_RE.fullmatch(t):
                minutes = float(t)
                break
        minutes = minutes if minutes is not None else 20.0
        inc = await self.disruption_mgr.trigger_delivery_delay(
            order_id=order_id, delay_minutes=minutes, auto_resolve=auto_resolve
        )
        return self._incident_result(inc, auto_resolve)

    async def _repair(self, tokens: List[str]) -> Dict[str, Any]:
        vtok = self._find_vehicle_token(tokens)
        vehicle = self._resolve_vehicle(vtok)
        if not vehicle:
            return self._err(f"Can't find vehicle `{vtok or '?'}`. Try `repair V481`.")
        self.engine.repair_vehicle(vehicle.id)
        await self.engine.broadcast({
            "type": "FLEET_UPDATED",
            "vehicles": [v.model_dump() for v in self.engine.vehicles],
            "routes": [r.model_dump() for r in self.engine.routes if r.is_active],
        })
        return self._ok(
            f"{vehicle.id} repaired and returned to service.",
            action="focus_vehicle",
            data={"vehicle_id": vehicle.id},
        )

    async def _scenario(self, tokens: List[str]) -> Dict[str, Any]:
        level = None
        for t in tokens:
            if t.isdigit():
                level = int(t)
                break
        if level is None or level < 1 or level > 8:
            return self._err("Scenario level must be 1–8. Example: `scenario 3`.")
        inc = await self.scenario_mgr.execute_scenario(level)
        return self._ok(
            f"Scenario {level} launched — {inc.title}.",
            action="incident",
            data={"incident_id": inc.id, "level": level},
        )

    async def _resolve(self) -> Dict[str, Any]:
        inc = self.engine.active_incident
        if not inc:
            return self._err("No active incident to resolve.")
        if inc.resolution_status == "Resolved":
            return self._ok("The active incident is already resolved.")
        started = self.engine.launch_resolution(inc)
        if not started:
            return self._ok("Resolution is already in progress.")
        return self._ok(
            f"Multi-agent swarm dispatched for {inc.title}.",
            action="incident",
            data={"incident_id": inc.id},
        )

    # ----------------------------------------------------------------- navigation
    def _focus(self, tokens: List[str]) -> Dict[str, Any]:
        vtok = self._find_vehicle_token(tokens)
        vehicle = self._resolve_vehicle(vtok)
        if not vehicle:
            return self._err(f"Can't find vehicle `{vtok or '?'}`. Try `focus V481`.")
        status = vehicle.status.value.replace("_", " ").title()
        return self._ok(
            f"Tracking {vehicle.id} — {vehicle.model} · {status}.",
            action="focus_vehicle",
            data={"vehicle_id": vehicle.id},
        )

    def _open(self, tokens: List[str]) -> Dict[str, Any]:
        for t in tokens:
            panel = PANEL_ALIASES.get(t.lower())
            if panel:
                return self._ok(
                    f"Opening {panel}.", action="open_panel", data={"panel": panel}
                )
        # "show V481" / "go V481" — fall through to focusing a vehicle.
        if self._find_vehicle_token(tokens):
            return self._focus(tokens)
        return self._err(
            "Which panel? Try `open analytics`, `open incidents`, or `open deliveries`."
        )

    # --------------------------------------------------------------------- status
    def _status(self) -> Dict[str, Any]:
        vehicles = self.engine.vehicles
        at_risk = sum(1 for v in vehicles if v.status.value == "AT_RISK")
        maint = sum(1 for v in vehicles if v.status.value == "MAINTENANCE")
        on_route = sum(1 for v in vehicles if v.status.value == "ON_ROUTE")
        run_state = "PAUSED" if self.engine.is_paused else "RUNNING"
        speed = self._fmt(self.engine.speed_multiplier)
        clock = self.engine.sim_time.strftime("%H:%M:%S")

        inc = self.engine.active_incident
        if inc:
            incident_line = f"{inc.severity.value} · {inc.title} ({inc.resolution_status})"
        else:
            incident_line = "none — all systems nominal"

        m = self.engine.metrics
        lines = [
            f"FLEET     {len(vehicles)} units · {on_route} on route · {at_risk} at risk · {maint} maintenance",
            f"SIM       {run_state} · {speed}× · {clock}",
            f"INCIDENT  {incident_line}",
            f"ORDERS    {m.completed_orders_today}/{m.total_orders_today} delivered · {m.on_time_rate_percent:.0f}% on time",
            f"SCORE     {m.score} · efficiency {m.efficiency_percent:.0f}% · {m.resolved_incidents_count} resolved",
        ]
        return self._ok("\n".join(lines))

    def _help(self) -> Dict[str, Any]:
        lines = [
            "AEGIS command reference",
            "",
            "CONTROL   pause · resume · speed <0.5|1|2|4|8> · reset · status",
            "DISRUPT   breakdown <V###> · traffic <zone> · weather <storm|rain> · delay <ORD-####> <min>",
            "          scenario <1-8> · repair <V###>   (add `hold` to await plan approval)",
            "RESOLVE   resolve / approve   (dispatch the multi-agent swarm)",
            "NAVIGATE  focus <V###> · open <analytics|incidents|deliveries|scenarios|agents>",
            "",
            "Examples: `breakdown V481 brake failure`  ·  `traffic highway_101 accident hold`  ·  `2x`",
        ]
        return self._ok("\n".join(lines))

    # ---------------------------------------------------------------- resolvers
    @staticmethod
    def _strip_hold(tokens: List[str]):
        """Split off any hold/manual flag. Returns (auto_resolve, cleaned_tokens)."""
        cleaned = [t for t in tokens if t.lower() not in HOLD_FLAGS]
        auto_resolve = len(cleaned) == len(tokens)
        return auto_resolve, cleaned

    def _resolve_vehicle(self, token: Optional[str]):
        if not token:
            return None
        target = token.upper().lstrip("#")
        for v in self.engine.vehicles:
            if v.id.upper() == target:
                return v
        if target.isdigit():  # tolerate a bare number → V###
            for v in self.engine.vehicles:
                if v.id.upper() == f"V{target}":
                    return v
        return None

    @staticmethod
    def _find_vehicle_token(tokens: List[str]) -> Optional[str]:
        for t in tokens:
            if _VEHICLE_RE.fullmatch(t) or _BARE_NUM_RE.fullmatch(t):
                return t
        return None

    @staticmethod
    def _find_order_token(tokens: List[str]) -> Optional[str]:
        for t in tokens:
            if t.lower().startswith("ord") or "ord-" in t.lower():
                if _ORDER_RE.fullmatch(t):
                    return t
        return None

    @staticmethod
    def _normalize_order(token: str) -> str:
        digits = re.sub(r"\D", "", token)
        return f"ORD-{digits}" if digits else token.upper()

    @staticmethod
    def _traffic_condition(tokens: List[str], verb: str) -> str:
        low = [t.lower() for t in tokens]
        if verb == "gridlock" or "gridlock" in low or "accident" in low or "crash" in low:
            return "Accident"
        if verb in ("jam", "congestion") or "congested" in low or "congestion" in low or "heavy" in low:
            return "Congested"
        return "Accident"

    @staticmethod
    def _weather_condition(tokens: List[str], verb: str) -> str:
        low = " ".join(t.lower() for t in tokens)
        if verb == "storm" or "storm" in low or "thunder" in low:
            return "Storm"
        if "heavy" in low:
            return "Heavy Rain"
        if verb == "rain" or "rain" in low or "drizzle" in low:
            return "Rain"
        if verb == "fog" or "fog" in low:
            return "Storm"  # engine models reduced-visibility events as storm-tier
        if verb == "snow" or "snow" in low:
            return "Storm"
        return "Storm"

    # ------------------------------------------------------------------ helpers
    @staticmethod
    def _fmt(value: float) -> str:
        return str(int(value)) if float(value).is_integer() else str(value)

    def _incident_result(self, inc, auto_resolve: bool, focus_vehicle: Optional[str] = None) -> Dict[str, Any]:
        mode = (
            "Multi-agent resolution dispatched."
            if auto_resolve
            else "Incident created — awaiting plan approval in the AI Recommendation panel."
        )
        data: Dict[str, Any] = {"incident_id": inc.id}
        action = "incident"
        if focus_vehicle:
            action = "focus_vehicle"
            data["vehicle_id"] = focus_vehicle
        return self._ok(f"{inc.title} injected. {mode}", action=action, data=data)

    @staticmethod
    def _ok(message: str, action: Optional[str] = None, data: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        out: Dict[str, Any] = {"success": True, "message": message}
        if action:
            out["action"] = action
        if data:
            out["data"] = data
        return out

    @staticmethod
    def _err(message: str) -> Dict[str, Any]:
        return {"success": False, "message": message}
