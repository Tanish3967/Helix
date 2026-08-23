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

    return router
