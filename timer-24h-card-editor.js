class Timer24HCardEditor extends HTMLElement {
  setConfig(config) {
    this.config = { ...config };
    this.render();
  }

  set hass(hass) {
    this._hass = hass;
    if (this._hass) {
      this.render();
    }
  }

  get hass() {
    return this._hass;
  }

  configChanged(newConfig) {
    const event = new Event('config-changed', {
      bubbles: true,
      composed: true,
    });
    event.detail = { config: newConfig };
    this.dispatchEvent(event);
  }

  render() {
    if (!this._hass) {
      this.innerHTML = '<div>Loading...</div>';
      return;
    }

    // Get list of all entities
    const entities = Object.keys(this._hass.states);
    const sensors = entities.filter(e => 
      e.startsWith('sensor.') || 
      e.startsWith('binary_sensor.') || 
      e.startsWith('person.') || 
      e.startsWith('device_tracker.') ||
      e.startsWith('input_boolean.')
    );
    const controllableEntities = entities.filter(e => 
      e.startsWith('light.') || 
      e.startsWith('switch.') || 
      e.startsWith('fan.') || 
      e.startsWith('climate.') || 
      e.startsWith('media_player.') ||
      e.startsWith('cover.') ||
      e.startsWith('input_boolean.')
    );

    this.innerHTML = `
      <style>
        .card-config {
          display: flex;
          flex-direction: column;
          gap: 16px;
          padding: 16px;
        }
        
        .config-row {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }
        
        label {
          font-weight: bold;
          color: var(--primary-text-color);
          font-size: 14px;
        }
        
        input[type="text"], select {
          padding: 8px 12px;
          border: 1px solid var(--divider-color);
          border-radius: 4px;
          background: var(--card-background-color);
          color: var(--primary-text-color);
          font-size: 14px;
        }
        
        .entity-list {
          max-height: 200px;
          overflow-y: auto;
          border: 1px solid var(--divider-color);
          border-radius: 4px;
          padding: 8px;
          background: var(--card-background-color);
        }
        
        .entity-item {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 6px 0;
          border-bottom: 1px solid var(--divider-color);
        }
        
        .entity-item:last-child {
          border-bottom: none;
        }
        
        .entity-item label {
          flex-grow: 1;
          font-weight: normal;
          cursor: pointer;
        }
        
        .entity-state {
          font-size: 12px;
          color: var(--secondary-text-color);
          font-style: italic;
        }
        
        .help-text {
          font-size: 12px;
          color: var(--secondary-text-color);
          font-style: italic;
          margin-top: 4px;
        }
        
        .checkbox-container {
          display: flex;
          align-items: center;
          gap: 8px;
          margin: 8px 0;
        }
        
        .checkbox-container input[type="checkbox"] {
          margin: 0;
        }
        
        .section-title {
          font-size: 16px;
          font-weight: bold;
          color: var(--primary-text-color);
          margin: 16px 0 8px 0;
          border-bottom: 1px solid var(--divider-color);
          padding-bottom: 4px;
        }
      </style>
      
      <div class="card-config">
        <div class="config-row">
          <label for="title">Card Title</label>
          <input type="text" id="title" value="${this.config.title || '24 Hour Timer'}" 
                 placeholder="Enter card title">
          <div class="help-text">The title displayed at the top of the card</div>
        </div>
        
        <div class="section-title">Home Presence Settings</div>
        
        <div class="config-row">
          <label>Sensors for home presence detection</label>
          <div class="entity-list" id="sensor-list">
            ${sensors.map(entityId => {
              const entity = this._hass.states[entityId];
              const isChecked = (this.config.home_sensors || []).includes(entityId);
              return `
                <div class="entity-item">
                  <input type="checkbox" id="sensor-${entityId}" 
                         ${isChecked ? 'checked' : ''}
                         data-entity="${entityId}">
                  <label for="sensor-${entityId}">${entityId}</label>
                  <span class="entity-state">${entity?.state || 'unavailable'}</span>
                </div>
              `;
            }).join('')}
          </div>
          <div class="help-text">Select sensors that determine if you are at home (person, device_tracker, binary_sensor, etc.)</div>
        </div>
        
        <div class="config-row">
          <label for="home-logic">Home presence logic</label>
          <select id="home-logic">
            <option value="OR" ${(this.config.home_logic || 'OR') === 'OR' ? 'selected' : ''}>
              OR - At least one sensor must be active
            </option>
            <option value="AND" ${this.config.home_logic === 'AND' ? 'selected' : ''}>
              AND - All sensors must be active
            </option>
          </select>
          <div class="help-text">How to determine if you are at home based on the selected sensors</div>
        </div>
        
        <div class="section-title">Entity Control</div>
        
        <div class="config-row">
          <label>Entities to control based on timer</label>
          <div class="entity-list" id="entity-list">
            ${controllableEntities.map(entityId => {
              const entity = this._hass.states[entityId];
              const isChecked = (this.config.entities || []).includes(entityId);
              return `
                <div class="entity-item">
                  <input type="checkbox" id="entity-${entityId}" 
                         ${isChecked ? 'checked' : ''}
                         data-entity="${entityId}">
                  <label for="entity-${entityId}">${entityId}</label>
                  <span class="entity-state">${entity?.state || 'unavailable'}</span>
                </div>
              `;
            }).join('')}
          </div>
          <div class="help-text">Select entities that will be automatically turned on/off according to the schedule</div>
        </div>
        
        <div class="section-title">Additional Settings</div>
        
        <div class="checkbox-container">
          <input type="checkbox" id="save-state" 
                 ${this.config.save_state !== false ? 'checked' : ''}>
          <label for="save-state">Save timer settings in browser</label>
        </div>
        <div class="help-text">If checked, settings will be saved even after refreshing the page or closing the browser</div>
      </div>
    `;

    this.addEventListeners();
  }

  addEventListeners() {
    // Title
    this.querySelector('#title').addEventListener('input', (e) => {
      this.config = { ...this.config, title: e.target.value };
      this.configChanged(this.config);
    });

    // Home logic
    this.querySelector('#home-logic').addEventListener('change', (e) => {
      this.config = { ...this.config, home_logic: e.target.value };
      this.configChanged(this.config);
    });

    // Save state
    this.querySelector('#save-state').addEventListener('change', (e) => {
      this.config = { ...this.config, save_state: e.target.checked };
      this.configChanged(this.config);
    });

    // Sensors
    this.querySelectorAll('#sensor-list input[type="checkbox"]').forEach(checkbox => {
      checkbox.addEventListener('change', (e) => {
        const entityId = e.target.dataset.entity;
        const sensors = [...(this.config.home_sensors || [])];
        const index = sensors.indexOf(entityId);
        
        if (e.target.checked && index === -1) {
          sensors.push(entityId);
        } else if (!e.target.checked && index > -1) {
          sensors.splice(index, 1);
        }
        
        this.config = { ...this.config, home_sensors: sensors };
        this.configChanged(this.config);
      });
    });

    // Entities
    this.querySelectorAll('#entity-list input[type="checkbox"]').forEach(checkbox => {
      checkbox.addEventListener('change', (e) => {
        const entityId = e.target.dataset.entity;
        const entities = [...(this.config.entities || [])];
        const index = entities.indexOf(entityId);
        
        if (e.target.checked && index === -1) {
          entities.push(entityId);
        } else if (!e.target.checked && index > -1) {
          entities.splice(index, 1);
        }
        
        this.config = { ...this.config, entities: entities };
        this.configChanged(this.config);
      });
    });
  }
}

customElements.define('timer-24h-card-editor', Timer24HCardEditor); 