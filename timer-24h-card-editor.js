// Timer 24H Card Editor for Home Assistant

class Timer24HCardEditor extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this.entityFilter = '';
  }

  setConfig(config) {
    this.config = { ...config };
    this.render();
  }

  set hass(hass) {
    this._hass = hass;
    this.render();
  }

  get hass() {
    return this._hass;
  }

  handleTitleChange(ev) {
    this.config.title = ev.target.value;
    this.fireConfigChanged();
  }

  handleSensorChange(ev) {
    const entityId = ev.target.entityId;
    const isChecked = ev.target.checked;
    
    this.config.home_sensors = this.config.home_sensors || [];
    
    if (isChecked) {
      if (!this.config.home_sensors.includes(entityId)) {
        this.config.home_sensors.push(entityId);
      }
    } else {
      this.config.home_sensors = this.config.home_sensors.filter(id => id !== entityId);
    }
    
    this.fireConfigChanged();
  }

  handleLogicChange(ev) {
    this.config.home_logic = ev.target.value;
    this.fireConfigChanged();
  }

  handleEntityChange(ev) {
    const entityId = ev.target.entityId;
    const isChecked = ev.target.checked;
    
    this.config.entities = this.config.entities || [];
    
    if (isChecked) {
      if (!this.config.entities.includes(entityId)) {
        this.config.entities.push(entityId);
      }
    } else {
      this.config.entities = this.config.entities.filter(id => id !== entityId);
    }
    
    this.fireConfigChanged();
  }

  handleSaveStateChange(ev) {
    this.config.save_state = ev.target.checked;
    this.fireConfigChanged();
  }

  fireConfigChanged() {
    const event = new CustomEvent('config-changed', {
      detail: { config: this.config },
      bubbles: true,
      composed: true
    });
    this.dispatchEvent(event);
  }

  getEntityIcon(domain) {
    const icons = {
      'sensor': '📊',
      'binary_sensor': '🔘',
      'person': '👤',
      'device_tracker': '📱',
      'input_boolean': '🔘',
      'light': '💡',
      'switch': '🔌',
      'fan': '💨',
      'climate': '🌡️',
      'media_player': '📺',
      'cover': '🪟'
    };
    return icons[domain] || '🔧';
  }

  render() {
    if (!this.hass) {
      this.shadowRoot.innerHTML = `
        <style>
          .loading {
            display: flex;
            flex-direction: column;
            align-items: center;
            padding: 20px;
          }
          .spinner {
            border: 4px solid #f3f3f3;
            border-top: 4px solid #3498db;
            border-radius: 50%;
            width: 40px;
            height: 40px;
            animation: spin 2s linear infinite;
          }
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        </style>
        <div class="loading">
          <div class="spinner"></div>
          <p>טוען ישויות Home Assistant...</p>
        </div>
      `;
      return;
    }

    const entities = Object.keys(this.hass.states);
    const sensors = entities.filter(e => 
      e.startsWith('sensor.') || 
      e.startsWith('binary_sensor.') || 
      e.startsWith('person.') || 
      e.startsWith('device_tracker.') ||
      e.startsWith('input_boolean.')
    ).sort();
    
    const controllableEntities = entities.filter(e => 
      e.startsWith('light.') || 
      e.startsWith('switch.') || 
      e.startsWith('fan.') || 
      e.startsWith('climate.') || 
      e.startsWith('media_player.') ||
      e.startsWith('cover.') ||
      e.startsWith('input_boolean.')
    ).sort();

    const sensorsList = sensors.map(entityId => {
      const entity = this.hass.states[entityId];
      const isChecked = (this.config.home_sensors || []).includes(entityId);
      const friendlyName = entity?.attributes?.friendly_name || entityId;
      const domain = entityId.split('.')[0];
      const icon = this.getEntityIcon(domain);
      
      return `
        <div class="entity-item ${isChecked ? 'selected' : ''}">
          <input type="checkbox" 
                 ${isChecked ? 'checked' : ''} 
                 data-entity="${entityId}"
                 onchange="this.getRootNode().host.handleSensorChange(event)">
          <div class="entity-info">
            <span class="entity-icon">${icon}</span>
            <div class="entity-details">
              <span class="entity-name">${friendlyName}</span>
              <span class="entity-id">${entityId}</span>
            </div>
          </div>
        </div>
      `;
    }).join('');

    const entitiesList = controllableEntities.map(entityId => {
      const entity = this.hass.states[entityId];
      const isChecked = (this.config.entities || []).includes(entityId);
      const friendlyName = entity?.attributes?.friendly_name || entityId;
      const domain = entityId.split('.')[0];
      const icon = this.getEntityIcon(domain);
      
      return `
        <div class="entity-item ${isChecked ? 'selected' : ''}">
          <input type="checkbox" 
                 ${isChecked ? 'checked' : ''} 
                 data-entity="${entityId}"
                 onchange="this.getRootNode().host.handleEntityChange(event)">
          <div class="entity-info">
            <span class="entity-icon">${icon}</span>
            <div class="entity-details">
              <span class="entity-name">${friendlyName}</span>
              <span class="entity-id">${entityId}</span>
            </div>
          </div>
        </div>
      `;
    }).join('');

    this.shadowRoot.innerHTML = `
      <style>
        :host {
          display: block;
          font-family: var(--primary-font-family, sans-serif);
        }
        
        .card-config {
          padding: 16px;
          background: var(--card-background-color, #ffffff);
          border-radius: var(--ha-card-border-radius, 12px);
        }
        
        .config-header {
          text-align: center;
          margin-bottom: 24px;
          padding-bottom: 16px;
          border-bottom: 1px solid var(--divider-color, #e5e7eb);
        }
        
        .config-header h2 {
          margin: 0 0 8px 0;
          color: var(--primary-text-color, #212121);
          font-size: 1.5rem;
        }
        
        .config-header p {
          margin: 0;
          color: var(--secondary-text-color, #727272);
        }
        
        .config-row {
          margin-bottom: 20px;
        }
        
        .config-row label {
          display: block;
          margin-bottom: 8px;
          font-weight: 500;
          color: var(--primary-text-color, #212121);
        }
        
        .config-row input[type="text"] {
          width: 100%;
          padding: 8px 12px;
          border: 1px solid var(--divider-color, #e5e7eb);
          border-radius: 4px;
          font-size: 14px;
          box-sizing: border-box;
        }
        
        .config-row select {
          width: 100%;
          padding: 8px 12px;
          border: 1px solid var(--divider-color, #e5e7eb);
          border-radius: 4px;
          font-size: 14px;
          box-sizing: border-box;
        }
        
        .help-text {
          font-size: 12px;
          color: var(--secondary-text-color, #727272);
          margin-top: 4px;
        }
        
        .section-title {
          font-size: 1.1rem;
          font-weight: 600;
          margin: 24px 0 12px 0;
          color: var(--primary-text-color, #212121);
          border-bottom: 2px solid var(--primary-color, #3b82f6);
          padding-bottom: 4px;
        }
        
        .entity-list {
          max-height: 200px;
          overflow-y: auto;
          border: 1px solid var(--divider-color, #e5e7eb);
          border-radius: 4px;
          padding: 8px;
        }
        
        .entity-item {
          display: flex;
          align-items: center;
          padding: 8px;
          border-radius: 4px;
          margin-bottom: 4px;
          cursor: pointer;
          transition: background-color 0.2s;
        }
        
        .entity-item:hover {
          background-color: var(--secondary-background-color, #f8f9fa);
        }
        
        .entity-item.selected {
          background-color: var(--primary-color, #3b82f6);
          color: white;
        }
        
        .entity-item input[type="checkbox"] {
          margin-left: 8px;
        }
        
        .entity-info {
          display: flex;
          align-items: center;
          flex: 1;
        }
        
        .entity-icon {
          font-size: 1.2rem;
          margin-left: 8px;
        }
        
        .entity-details {
          margin-right: 8px;
        }
        
        .entity-name {
          display: block;
          font-weight: 500;
        }
        
        .entity-id {
          display: block;
          font-size: 0.8rem;
          opacity: 0.7;
        }
        
        .checkbox-row {
          display: flex;
          align-items: center;
          gap: 8px;
        }
        
        .checkbox-row input[type="checkbox"] {
          margin: 0;
        }
      </style>
      
      <div class="card-config">
        <div class="config-header">
          <h2>🕐 הגדרת כרטיס טיימר 24 שעות</h2>
          <p>הגדר את הטיימר שלך עם בקרה אוטומטית על ישויות</p>
        </div>

        <div class="config-row">
          <label for="title">כותרת הכרטיס</label>
          <input type="text" 
                 id="title" 
                 value="${this.config.title || 'טיימר 24 שעות'}"
                 placeholder="הכנס כותרת לכרטיס"
                 oninput="this.getRootNode().host.handleTitleChange(event)">
          <div class="help-text">הכותרת שתוצג בחלק העליון של הכרטיס</div>
        </div>
        
        <div class="section-title">הגדרות זיהוי נוכחות</div>
        
        <div class="config-row">
          <label>חיישנים לזיהוי נוכחות בבית</label>
          <div class="entity-list">
            ${sensorsList}
          </div>
          <div class="help-text">בחר חיישנים שיקבעו אם אתה בבית (person, binary_sensor, וכו')</div>
        </div>

        <div class="config-row">
          <label for="home_logic">לוגיקת נוכחות</label>
          <select id="home_logic" 
                  onchange="this.getRootNode().host.handleLogicChange(event)">
            <option value="OR" ${(this.config.home_logic || 'OR') === 'OR' ? 'selected' : ''}>
              OR - אחד מהחיישנים מספיק
            </option>
            <option value="AND" ${this.config.home_logic === 'AND' ? 'selected' : ''}>
              AND - כל החיישנים חייבים להיות פעילים
            </option>
          </select>
          <div class="help-text">איך לקבוע נוכחות בבית על בסיס החיישנים</div>
        </div>

        <div class="section-title">ישויות לבקרה</div>

        <div class="config-row">
          <label>ישויות לבקרה אוטומטית</label>
          <div class="entity-list">
            ${entitiesList}
          </div>
          <div class="help-text">בחר ישויות שיופעלו/יכובו לפי לוח הזמנים</div>
        </div>

        <div class="config-row">
          <div class="checkbox-row">
            <input type="checkbox" 
                   id="save_state" 
                   ${this.config.save_state !== false ? 'checked' : ''}
                   onchange="this.getRootNode().host.handleSaveStateChange(event)">
            <label for="save_state">שמור הגדרות טיימר ברמת השרת</label>
          </div>
          <div class="help-text">
            שמור את הגדרות הטיימר ב-Home Assistant (סינכרון בין כל המכשירים)<br>
            <small style="color: #10b981;">✅ אוטומטי - ללא צורך ביצירת helpers נוספים</small>
          </div>
        </div>
      </div>
    `;

    // Add event listeners for checkboxes
    this.shadowRoot.querySelectorAll('input[type="checkbox"][data-entity]').forEach(checkbox => {
      checkbox.entityId = checkbox.getAttribute('data-entity');
    });
  }
}

// Register the custom element
customElements.define('timer-24h-card-editor', Timer24HCardEditor);
