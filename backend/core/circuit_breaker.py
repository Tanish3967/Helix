"""
Resilient Circuit Breaker & Graceful Fallback Engine.
Protects the platform from cascading failures when calling external LLM APIs (Gemini/OpenAI),
external routing engines (OSRM/Mapbox), or 3rd-party weather providers.
"""

import time
import logging
from enum import Enum
from typing import Callable, Any, Optional
from backend.config import settings

logger = logging.getLogger("CircuitBreaker")

class CircuitState(str, Enum):
    CLOSED = "CLOSED"         # Normal operation: all requests allowed
    OPEN = "OPEN"             # Tripped: requests blocked, immediate fallback
    HALF_OPEN = "HALF_OPEN"   # Testing: probe request to check if downstream recovered

class CircuitBreakerOpenException(Exception):
    """Raised when an execution is attempted while the circuit breaker is in OPEN state."""
    pass

class CircuitBreaker:
    def __init__(
        self,
        name: str,
        fail_max: int = None,
        reset_timeout: int = None,
        fallback_func: Optional[Callable] = None
    ):
        self.name = name
        self.fail_max = fail_max or settings.CIRCUIT_BREAKER_FAIL_MAX
        self.reset_timeout = reset_timeout or settings.CIRCUIT_BREAKER_RESET_TIMEOUT_SEC
        self.fallback_func = fallback_func

        self.state = CircuitState.CLOSED
        self.failure_count = 0
        self.last_state_change = time.time()
        self.total_calls = 0
        self.total_fallbacks = 0

    def get_status(self) -> dict:
        """Returns the real-time operational metrics for this circuit breaker."""
        now = time.time()
        time_in_state = now - self.last_state_change
        return {
            "name": self.name,
            "state": self.state.value,
            "failure_count": self.failure_count,
            "fail_max": self.fail_max,
            "time_in_state_sec": round(time_in_state, 1),
            "reset_timeout_sec": self.reset_timeout,
            "total_calls": self.total_calls,
            "total_fallbacks": self.total_fallbacks
        }

    def _trip_open(self):
        self.state = CircuitState.OPEN
        self.last_state_change = time.time()
        logger.warning(f"🚨 CircuitBreaker [{self.name}] TRIPPED to OPEN after {self.failure_count} consecutive failures!")

    def _reset_closed(self):
        self.state = CircuitState.CLOSED
        self.failure_count = 0
        self.last_state_change = time.time()
        logger.info(f"✅ CircuitBreaker [{self.name}] Downstream recovered -> Reset to CLOSED.")

    def execute(self, func: Callable, *args, **kwargs) -> Any:
        """Executes the protected function or immediately executes fallback if OPEN."""
        self.total_calls += 1
        now = time.time()

        # Check if OPEN timeout has elapsed to attempt recovery (HALF_OPEN)
        if self.state == CircuitState.OPEN:
            if now - self.last_state_change >= self.reset_timeout:
                self.state = CircuitState.HALF_OPEN
                self.last_state_change = now
                logger.info(f"🔄 CircuitBreaker [{self.name}] Transitioned to HALF_OPEN to probe downstream health.")
            else:
                self.total_fallbacks += 1
                if self.fallback_func:
                    return self.fallback_func(*args, **kwargs)
                raise CircuitBreakerOpenException(f"Circuit [{self.name}] is OPEN (Service unavailable)")

        try:
            result = func(*args, **kwargs)
            # If request succeeded while in HALF_OPEN, reset to CLOSED
            if self.state == CircuitState.HALF_OPEN:
                self._reset_closed()
            elif self.failure_count > 0:
                self.failure_count = 0
            return result
        except Exception as e:
            self.failure_count += 1
            logger.error(f"⚠️ CircuitBreaker [{self.name}] Error ({self.failure_count}/{self.fail_max}): {e}")

            if self.state == CircuitState.HALF_OPEN or self.failure_count >= self.fail_max:
                self._trip_open()

            self.total_fallbacks += 1
            if self.fallback_func:
                return self.fallback_func(*args, **kwargs)
            raise e

    async def execute_async(self, async_func: Callable, *args, **kwargs) -> Any:
        """Executes an async protected function or immediately executes fallback if OPEN."""
        self.total_calls += 1
        now = time.time()

        if self.state == CircuitState.OPEN:
            if now - self.last_state_change >= self.reset_timeout:
                self.state = CircuitState.HALF_OPEN
                self.last_state_change = now
                logger.info(f"🔄 CircuitBreaker [{self.name}] Transitioned to HALF_OPEN to probe downstream health.")
            else:
                self.total_fallbacks += 1
                if self.fallback_func:
                    if callable(self.fallback_func):
                        import inspect
                        if inspect.iscoroutinefunction(self.fallback_func):
                            return await self.fallback_func(*args, **kwargs)
                        return self.fallback_func(*args, **kwargs)
                raise CircuitBreakerOpenException(f"Circuit [{self.name}] is OPEN (Service unavailable)")

        try:
            result = await async_func(*args, **kwargs)
            if self.state == CircuitState.HALF_OPEN:
                self._reset_closed()
            elif self.failure_count > 0:
                self.failure_count = 0
            return result
        except Exception as e:
            self.failure_count += 1
            logger.error(f"⚠️ CircuitBreaker [{self.name}] Async Error ({self.failure_count}/{self.fail_max}): {e}")

            if self.state == CircuitState.HALF_OPEN or self.failure_count >= self.fail_max:
                self._trip_open()

            self.total_fallbacks += 1
            if self.fallback_func:
                import inspect
                if inspect.iscoroutinefunction(self.fallback_func):
                    return await self.fallback_func(*args, **kwargs)
                return self.fallback_func(*args, **kwargs)
            raise e

# Pre-instantiated shared circuit breakers
ai_swarm_circuit = CircuitBreaker("AI_Swarm_Orchestrator")
osrm_routing_circuit = CircuitBreaker("OSRM_Routing_Engine")
weather_radar_circuit = CircuitBreaker("Doppler_Weather_Radar")
