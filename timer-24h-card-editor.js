// Timer 24H Card Editor for Home Assistant
// Full Lovelace GUI Editor with Entity Selection

// Minimal TypeScript-like interfaces for better code organization
/**
 * @typedef {Object} HomeAssistant
 * @property {Object} states - All HA entity states
 * @property {Function} callService - Call HA service
 * @property {Function} callWS - Call HA WebSocket API
 */

/**
 * @typedef {Object} HassEntity
 * @property {string} entity_id - Entity ID
 * @property {string} state - Entity state
 * @property {Object} attributes - Entity attributes
 */

/**
 * @typedef {Object} CardConfig
 * @property {string} title - Card title
 * @property {string} home_logic - Home logic (AND/OR)
 * @property {string[]} entities - Controlled entities
 * @property {string[]} home_sensors - Home sensors
 * @property {boolean} save_state - Save state on server
 * @property {string} storage_entity_id - Storage entity ID
 * @property {boolean} auto_create_helper - Auto create helper
 * @property {boolean} allow_local_fallback - Allow local fallback
 */

class Timer24HCardEditor extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    
    // Internal state
    this._config = {};
    this._hass = null;
    this._configErrors = {};
    this._isCreatingEntity = false;
    this._isSyncing = false;
    this._debounceTimer = null;
    
    // Entity filters
    this.CONTROLLED_DOMAINS = ['switch', 'light', 'input_boolean', 'climate', 'script', 'fan', 'cover'];
    this.SENSOR_DOMAINS = ['binary_sensor', 'sensor', 'person', 'zone', 'input_boolean', 'device_tracker'];
  }

  /**
   * Set configuration from Home Assistant
   * @param {CardConfig} config 
   */
  setConfig(config) {
    if (!config) {
      throw new Error('Invalid configuration: config is required');
    }

    // Validate and normalize config
    this._config = {
      title: config.title || 'Timer 24H',
      home_logic: config.home_logic || 'OR',
      entities: Array.isArray(config.entities) ? config.entities : [],
      home_sensors: Array.isArray(config.home_sensors) ? config.home_sensors : [],
      save_state: Boolean(config.save_state),
      storage_entity_id: config.storage_entity_id || '',
      auto_create_helper: config.auto_create_helper !== false,
      allow_local_fallback: config.allow_local_fallback !== false
    };

    this._validateConfig();
    this.render();
  }

  /**
   * Set Home Assistant instance
   * @param {HomeAssistant} hass 
   */
  set hass(hass) {
    this._hass = hass;
    this.render();
  }

  get hass() {
    return this._hass;
  }

  /**
   * Validate configuration and set errors
   */
  _validateConfig() {
    this._configErrors = {};

    // Validate title
    if (typeof this._config.title !== 'string' || this._config.title.length === 0) {
      this._configErrors.title = 'Title is required';
    }

    // Validate home_logic
    if (!['AND', 'OR'].includes(this._config.home_logic)) {
      this._configErrors.home_logic = 'Home logic must be AND or OR';
    }

    // Validate entities exist (if hass is available)
    if (this._hass) {
      const invalidEntities = this._config.entities.filter(id => !this._hass.states[id]);
      if (invalidEntities.length > 0) {
        this._configErrors.entities = `Missing entities: ${invalidEntities.join(', ')}`;
      }

      const invalidSensors = this._config.home_sensors.filter(id => !this._hass.states[id]);
      if (invalidSensors.length > 0) {
        this._configErrors.home_sensors = `Missing sensors: ${invalidSensors.join(', ')}`;
      }
    }
  }

  /**
   * Get filtered entities by domain
   * @param {string[]} domains - Allowed domains
   * @returns {HassEntity[]}
   */
  _getEntitiesByDomains(domains) {
    if (!this._hass || !this._hass.states) return [];

    return Object.values(this._hass.states)
      .filter(entity => domains.includes(entity.entity_id.split('.')[0]))
      .sort((a, b) => {
        const nameA = a.attributes.friendly_name || a.entity_id;
        const nameB = b.attributes.friendly_name || b.entity_id;
        return nameA.localeCompare(nameB);
      });
  }

  /**
   * Handle input changes with debouncing
   * @param {string} key - Config key
   * @param {any} value - New value
   */
  _handleConfigChange(key, value) {
    // Clear previous debounce timer
    if (this._debounceTimer) {
      clearTimeout(this._debounceTimer);
    }

    // Update config immediately for UI responsiveness
    this._config[key] = value;
    this._validateConfig();

    // Debounce the actual config change event
    this._debounceTimer = setTimeout(() => {
      this._fireConfigChanged();
    }, 200);
  }

  /**
   * Fire config-changed event
   */
  _fireConfigChanged() {
    const event = new CustomEvent('config-changed', {
      detail: { config: { ...this._config } },
      bubbles: true,
      composed: true
    });
    this.dispatchEvent(event);
  }

  /**
   * Create storage entity
   */
  async _createStorageEntity() {
    if (!this._hass || this._isCreatingEntity) return;

    this._isCreatingEntity = true;
    this.render(); // Show spinner

    try {
      // Import the main card class to access static methods
      const Timer24HCard = customElements.get('timer-24h-card');
      if (!Timer24HCard) {
        throw new Error('Timer 24H Card not loaded');
      }

      const entityId = await Timer24HCard.ensureStorageEntity(this._hass);
      
      this._config.storage_entity_id = entityId;
      this._showToast('Storage entity created successfully!', 'success');
      this._fireConfigChanged();

    } catch (error) {
      console.error('Failed to create storage entity:', error);
      this._showToast(`Failed to create entity: ${error.message}`, 'error');
    } finally {
      this._isCreatingEntity = false;
      this.render();
    }
  }

  /**
   * Load saved state from server
   */
  async _loadSavedState() {
    if (!this._hass || !this._config.storage_entity_id || this._isSyncing) return;

    this._isSyncing = true;
    this.render(); // Show spinner

    try {
      // Import the main card class to access static methods
      const Timer24HCard = customElements.get('timer-24h-card');
      if (!Timer24HCard) {
        throw new Error('Timer 24H Card not loaded');
      }

      const savedData = await Timer24HCard.readStorage(this._hass, this._config.storage_entity_id);
      
      // Merge saved config (only known keys)
      const knownKeys = ['title', 'home_logic', 'entities', 'home_sensors', 'save_state'];
      let hasChanges = false;

      knownKeys.forEach(key => {
        if (savedData[key] !== undefined && savedData[key] !== this._config[key]) {
          this._config[key] = savedData[key];
          hasChanges = true;
        }
      });

      if (hasChanges) {
        this._validateConfig();
        this._fireConfigChanged();
        this._showToast('Configuration synced from server!', 'success');
      } else {
        this._showToast('No changes found on server', 'info');
      }

    } catch (error) {
      console.error('Failed to load saved state:', error);
      this._showToast(`Failed to sync: ${error.message}`, 'error');
    } finally {
      this._isSyncing = false;
      this.render();
    }
  }

  /**
   * Show toast message
   * @param {string} message 
   * @param {string} type 
   */
  _showToast(message, type = 'info') {
    // Create a simple toast notification
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.textContent = message;
    
    // Add to shadow root
    this.shadowRoot.appendChild(toast);
    
    // Remove after 3 seconds
    setTimeout(() => {
      if (toast.parentNode) {
        toast.parentNode.removeChild(toast);
      }
    }, 3000);
  }

  /**
   * Render the editor UI
   */
  render() {
    if (!this.shadowRoot) return;

    const controlledEntities = this._getEntitiesByDomains(this.CONTROLLED_DOMAINS);
    const sensorEntities = this._getEntitiesByDomains(this.SENSOR_DOMAINS);

    this.shadowRoot.innerHTML = `
      <style>
        :host {
          display: block;
          padding: 16px;
          font-family: var(--primary-font-family, sans-serif);
          --primary-color: var(--accent-color, #03a9f4);
          --error-color: #f44336;
          --success-color: #4caf50;
          --warning-color: #ff9800;
        }

        .section {
          margin-bottom: 24px;
          padding: 16px;
          border: 1px solid var(--divider-color, #e0e0e0);
          border-radius: 8px;
          background: var(--card-background-color, #fff);
        }

        .section-title {
          font-size: 16px;
          font-weight: bold;
          margin-bottom: 16px;
          color: var(--primary-text-color);
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .form-group {
          margin-bottom: 16px;
        }

        .form-label {
          display: block;
          margin-bottom: 4px;
          font-weight: 500;
          color: var(--primary-text-color);
        }

        .form-input {
          width: 100%;
          padding: 8px 12px;
          border: 1px solid var(--divider-color, #e0e0e0);
          border-radius: 4px;
          font-size: 14px;
          background: var(--card-background-color, #fff);
          color: var(--primary-text-color);
          box-sizing: border-box;
        }

        .form-input:focus {
          outline: none;
          border-color: var(--primary-color);
          box-shadow: 0 0 0 2px rgba(3, 169, 244, 0.2);
        }

        .form-select {
          width: 100%;
          padding: 8px 12px;
          border: 1px solid var(--divider-color, #e0e0e0);
          border-radius: 4px;
          font-size: 14px;
          background: var(--card-background-color, #fff);
          color: var(--primary-text-color);
          cursor: pointer;
        }

        .entity-list {
          max-height: 200px;
          overflow-y: auto;
          border: 1px solid var(--divider-color, #e0e0e0);
          border-radius: 4px;
          background: var(--card-background-color, #fff);
        }

        .entity-item {
          display: flex;
          align-items: center;
          padding: 8px 12px;
          border-bottom: 1px solid var(--divider-color, #e0e0e0);
          cursor: pointer;
          transition: background-color 0.2s;
        }

        .entity-item:hover {
          background: var(--secondary-background-color, #f5f5f5);
        }

        .entity-item:last-child {
          border-bottom: none;
        }

        .entity-checkbox {
          margin-right: 12px;
        }

        .entity-info {
          flex: 1;
          min-width: 0;
        }

        .entity-name {
          font-weight: 500;
          color: var(--primary-text-color);
          margin-bottom: 2px;
        }

        .entity-id {
          font-size: 12px;
          color: var(--secondary-text-color);
          font-family: monospace;
        }

        .entity-missing {
          color: var(--error-color);
          font-style: italic;
        }

        .search-box {
          margin-bottom: 8px;
          padding: 8px 12px;
          width: 100%;
          box-sizing: border-box;
          border: 1px solid var(--divider-color, #e0e0e0);
          border-radius: 4px;
          font-size: 14px;
        }

        .button {
          padding: 8px 16px;
          border: none;
          border-radius: 4px;
          font-size: 14px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s;
          display: inline-flex;
          align-items: center;
          gap: 8px;
        }

        .button:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .button-primary {
          background: var(--primary-color);
          color: white;
        }

        .button-primary:hover:not(:disabled) {
          background: var(--primary-color);
          filter: brightness(0.9);
        }

        .button-secondary {
          background: var(--secondary-background-color, #f5f5f5);
          color: var(--primary-text-color);
          border: 1px solid var(--divider-color, #e0e0e0);
        }

        .button-secondary:hover:not(:disabled) {
          background: var(--divider-color, #e0e0e0);
        }

        .toggle-switch {
          position: relative;
          display: inline-block;
          width: 44px;
          height: 24px;
        }

        .toggle-switch input {
          opacity: 0;
          width: 0;
          height: 0;
        }

        .toggle-slider {
          position: absolute;
          cursor: pointer;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background-color: #ccc;
          transition: 0.2s;
          border-radius: 24px;
        }

        .toggle-slider:before {
          position: absolute;
          content: "";
          height: 18px;
          width: 18px;
          left: 3px;
          bottom: 3px;
          background-color: white;
          transition: 0.2s;
          border-radius: 50%;
        }

        input:checked + .toggle-slider {
          background-color: var(--primary-color);
        }

        input:checked + .toggle-slider:before {
          transform: translateX(20px);
        }

        .error-message {
          color: var(--error-color);
          font-size: 12px;
          margin-top: 4px;
        }

        .info-text {
          font-size: 12px;
          color: var(--secondary-text-color);
          margin-top: 4px;
          line-height: 1.4;
        }

        .spinner {
          display: inline-block;
          width: 16px;
          height: 16px;
          border: 2px solid #f3f3f3;
          border-top: 2px solid var(--primary-color);
          border-radius: 50%;
          animation: spin 1s linear infinite;
        }

        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }

        .toast {
          position: fixed;
          bottom: 20px;
          right: 20px;
          padding: 12px 16px;
          border-radius: 4px;
          color: white;
          font-weight: 500;
          z-index: 1000;
          animation: slideIn 0.3s ease-out;
        }

        .toast-success { background: var(--success-color); }
        .toast-error { background: var(--error-color); }
        .toast-info { background: var(--primary-color); }
        .toast-warning { background: var(--warning-color); }

        @keyframes slideIn {
          from { transform: translateX(100%); }
          to { transform: translateX(0); }
        }

        .button-group {
          display: flex;
          gap: 8px;
          margin-top: 16px;
        }

        .readonly-input {
          background: var(--secondary-background-color, #f5f5f5);
          color: var(--secondary-text-color);
        }

        .selected-count {
          font-size: 12px;
          color: var(--secondary-text-color);
          margin-top: 4px;
        }
      </style>

      <!-- Basic Configuration -->
      <div class="section">
        <div class="section-title">
          🏠 Basic Configuration
        </div>
        
        <div class="form-group">
          <label class="form-label" for="title">Card Title</label>
          <input 
            type="text" 
            id="title" 
            class="form-input" 
            .value="${this._config.title}"
            @input="${(e) => this._handleConfigChange('title', e.target.value)}"
            placeholder="Timer 24H"
          />
          ${this._configErrors.title ? `<div class="error-message">${this._configErrors.title}</div>` : ''}
        </div>

        <div class="form-group">
          <label class="form-label" for="home-logic">Home Logic</label>
          <select 
            id="home-logic" 
            class="form-select"
            .value="${this._config.home_logic}"
            @change="${(e) => this._handleConfigChange('home_logic', e.target.value)}"
          >
            <option value="OR">OR - At least one sensor must be active</option>
            <option value="AND">AND - All sensors must be active</option>
          </select>
          <div class="info-text">
            Determines how home sensors are evaluated to decide if you're "at home"
          </div>
          ${this._configErrors.home_logic ? `<div class="error-message">${this._configErrors.home_logic}</div>` : ''}
        </div>
      </div>

      <!-- Controlled Entities -->
      <div class="section">
        <div class="section-title">
          ⚡ Controlled Entities
          <span class="selected-count">(${this._config.entities.length} selected)</span>
        </div>
        <div class="info-text" style="margin-bottom: 12px;">
          Select entities that will be turned on/off based on the timer schedule
        </div>
        
        ${this._renderEntitySelector(controlledEntities, this._config.entities, 'entities')}
        ${this._configErrors.entities ? `<div class="error-message">${this._configErrors.entities}</div>` : ''}
      </div>

      <!-- Home Sensors -->
      <div class="section">
        <div class="section-title">
          📍 Home Sensors
          <span class="selected-count">(${this._config.home_sensors.length} selected)</span>
        </div>
        <div class="info-text" style="margin-bottom: 12px;">
          Select sensors that determine if you're at home (timer only works when at home)
        </div>
        
        ${this._renderEntitySelector(sensorEntities, this._config.home_sensors, 'home_sensors')}
        ${this._configErrors.home_sensors ? `<div class="error-message">${this._configErrors.home_sensors}</div>` : ''}
      </div>

      <!-- Server Persistence -->
      <div class="section">
        <div class="section-title">
          💾 Server Persistence
        </div>
        
        <div class="form-group">
          <label class="form-label">
            <label class="toggle-switch">
              <input 
                type="checkbox" 
                .checked="${this._config.save_state}"
                @change="${(e) => this._handleConfigChange('save_state', e.target.checked)}"
              />
              <span class="toggle-slider"></span>
            </label>
            Save state on server
          </label>
          <div class="info-text">
            When enabled, the timer configuration will be saved to Home Assistant and synced across devices
          </div>
        </div>

        ${this._config.save_state ? `
          <div class="form-group">
            <label class="form-label" for="storage-entity">Storage Entity ID</label>
            <input 
              type="text" 
              id="storage-entity" 
              class="form-input ${this._config.storage_entity_id ? 'readonly-input' : ''}" 
              .value="${this._config.storage_entity_id}"
              @input="${(e) => this._handleConfigChange('storage_entity_id', e.target.value)}"
              placeholder="Will be auto-generated"
              ?readonly="${!!this._config.storage_entity_id}"
            />
            <div class="info-text">
              The input_text entity used to store the timer configuration
            </div>
          </div>

          <div class="button-group">
            <button 
              class="button button-primary"
              @click="${this._createStorageEntity}"
              ?disabled="${!!this._config.storage_entity_id || this._isCreatingEntity || !this._hass}"
            >
              ${this._isCreatingEntity ? '<span class="spinner"></span>' : ''}
              ${this._config.storage_entity_id ? 'Entity Created' : 'Create Storage Entity'}
            </button>
            
            <button 
              class="button button-secondary"
              @click="${this._loadSavedState}"
              ?disabled="${!this._config.storage_entity_id || this._isSyncing || !this._hass}"
            >
              ${this._isSyncing ? '<span class="spinner"></span>' : ''}
              Sync from Server
            </button>
          </div>
        ` : ''}
      </div>
    `;
  }

  /**
   * Render entity selector
   * @param {HassEntity[]} entities 
   * @param {string[]} selectedIds 
   * @param {string} configKey 
   */
  _renderEntitySelector(entities, selectedIds, configKey) {
    const searchId = `search-${configKey}`;
    
    return `
      <input 
        type="text" 
        id="${searchId}"
        class="search-box" 
        placeholder="Search entities..."
        @input="${(e) => this._filterEntities(e.target.value, configKey)}"
      />
      <div class="entity-list" id="list-${configKey}">
        ${entities.map(entity => {
          const isSelected = selectedIds.includes(entity.entity_id);
          const isMissing = !this._hass || !this._hass.states[entity.entity_id];
          const name = entity.attributes.friendly_name || entity.entity_id;
          
          return `
            <div class="entity-item" @click="${() => this._toggleEntity(entity.entity_id, configKey)}">
              <input 
                type="checkbox" 
                class="entity-checkbox"
                .checked="${isSelected}"
                @click="${(e) => e.stopPropagation()}"
                @change="${(e) => this._toggleEntity(entity.entity_id, configKey)}"
              />
              <div class="entity-info">
                <div class="entity-name ${isMissing ? 'entity-missing' : ''}">
                  ${name} ${isMissing ? '(missing)' : ''}
                </div>
                <div class="entity-id">${entity.entity_id}</div>
              </div>
            </div>
          `;
        }).join('')}
      </div>
    `;
  }

  /**
   * Filter entities in the list
   * @param {string} searchTerm 
   * @param {string} configKey 
   */
  _filterEntities(searchTerm, configKey) {
    const listElement = this.shadowRoot.getElementById(`list-${configKey}`);
    if (!listElement) return;

    const items = listElement.querySelectorAll('.entity-item');
    const term = searchTerm.toLowerCase();

    items.forEach(item => {
      const name = item.querySelector('.entity-name').textContent.toLowerCase();
      const id = item.querySelector('.entity-id').textContent.toLowerCase();
      const matches = name.includes(term) || id.includes(term);
      item.style.display = matches ? 'flex' : 'none';
    });
  }

  /**
   * Toggle entity selection
   * @param {string} entityId 
   * @param {string} configKey 
   */
  _toggleEntity(entityId, configKey) {
    const currentList = [...this._config[configKey]];
    const index = currentList.indexOf(entityId);
    
    if (index >= 0) {
      currentList.splice(index, 1);
    } else {
      currentList.push(entityId);
    }
    
    this._handleConfigChange(configKey, currentList);
    
    // Re-render to update UI
    this.render();
  }

  connectedCallback() {
    this.render();
  }
}

// Register the editor element
if (!customElements.get('timer-24h-card-editor')) {
  customElements.define('timer-24h-card-editor', Timer24HCardEditor);
}

console.info(
  '%c  TIMER-24H-CARD-EDITOR  %c  Version 2.1.0 - Full GUI Editor  ',
  'color: orange; font-weight: bold; background: black',
  'color: white; font-weight: bold; background: dimgray'
);