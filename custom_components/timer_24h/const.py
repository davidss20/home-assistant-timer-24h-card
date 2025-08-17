"""Constants for the Timer 24H Storage integration."""

DOMAIN = "timer_24h"
STORAGE_VERSION = 1
STORAGE_KEY = "timer_24h"

# Default timer configuration
DEFAULT_RESOLUTION_MINUTES = 30
DEFAULT_SLOTS_PER_DAY = 24 * 60 // DEFAULT_RESOLUTION_MINUTES  # 48 slots for 30-min resolution

# WebSocket command types
WS_TYPE_GET = "timer_24h/get"
WS_TYPE_SET = "timer_24h/set"
WS_TYPE_DELETE = "timer_24h/delete"
WS_TYPE_LIST = "timer_24h/list"

# Timer schedule field names
FIELD_VERSION = "version"
FIELD_TIMEZONE = "tz"
FIELD_RESOLUTION_MINUTES = "resolution_minutes"
FIELD_MASK = "mask"
FIELD_ENTITIES = "entities"
FIELD_UPDATED_AT = "updated_at"
FIELD_CREATED_AT = "created_at"
