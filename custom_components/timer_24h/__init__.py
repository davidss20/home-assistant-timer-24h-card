"""
Timer 24H Storage Integration for Home Assistant.

Provides automatic server-side storage for 24-hour timer schedules
without requiring manual configuration or helper entities.
"""
import logging
from typing import Any, Dict, Optional

from homeassistant.core import HomeAssistant
from homeassistant.config_entries import ConfigEntry
from homeassistant.helpers.typing import ConfigType

from .const import DOMAIN
from .storage import Timer24HStorage
from .websocket import async_register_websocket_handlers

_LOGGER = logging.getLogger(__name__)

PLATFORMS = []  # No platforms needed, just storage and WebSocket


async def async_setup(hass: HomeAssistant, config: ConfigType) -> bool:
    """Set up the Timer 24H Storage integration."""
    _LOGGER.info("Setting up Timer 24H Storage integration")
    
    # Initialize storage
    storage = Timer24HStorage(hass)
    await storage.async_load()
    
    # Store in hass data
    hass.data[DOMAIN] = {
        "storage": storage,
    }
    
    # Register WebSocket API handlers
    async_register_websocket_handlers(hass)
    
    _LOGGER.info("Timer 24H Storage integration setup complete")
    return True


async def async_setup_entry(hass: HomeAssistant, entry: ConfigEntry) -> bool:
    """Set up Timer 24H Storage from a config entry."""
    # This integration doesn't use config entries
    return True


async def async_unload_entry(hass: HomeAssistant, entry: ConfigEntry) -> bool:
    """Unload a config entry."""
    return True


async def async_remove_entry(hass: HomeAssistant, entry: ConfigEntry) -> None:
    """Remove a config entry."""
    pass
