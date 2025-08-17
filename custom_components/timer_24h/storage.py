"""Storage management for Timer 24H schedules."""
import logging
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

from homeassistant.core import HomeAssistant
from homeassistant.helpers.storage import Store
from homeassistant.util import dt as dt_util

from .const import (
    DOMAIN,
    STORAGE_VERSION,
    STORAGE_KEY,
    DEFAULT_RESOLUTION_MINUTES,
    DEFAULT_SLOTS_PER_DAY,
    FIELD_VERSION,
    FIELD_TIMEZONE,
    FIELD_RESOLUTION_MINUTES,
    FIELD_MASK,
    FIELD_ENTITIES,
    FIELD_UPDATED_AT,
    FIELD_CREATED_AT,
)

_LOGGER = logging.getLogger(__name__)


class Timer24HStorage:
    """Manages storage for 24-hour timer schedules."""
    
    def __init__(self, hass: HomeAssistant) -> None:
        """Initialize the storage manager."""
        self.hass = hass
        self._store = Store(hass, STORAGE_VERSION, STORAGE_KEY)
        self._data: Dict[str, Dict[str, Any]] = {}
        
    async def async_load(self) -> None:
        """Load data from storage."""
        try:
            data = await self._store.async_load()
            if data is not None:
                self._data = data
                _LOGGER.info("Loaded %d timer schedules from storage", len(self._data))
            else:
                self._data = {}
                _LOGGER.info("No existing timer data found, starting fresh")
        except Exception as err:
            _LOGGER.error("Error loading timer data: %s", err)
            self._data = {}
    
    async def async_save(self) -> None:
        """Save data to storage."""
        try:
            await self._store.async_save(self._data)
            _LOGGER.debug("Timer data saved to storage")
        except Exception as err:
            _LOGGER.error("Error saving timer data: %s", err)
    
    def _create_default_schedule(self, timer_id: str) -> Dict[str, Any]:
        """Create a default timer schedule."""
        now = dt_util.utcnow().isoformat()
        
        # Create default mask (all slots off)
        default_mask = "0" * DEFAULT_SLOTS_PER_DAY
        
        return {
            FIELD_VERSION: STORAGE_VERSION,
            FIELD_TIMEZONE: str(self.hass.config.time_zone),
            FIELD_RESOLUTION_MINUTES: DEFAULT_RESOLUTION_MINUTES,
            FIELD_MASK: default_mask,
            FIELD_ENTITIES: [],
            FIELD_CREATED_AT: now,
            FIELD_UPDATED_AT: now,
        }
    
    async def async_get_schedule(self, timer_id: str) -> Dict[str, Any]:
        """Get a timer schedule by ID, creating default if not exists."""
        if timer_id not in self._data:
            _LOGGER.info("Creating default schedule for timer: %s", timer_id)
            self._data[timer_id] = self._create_default_schedule(timer_id)
            await self.async_save()
        
        return self._data[timer_id].copy()
    
    async def async_set_schedule(
        self, 
        timer_id: str, 
        mask: Optional[str] = None,
        entities: Optional[List[str]] = None,
        resolution_minutes: Optional[int] = None,
    ) -> Dict[str, Any]:
        """Set/update a timer schedule."""
        # Get existing or create new
        if timer_id not in self._data:
            self._data[timer_id] = self._create_default_schedule(timer_id)
        
        schedule = self._data[timer_id]
        
        # Update fields if provided
        if mask is not None:
            schedule[FIELD_MASK] = mask
        if entities is not None:
            schedule[FIELD_ENTITIES] = entities.copy()
        if resolution_minutes is not None:
            schedule[FIELD_RESOLUTION_MINUTES] = resolution_minutes
        
        # Always update timestamp and timezone
        schedule[FIELD_UPDATED_AT] = dt_util.utcnow().isoformat()
        schedule[FIELD_TIMEZONE] = str(self.hass.config.time_zone)
        
        await self.async_save()
        
        _LOGGER.debug("Updated schedule for timer: %s", timer_id)
        return schedule.copy()
    
    async def async_delete_schedule(self, timer_id: str) -> bool:
        """Delete a timer schedule."""
        if timer_id in self._data:
            del self._data[timer_id]
            await self.async_save()
            _LOGGER.info("Deleted schedule for timer: %s", timer_id)
            return True
        return False
    
    async def async_list_schedules(self) -> Dict[str, Dict[str, Any]]:
        """List all timer schedules."""
        return {
            timer_id: schedule.copy() 
            for timer_id, schedule in self._data.items()
        }
    
    def get_schedule_summary(self, timer_id: str) -> Dict[str, Any]:
        """Get a summary of a timer schedule without async."""
        if timer_id not in self._data:
            return {
                "exists": False,
                "timer_id": timer_id,
            }
        
        schedule = self._data[timer_id]
        active_slots = schedule[FIELD_MASK].count("1")
        total_slots = len(schedule[FIELD_MASK])
        
        return {
            "exists": True,
            "timer_id": timer_id,
            "active_slots": active_slots,
            "total_slots": total_slots,
            "entities_count": len(schedule[FIELD_ENTITIES]),
            "updated_at": schedule[FIELD_UPDATED_AT],
            "resolution_minutes": schedule[FIELD_RESOLUTION_MINUTES],
        }
