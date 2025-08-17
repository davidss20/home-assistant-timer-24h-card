"""
Timer 24H Card Storage Component for Home Assistant
Stores timer configurations in server-side JSON file
"""
import json
import os
import logging
from datetime import datetime
from homeassistant.core import HomeAssistant, ServiceCall
from homeassistant.helpers import config_validation as cv
import voluptuous as vol

DOMAIN = "timer_card_storage"
_LOGGER = logging.getLogger(__name__)

# Service schemas
SAVE_SERVICE_SCHEMA = vol.Schema({
    vol.Required("card_id"): cv.string,
    vol.Required("data"): vol.Any(dict, list),
})

LOAD_SERVICE_SCHEMA = vol.Schema({
    vol.Required("card_id"): cv.string,
})

async def async_setup(hass: HomeAssistant, config: dict) -> bool:
    """Set up the Timer Card Storage component."""
    
    # Create storage directory
    storage_dir = hass.config.path("timer_card_storage")
    if not os.path.exists(storage_dir):
        os.makedirs(storage_dir)
    
    async def save_timer_data(call: ServiceCall) -> None:
        """Save timer data to JSON file."""
        card_id = call.data.get("card_id")
        data = call.data.get("data")
        
        # Sanitize card_id for filename
        safe_card_id = "".join(c for c in card_id if c.isalnum() or c in ('-', '_')).lower()
        file_path = os.path.join(storage_dir, f"{safe_card_id}.json")
        
        timer_data = {
            "card_id": card_id,
            "data": data,
            "timestamp": datetime.now().isoformat(),
            "version": "1.0"
        }
        
        try:
            with open(file_path, 'w', encoding='utf-8') as f:
                json.dump(timer_data, f, ensure_ascii=False, indent=2)
            
            _LOGGER.info(f"Timer data saved for card: {card_id}")
            
            # Fire event for real-time sync
            hass.bus.async_fire("timer_card_data_saved", {
                "card_id": card_id,
                "data": data
            })
            
        except Exception as e:
            _LOGGER.error(f"Failed to save timer data for {card_id}: {e}")
    
    async def load_timer_data(call: ServiceCall) -> dict:
        """Load timer data from JSON file."""
        card_id = call.data.get("card_id")
        
        # Sanitize card_id for filename
        safe_card_id = "".join(c for c in card_id if c.isalnum() or c in ('-', '_')).lower()
        file_path = os.path.join(storage_dir, f"{safe_card_id}.json")
        
        try:
            if os.path.exists(file_path):
                with open(file_path, 'r', encoding='utf-8') as f:
                    timer_data = json.load(f)
                
                _LOGGER.info(f"Timer data loaded for card: {card_id}")
                
                # Fire event with loaded data
                hass.bus.async_fire("timer_card_data_loaded", {
                    "card_id": card_id,
                    "data": timer_data.get("data", {}),
                    "timestamp": timer_data.get("timestamp")
                })
                
                return timer_data.get("data", {})
            else:
                _LOGGER.info(f"No timer data found for card: {card_id}")
                return {}
                
        except Exception as e:
            _LOGGER.error(f"Failed to load timer data for {card_id}: {e}")
            return {}
    
    async def list_timer_cards(call: ServiceCall) -> None:
        """List all saved timer cards."""
        try:
            files = [f for f in os.listdir(storage_dir) if f.endswith('.json')]
            cards = []
            
            for file in files:
                file_path = os.path.join(storage_dir, file)
                try:
                    with open(file_path, 'r', encoding='utf-8') as f:
                        data = json.load(f)
                        cards.append({
                            "card_id": data.get("card_id", file.replace('.json', '')),
                            "timestamp": data.get("timestamp"),
                            "file": file
                        })
                except Exception as e:
                    _LOGGER.warning(f"Failed to read {file}: {e}")
            
            hass.bus.async_fire("timer_card_list", {"cards": cards})
            _LOGGER.info(f"Listed {len(cards)} timer cards")
            
        except Exception as e:
            _LOGGER.error(f"Failed to list timer cards: {e}")
    
    # Register services
    hass.services.async_register(
        DOMAIN, "save", save_timer_data, schema=SAVE_SERVICE_SCHEMA
    )
    
    hass.services.async_register(
        DOMAIN, "load", load_timer_data, schema=LOAD_SERVICE_SCHEMA
    )
    
    hass.services.async_register(
        DOMAIN, "list", list_timer_cards
    )
    
    _LOGGER.info("Timer Card Storage component loaded successfully")
    return True
