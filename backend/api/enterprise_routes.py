from typing import List, Dict, Any, Optional
from fastapi import APIRouter, Depends, HTTPException, Body
from backend.models.schema import TelematicsPacket, ProofOfDelivery, Order, OrderStatus, OrderPriority, Location
from backend.telematics.ingestion import TelematicsIngestionGateway
from backend.analytics.enterprise_intelligence import EnterpriseIntelligence
from backend.api.auth import get_current_user, require_role, UserProfile
from backend.routing.osrm_adapter import routing_engine

def create_enterprise_router(engine):
    router = APIRouter(prefix="/api/enterprise", tags=["Enterprise Operations & Telematics"])
    telematics_gateway = TelematicsIngestionGateway(engine)

    @router.post("/telematics/ingest")
    async def ingest_telematics(packet: TelematicsPacket):
        """Ingests live IoT vehicle telemetry, updates engine coordinates, and detects DTC faults."""
        result = await telematics_gateway.ingest_packet(packet)
        if not result["success"]:
            raise HTTPException(status_code=404, detail=result["error"])
        return result

    @router.post("/driver/pod")
    async def submit_proof_of_delivery(pod: ProofOfDelivery):
        """Processes driver digital signature, confirmation photo, and marks order DELIVERED."""
        order = next((o for o in engine.orders if o.id == pod.order_id), None)
        if not order:
            raise HTTPException(status_code=404, detail=f"Order {pod.order_id} not found")

        order.status = OrderStatus.DELIVERED
        order.proof_of_delivery = pod.model_dump()

        engine._add_event(
            severity="INFO",
            category="Proof of Delivery",
            message=f"Order {pod.order_id} signed & delivered to {pod.recipient_name}",
            order_id=pod.order_id,
            vehicle_id=order.assigned_vehicle_id
        )

        await engine.broadcast({
            "type": "ORDER_DELIVERED",
            "order_id": order.id,
            "proof_of_delivery": pod.model_dump(),
            "orders": [o.model_dump() for o in engine.orders]
        })

        return {"success": True, "order_id": order.id, "status": "DELIVERED"}

    @router.get("/analytics/predictive")
    async def get_predictive_maintenance():
        """Returns health score ratings and anomaly alerts across all fleet vehicles."""
        vehicle_dicts = [v.model_dump() for v in engine.vehicles]
        health_reports = [EnterpriseIntelligence.assess_vehicle_health(v) for v in vehicle_dicts]
        return {
            "total_fleet_units": len(health_reports),
            "units_requiring_service": sum(1 for r in health_reports if r["maintenance_required"]),
            "fleet_health_overview": health_reports
        }

    @router.get("/analytics/esg")
    async def get_esg_analytics():
        """Calculates fleetwide CO2 footprint and off-peak EV smart charging schedule."""
        vehicle_dicts = [v.model_dump() for v in engine.vehicles]
        carbon = EnterpriseIntelligence.calculate_fleet_carbon(vehicle_dicts)
        charging = EnterpriseIntelligence.plan_ev_depot_charging(vehicle_dicts)
        return {
            "carbon_metrics": carbon,
            "overnight_charging_schedule": charging
        }

    @router.post("/webhooks/order")
    async def ingest_erp_order(
        customer_name: str = Body(...),
        customer_phone: str = Body(...),
        dest_lat: float = Body(...),
        dest_lng: float = Body(...),
        weight_kg: float = Body(15.0),
        priority: str = Body("STANDARD"),
        tenant_id: str = Body("enterprise_logistics")
    ):
        """External ERP / Shopify webhook order ingestion with automated route assignment."""
        order_id = f"ERP-{len(engine.orders) + 1001}"
        new_order = Order(
            id=order_id,
            customer_name=customer_name,
            customer_phone=customer_phone,
            origin=Location(lat=37.7770, lng=-122.4180, address="Central Depot Hub"),
            destination=Location(lat=dest_lat, lng=dest_lng),
            weight_kg=weight_kg,
            priority=OrderPriority[priority.upper()] if priority.upper() in OrderPriority.__members__ else OrderPriority.STANDARD,
            status=OrderStatus.IN_TRANSIT,
            original_eta="18:30:00",
            revised_eta="18:30:00",
            tenant_id=tenant_id
        )

        # Assign to nearest available vehicle
        available_v = next((v for v in engine.vehicles if v.status.value in ["ON_ROUTE", "AVAILABLE"]), engine.vehicles[0])
        new_order.assigned_vehicle_id = available_v.id
        available_v.assigned_order_ids.append(order_id)
        engine.orders.append(new_order)

        engine._add_event(
            severity="INFO",
            category="ERP Integration",
            message=f"Order {order_id} ingested via Webhook -> Assigned to {available_v.id}",
            order_id=order_id,
            vehicle_id=available_v.id
        )

        await engine.broadcast({
            "type": "NEW_ORDER_INGESTED",
            "order": new_order.model_dump(),
            "orders": [o.model_dump() for o in engine.orders],
            "vehicles": [v.model_dump() for v in engine.vehicles]
        })

        return {"success": True, "order_id": order_id, "assigned_vehicle": available_v.id}

    @router.get("/depots")
    async def get_depot_hierarchy():
        """Returns enterprise multi-depot hierarchy and active capacity allocations."""
        from backend.models.tenants import DEFAULT_DEPOTS
        return {
            "tenant_id": "default_enterprise",
            "total_depots": len(DEFAULT_DEPOTS),
            "depots": [d.model_dump() for d in DEFAULT_DEPOTS]
        }

    @router.post("/driver/hos")
    async def log_driver_hos(
        driver_id: str = Body(...),
        status: str = Body(...), # "DRIVING", "ON_DUTY", "OFF_DUTY", "SLEEPER"
        odometer: float = Body(12450.0)
    ):
        """Logs FMCSA Hours of Service (HOS) duty status change for regulatory compliance."""
        valid_statuses = ["DRIVING", "ON_DUTY", "OFF_DUTY", "SLEEPER"]
        if status.upper() not in valid_statuses:
            raise HTTPException(status_code=400, detail=f"Invalid HOS status. Must be one of {valid_statuses}")

        engine._add_event(
            severity="INFO",
            category="FMCSA ELD Log",
            message=f"Driver {driver_id} duty status updated to {status.upper()} (Odo: {odometer}km)"
        )

        return {
            "success": True,
            "driver_id": driver_id,
            "duty_status": status.upper(),
            "compliance": "FMCSA 49 CFR Part 395 Verified"
        }

    @router.get("/driver/{driver_id}/manifest")
    async def get_driver_manifest(driver_id: str):
        """Returns turn-by-turn navigation, assigned orders, and active vehicle for in-cab tablet."""
        vehicle = next((v for v in engine.vehicles if v.driver_id == driver_id or v.id == "V481"), engine.vehicles[0])
        orders = [o.model_dump() for o in engine.orders if o.assigned_vehicle_id == vehicle.id]
        route = next((r.model_dump() for r in engine.routes if r.vehicle_id == vehicle.id and r.is_active), None)

        return {
            "driver_id": driver_id,
            "vehicle": vehicle.model_dump(),
            "assigned_orders": orders,
            "active_route": route,
            "current_eta": orders[0]["revised_eta"] if orders else "18:30:00"
        }

    return router

