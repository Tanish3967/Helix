from typing import List, Dict, Any
from pydantic import BaseModel, Field

class PolicyRule(BaseModel):
    id: str
    name: str
    description: str
    category: str # "DISPATCH", "ROUTING", "SAFETY", "CUSTOMER"
    enabled: bool = True

DEFAULT_POLICIES = [
    PolicyRule(
        id="POL-01",
        name="Auto-Reroute on Severe Congestion",
        description="Automatically calculates and applies detour when traffic multiplier exceeds 1.8x.",
        category="ROUTING",
        enabled=True
    ),
    PolicyRule(
        id="POL-02",
        name="Auto-Dispatch Backup Unit on Breakdown",
        description="Instantly identifies and reassigns stranded parcels to the nearest available unit.",
        category="DISPATCH",
        enabled=True
    ),
    PolicyRule(
        id="POL-03",
        name="Automated Customer Delay Notification",
        description="Fires webhook to customer portal when revised ETA extends beyond 15 minutes.",
        category="CUSTOMER",
        enabled=True
    ),
    PolicyRule(
        id="POL-04",
        name="Predictive Maintenance Depot Routing",
        description="Schedules immediate depot return when critical Diagnostic Trouble Codes are detected.",
        category="SAFETY",
        enabled=True
    )
]

class EnterprisePolicyEngine:
    """Manages enterprise autonomous self-healing operational policies."""
    def __init__(self, policies: List[PolicyRule] = None):
        self.policies: Dict[str, PolicyRule] = {p.id: p for p in (policies or DEFAULT_POLICIES)}

    def is_policy_enabled(self, policy_id: str) -> bool:
        policy = self.policies.get(policy_id)
        return policy.enabled if policy else False

    def toggle_policy(self, policy_id: str, enabled: bool) -> bool:
        if policy_id in self.policies:
            self.policies[policy_id].enabled = enabled
            return True
        return False

    def get_all_policies(self) -> List[Dict[str, Any]]:
        return [p.model_dump() for p in self.policies.values()]

policy_engine = EnterprisePolicyEngine()
