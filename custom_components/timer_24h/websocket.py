"""WebSocket API for Timer 24H Storage."""
import logging
from typing import Any, Dict, List, Optional

import voluptuous as vol

from homeassistant.core import HomeAssistant, callback
from homeassistant.components import websocket_api
from homeassistant.helpers import config_validation as cv

from .const import (
    DOMAIN,
    WS_TYPE_GET,
    WS_TYPE_SET,
    WS_TYPE_DELETE,
    WS_TYPE_LIST,
)

_LOGGER = logging.getLogger(__name__)


@callback
def async_register_websocket_handlers(hass: HomeAssistant) -> None:
    """Register WebSocket API handlers."""
    websocket_api.async_register_command(hass, handle_timer_get)
    websocket_api.async_register_command(hass, handle_timer_set)
    websocket_api.async_register_command(hass, handle_timer_delete)
    websocket_api.async_register_command(hass, handle_timer_list)
    
    _LOGGER.info("Timer 24H WebSocket API handlers registered")


@websocket_api.websocket_command({
    vol.Required("type"): WS_TYPE_GET,
    vol.Required("timer_id"): cv.string,
})
@websocket_api.async_response
async def handle_timer_get(
    hass: HomeAssistant,
    connection: websocket_api.ActiveConnection,
    msg: Dict[str, Any],
) -> None:
    """Handle timer_24h/get command."""
    timer_id = msg["timer_id"]
    
    try:
        storage = hass.data[DOMAIN]["storage"]
        schedule = await storage.async_get_schedule(timer_id)
        
        connection.send_result(msg["id"], {
            "timer_id": timer_id,
            "schedule": schedule,
            "success": True,
        })
        
        _LOGGER.debug("Retrieved schedule for timer: %s", timer_id)
        
    except Exception as err:
        _LOGGER.error("Error getting timer schedule %s: %s", timer_id, err)
        connection.send_error(msg["id"], "get_failed", f"Failed to get timer: {err}")


@websocket_api.websocket_command({
    vol.Required("type"): WS_TYPE_SET,
    vol.Required("timer_id"): cv.string,
    vol.Optional("mask"): cv.string,
    vol.Optional("entities"): [cv.string],
    vol.Optional("resolution_minutes"): cv.positive_int,
})
@websocket_api.async_response
async def handle_timer_set(
    hass: HomeAssistant,
    connection: websocket_api.ActiveConnection,
    msg: Dict[str, Any],
) -> None:
    """Handle timer_24h/set command."""
    timer_id = msg["timer_id"]
    mask = msg.get("mask")
    entities = msg.get("entities")
    resolution_minutes = msg.get("resolution_minutes")
    
    try:
        storage = hass.data[DOMAIN]["storage"]
        
        # Validate mask if provided
        if mask is not None:
            if not all(c in "01" for c in mask):
                connection.send_error(
                    msg["id"], 
                    "invalid_mask", 
                    "Mask must contain only '0' and '1' characters"
                )
                return
        
        # Update schedule
        schedule = await storage.async_set_schedule(
            timer_id=timer_id,
            mask=mask,
            entities=entities,
            resolution_minutes=resolution_minutes,
        )
        
        connection.send_result(msg["id"], {
            "timer_id": timer_id,
            "schedule": schedule,
            "success": True,
        })
        
        # Broadcast update to all connected clients
        hass.bus.async_fire(f"{DOMAIN}_schedule_updated", {
            "timer_id": timer_id,
            "schedule": schedule,
        })
        
        _LOGGER.debug("Updated schedule for timer: %s", timer_id)
        
    except Exception as err:
        _LOGGER.error("Error setting timer schedule %s: %s", timer_id, err)
        connection.send_error(msg["id"], "set_failed", f"Failed to set timer: {err}")


@websocket_api.websocket_command({
    vol.Required("type"): WS_TYPE_DELETE,
    vol.Required("timer_id"): cv.string,
})
@websocket_api.async_response
async def handle_timer_delete(
    hass: HomeAssistant,
    connection: websocket_api.ActiveConnection,
    msg: Dict[str, Any],
) -> None:
    """Handle timer_24h/delete command."""
    timer_id = msg["timer_id"]
    
    try:
        storage = hass.data[DOMAIN]["storage"]
        deleted = await storage.async_delete_schedule(timer_id)
        
        connection.send_result(msg["id"], {
            "timer_id": timer_id,
            "deleted": deleted,
            "success": True,
        })
        
        if deleted:
            # Broadcast deletion to all connected clients
            hass.bus.async_fire(f"{DOMAIN}_schedule_deleted", {
                "timer_id": timer_id,
            })
        
        _LOGGER.debug("Delete request for timer: %s (deleted: %s)", timer_id, deleted)
        
    except Exception as err:
        _LOGGER.error("Error deleting timer schedule %s: %s", timer_id, err)
        connection.send_error(msg["id"], "delete_failed", f"Failed to delete timer: {err}")


@websocket_api.websocket_command({
    vol.Required("type"): WS_TYPE_LIST,
    vol.Optional("summary_only", default=False): cv.boolean,
})
@websocket_api.async_response
async def handle_timer_list(
    hass: HomeAssistant,
    connection: websocket_api.ActiveConnection,
    msg: Dict[str, Any],
) -> None:
    """Handle timer_24h/list command."""
    summary_only = msg.get("summary_only", False)
    
    try:
        storage = hass.data[DOMAIN]["storage"]
        
        if summary_only:
            # Return just summaries for performance
            schedules = {}
            for timer_id in storage._data:
                schedules[timer_id] = storage.get_schedule_summary(timer_id)
        else:
            # Return full schedules
            schedules = await storage.async_list_schedules()
        
        connection.send_result(msg["id"], {
            "schedules": schedules,
            "count": len(schedules),
            "success": True,
        })
        
        _LOGGER.debug("Listed %d timer schedules (summary_only: %s)", len(schedules), summary_only)
        
    except Exception as err:
        _LOGGER.error("Error listing timer schedules: %s", err)
        connection.send_error(msg["id"], "list_failed", f"Failed to list timers: {err}")
