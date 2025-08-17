class Timer24HCardEditor extends HTMLElement {
  constructor() {
    super();
    this.entityFilter = '';
    this.language = this.detectLanguage();
  }

  detectLanguage() {
    // Try to detect language from Home Assistant or browser
    if (this._hass && this._hass.language) {
      return this._hass.language;
    }
    
    // Check browser language
    const browserLang = navigator.language || navigator.userLanguage;
    if (browserLang.startsWith('he')) {
      return 'he';
    }
    
    // Default to English
    return 'en';
  }

  translate(key) {
    const translations = {
      en: {
        'card_configuration': '🕐 Timer 24H Card Configuration',
        'configure_timer': 'Configure your 24-hour timer with automatic entity control',
        'card_title': 'Card Title',
        'enter_card_title': 'Enter card title',
        'title_help': 'The title displayed at the top of the card',
        'home_presence_settings': 'Home Presence Settings',
        'sensors_for_home': 'Sensors for home presence detection',
        'sensors_help': '💡 Select sensors that indicate when you are at home (person, device_tracker, binary_sensor, etc.)',
        'home_detection_logic': 'Home detection logic',
        'or_logic': '🔀 OR - At least one sensor must be active',
        'and_logic': '🔗 AND - All sensors must be active',
        'logic_help': '🤔 How to determine if you are at home based on the selected sensors',
        'entity_control': 'Entity Control',
        'entities_to_control': 'Entities to control based on timer',
        'search_entities': '🔍 Search entities...',
        'entities_help': '⚡ Select entities that will be automatically turned on/off according to the schedule',
        'additional_settings': 'Additional Settings',
        'save_timer_settings': '💾 Save timer settings in browser',
        'save_settings_help': '💡 If checked, your timer settings will be saved even after refreshing the page or closing the browser',
        'card_ready': '✨ Your card is ready! The timer will automatically control your selected entities based on your schedule and home presence.',
        'loading_entities': 'Loading Home Assistant entities...',
        'no_suitable_sensors': 'No suitable sensors found',
        'no_controllable_entities': 'No controllable entities found'
      },
      he: {
        'card_configuration': '🕐 הגדרות כרטיס טיימר 24 שעות',
        'configure_timer': 'הגדר את הטיימר שלך עם שליטה אוטומטית בישויות',
        'card_title': 'כותרת הכרטיס',
        'enter_card_title': 'הזן כותרת לכרטיס',
        'title_help': 'הכותרת שתוצג בחלק העליון של הכרטיס',
        'home_presence_settings': 'הגדרות נוכחות בבית',
        'sensors_for_home': 'סנסורים לזיהוי נוכחות בבית',
        'sensors_help': '💡 בחר סנסורים שמציינים שאתה נמצא בבית (person, device_tracker, binary_sensor, וכו\')',
        'home_detection_logic': 'לוגיקת זיהוי נוכחות בבית',
        'or_logic': '🔀 OR - לפחות סנסור אחד חייב להיות פעיל',
        'and_logic': '🔗 AND - כל הסנסורים חייבים להיות פעילים',
        'logic_help': '🤔 איך לקבוע אם אתה בבית על בסיס הסנסורים הנבחרים',
        'entity_control': 'שליטה בישויות',
        'entities_to_control': 'ישויות לשליטה על פי הטיימר',
        'search_entities': '🔍 חפש ישויות...',
        'entities_help': '⚡ בחר ישויות שיודלקו/יכבו אוטומטית לפי הלוח הזמנים',
        'additional_settings': 'הגדרות נוספות',
        'save_timer_settings': '💾 שמור הגדרות טיימר בדפדפן',
        'save_settings_help': '💡 אם מסומן, ההגדרות שלך יישמרו גם אחרי רענון הדף או סגירת הדפדפן',
        'card_ready': '✨ הכרטיס מוכן! הטיימר ישלט אוטומטית בישויות הנבחרות על פי הלוח הזמנים ונוכחותך בבית.',
        'loading_entities': 'טוען ישויות Home Assistant...',
        'no_suitable_sensors': 'לא נמצאו סנסורים מתאימים',
        'no_controllable_entities': 'לא נמצאו ישויות לשליטה'
      }
    };

    const lang = this.language || 'en';
    return translations[lang]?.[key] || translations['en'][key] || key;
  }

  setConfig(config) {
    this.config = { ...config };
    this.render();
  }

  set hass(hass) {
    this._hass = hass;
    if (this._hass) {
      try {
        this.render();
      } catch (error) {
        console.error('Timer Card Editor: Error in hass setter:', error);
      }
    }
  }

  get hass() {
    return this._hass;
  }

  configChanged() {
    const event = new CustomEvent('config-changed', {
      detail: { config: this.config },
      bubbles: true,
      composed: true
    });
    this.dispatchEvent(event);
  }

  render() {
    if (!this._hass) {
      this.innerHTML = `
        <div class="loading">
          <div class="spinner"></div>
          <p>Loading Home Assistant entities...</p>
        </div>
      `;
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

    this.innerHTML = `
      <style>
        .card-config {
          display: flex;
          flex-direction: column;
          gap: 20px;
          padding: 20px;
          background: var(--card-background-color);
          border-radius: 8px;
          max-width: 600px;
          margin: 0 auto;
        }
        
        .config-header {
          text-align: center;
          margin-bottom: 20px;
        }
        
        .config-header h2 {
          margin: 0 0 8px 0;
          color: var(--primary-text-color);
          font-size: 24px;
        }
        
        .config-header p {
          margin: 0;
          color: var(--secondary-text-color);
          font-size: 14px;
        }
        
        .loading {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 40px;
          gap: 16px;
        }
        
        .spinner {
          width: 32px;
          height: 32px;
          border: 3px solid var(--divider-color);
          border-top: 3px solid var(--primary-color);
          border-radius: 50%;
          animation: spin 1s linear infinite;
        }
        
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        
        .config-row {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }
        
        label {
          font-weight: 600;
          color: var(--primary-text-color);
          font-size: 16px;
        }
        
        input[type="text"], select {
          padding: 12px 16px;
          border: 2px solid var(--divider-color);
          border-radius: 8px;
          background: var(--card-background-color);
          color: var(--primary-text-color);
          font-size: 14px;
          transition: border-color 0.2s;
        }
        
        input[type="text"]:focus, select:focus {
          outline: none;
          border-color: var(--primary-color);
        }
        
        .entity-search {
          margin-bottom: 12px;
        }
        
        .entity-list {
          max-height: 300px;
          overflow-y: auto;
          border: 2px solid var(--divider-color);
          border-radius: 8px;
          background: var(--card-background-color);
        }
        
        .entity-item {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 12px 16px;
          border-bottom: 1px solid var(--divider-color);
          transition: background-color 0.2s;
          cursor: pointer;
        }
        
        .entity-item:hover {
          background: var(--secondary-background-color, rgba(0,0,0,0.05));
        }
        
        .entity-item.selected {
          background: var(--primary-color-light, rgba(25, 118, 210, 0.1));
          border-left: 4px solid var(--primary-color);
        }
        
        .entity-item:last-child {
          border-bottom: none;
        }
        
        .entity-info {
          display: flex;
          align-items: center;
          gap: 12px;
          flex: 1;
        }
        
        .entity-icon {
          font-size: 20px;
          width: 24px;
          text-align: center;
        }
        
        .entity-details {
          display: flex;
          flex-direction: column;
          gap: 2px;
        }
        
        .entity-name {
          font-weight: 500;
          color: var(--primary-text-color);
          font-size: 14px;
        }
        
        .entity-id {
          font-size: 12px;
          color: var(--secondary-text-color);
          font-family: monospace;
        }
        
        .entity-state {
          font-size: 12px;
          font-weight: 500;
          padding: 4px 8px;
          border-radius: 12px;
          background: var(--divider-color);
          color: var(--secondary-text-color);
        }
        
        .entity-state.active {
          background: var(--success-color, #4caf50);
          color: white;
        }
        
        .no-entities {
          padding: 20px;
          text-align: center;
          color: var(--secondary-text-color);
          font-style: italic;
        }
        
        .help-text {
          font-size: 13px;
          color: var(--secondary-text-color);
          line-height: 1.4;
          margin-top: 8px;
          padding: 8px 12px;
          background: var(--secondary-background-color, rgba(0,0,0,0.05));
          border-radius: 6px;
          border-left: 3px solid var(--primary-color);
        }
        
        .checkbox-container {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 16px;
          background: var(--secondary-background-color, rgba(0,0,0,0.05));
          border-radius: 8px;
        }
        
        .checkbox-container input[type="checkbox"] {
          width: 18px;
          height: 18px;
          margin: 0;
        }
        
        .checkbox-container label {
          font-weight: normal;
          font-size: 14px;
          cursor: pointer;
        }
        
        .section-title {
          font-size: 18px;
          font-weight: 600;
          color: var(--primary-text-color);
          margin: 24px 0 16px 0;
          padding: 0 0 8px 0;
          border-bottom: 2px solid var(--primary-color);
          display: flex;
          align-items: center;
          gap: 8px;
        }
        
        .section-title::before {
          content: "▶";
          color: var(--primary-color);
          font-size: 14px;
        }
        
        .config-footer {
          margin-top: 24px;
          padding: 16px;
          background: linear-gradient(135deg, var(--primary-color-light, rgba(25, 118, 210, 0.1)), var(--accent-color-light, rgba(255, 193, 7, 0.1)));
          border-radius: 8px;
          border: 1px solid var(--primary-color-light, rgba(25, 118, 210, 0.2));
        }
        
        .config-footer p {
          margin: 0;
          color: var(--primary-text-color);
          font-size: 14px;
          text-align: center;
          font-weight: 500;
        }
      </style>
      
      <div class="card-config">
        <div class="config-header">
          <h2>${this.translate('card_configuration')}</h2>
          <p>${this.translate('configure_timer')}</p>
        </div>

        <div class="config-row">
          <label for="title">Card Title</label>
          <input
            type="text"
            id="title"
            value="${this.config.title || '24 Hour Timer'}"
            placeholder="Enter card title"
          />
          <div class="help-text">The title displayed at the top of the card</div>
        </div>
        
        <div class="section-title">Home Presence Settings</div>
        
        <div class="config-row">
          <label>Sensors for home presence detection</label>
          <div class="entity-list" id="sensor-list">
            ${sensors.length > 0 ? sensors
              .filter(entityId => !this.entityFilter || 
                entityId.toLowerCase().includes(this.entityFilter.toLowerCase()) ||
                (this._hass.states[entityId]?.attributes?.friendly_name || '').toLowerCase().includes(this.entityFilter.toLowerCase())
              )
              .map(entityId => {
              const entity = this._hass.states[entityId];
              const isChecked = (this.config.home_sensors || []).includes(entityId);
              const friendlyName = entity?.attributes?.friendly_name || entityId;
              const domain = entityId.split('.')[0];
              const icon = this.getEntityIcon(domain);
              
              return `
                <div class="entity-item ${isChecked ? 'selected' : ''}">
                  <input
                    type="checkbox"
                    ${isChecked ? 'checked' : ''}
                    data-entity="${entityId}"
                    data-type="sensor"
                  />
                  <div class="entity-info">
                    <span class="entity-icon">${icon}</span>
                    <div class="entity-details">
                      <span class="entity-name">${friendlyName}</span>
                      <span class="entity-id">${entityId}</span>
                    </div>
                  </div>
                  <span class="entity-state ${entity?.state === 'on' || entity?.state === 'home' ? 'active' : ''}">${entity?.state || 'unavailable'}</span>
                </div>
              `;
            }).join('') : '<div class="no-entities">No suitable sensors found</div>'}
          </div>
          <div class="help-text">💡 Select sensors that indicate when you are at home (person, device_tracker, binary_sensor, etc.)</div>
        </div>
        
        <div class="config-row">
          <label for="home-logic">Home detection logic</label>
          <select id="home-logic">
            <option value="OR" ${this.config.home_logic === 'OR' || !this.config.home_logic ? 'selected' : ''}>
              🔀 OR - At least one sensor must be active
            </option>
            <option value="AND" ${this.config.home_logic === 'AND' ? 'selected' : ''}>
              🔗 AND - All sensors must be active
            </option>
          </select>
          <div class="help-text">🤔 How to determine if you are at home based on the selected sensors</div>
        </div>
        
        <div class="section-title">Entity Control</div>
        
        <div class="config-row">
          <label>Entities to control based on timer</label>
          <div class="entity-search">
            <input
              type="text"
              id="entity-filter"
              placeholder="🔍 Search entities..."
            />
          </div>
          <div class="entity-list" id="entity-list">
            ${controllableEntities.length > 0 ? controllableEntities
              .filter(entityId => !this.entityFilter || 
                entityId.toLowerCase().includes(this.entityFilter.toLowerCase()) ||
                (this._hass.states[entityId]?.attributes?.friendly_name || '').toLowerCase().includes(this.entityFilter.toLowerCase())
              )
              .map(entityId => {
              const entity = this._hass.states[entityId];
              const isChecked = (this.config.entities || []).includes(entityId);
              const friendlyName = entity?.attributes?.friendly_name || entityId;
              const domain = entityId.split('.')[0];
              const icon = this.getEntityIcon(domain);
              
              return `
                <div class="entity-item ${isChecked ? 'selected' : ''}">
                  <input
                    type="checkbox"
                    ${isChecked ? 'checked' : ''}
                    data-entity="${entityId}"
                    data-type="entity"
                  />
                  <div class="entity-info">
                    <span class="entity-icon">${icon}</span>
                    <div class="entity-details">
                      <span class="entity-name">${friendlyName}</span>
                      <span class="entity-id">${entityId}</span>
                    </div>
                  </div>
                  <span class="entity-state ${entity?.state === 'on' ? 'active' : ''}">${entity?.state || 'unavailable'}</span>
                </div>
              `;
            }).join('') : '<div class="no-entities">No controllable entities found</div>'}
          </div>
          <div class="help-text">⚡ Select entities that will be automatically turned on/off according to the schedule</div>
        </div>
        
        <div class="section-title">Additional Settings</div>
        
        <div class="checkbox-container">
          <input
            type="checkbox"
            id="save-state"
            ${this.config.save_state !== false ? 'checked' : ''}
          />
          <label for="save-state">💾 Save timer settings in browser</label>
        </div>
        <div class="help-text">💡 If checked, your timer settings will be saved even after refreshing the page or closing the browser</div>
        
        <div class="config-footer">
          <p>✨ Your card is ready! The timer will automatically control your selected entities based on your schedule and home presence.</p>
        </div>
      </div>
    `;

    this.addEventListeners();
  }

  getEntityIcon(domain) {
    const icons = {
      'person': '👤',
      'device_tracker': '📱',
      'binary_sensor': '🔘',
      'sensor': '📊',
      'input_boolean': '🔘',
      'light': '💡',
      'switch': '🔌',
      'fan': '🌀',
      'climate': '🌡️',
      'media_player': '📺',
      'cover': '🪟',
      'default': '⚙️'
    };
    return icons[domain] || icons.default;
  }

  addEventListeners() {
    // Title
    const titleElement = this.querySelector('#title');
    if (titleElement) {
      titleElement.addEventListener('input', (e) => {
        this.config = { ...this.config, title: e.target.value };
        this.configChanged();
      });
    }

    // Home logic
    const homeLogicElement = this.querySelector('#home-logic');
    if (homeLogicElement) {
      homeLogicElement.addEventListener('change', (e) => {
        this.config = { ...this.config, home_logic: e.target.value };
        this.configChanged();
      });
    }

    // Save state
    const saveStateElement = this.querySelector('#save-state');
    if (saveStateElement) {
      saveStateElement.addEventListener('change', (e) => {
        this.config = { ...this.config, save_state: e.target.checked };
        this.configChanged();
      });
    }

    // Entity filter
    const entityFilterElement = this.querySelector('#entity-filter');
    if (entityFilterElement) {
      entityFilterElement.addEventListener('input', (e) => {
        this.entityFilter = e.target.value;
        this.render();
      });
    }

    // Sensor checkboxes
    const sensorCheckboxes = this.querySelectorAll('#sensor-list input[type="checkbox"]');
    sensorCheckboxes.forEach(checkbox => {
      checkbox.addEventListener('change', (e) => {
        const entityId = e.target.dataset.entity;
        let homeSensors = [...(this.config.home_sensors || [])];
        
        if (e.target.checked) {
          if (!homeSensors.includes(entityId)) {
            homeSensors.push(entityId);
          }
        } else {
          homeSensors = homeSensors.filter(id => id !== entityId);
        }
        
        this.config = { ...this.config, home_sensors: homeSensors };
        this.configChanged();
      });
    });

    // Entity checkboxes
    const entityCheckboxes = this.querySelectorAll('#entity-list input[type="checkbox"]');
    entityCheckboxes.forEach(checkbox => {
      checkbox.addEventListener('change', (e) => {
        const entityId = e.target.dataset.entity;
        let entities = [...(this.config.entities || [])];
        
        if (e.target.checked) {
          if (!entities.includes(entityId)) {
            entities.push(entityId);
          }
        } else {
          entities = entities.filter(id => id !== entityId);
        }
        
        this.config = { ...this.config, entities: entities };
        this.configChanged();
      });
    });
  }
}

customElements.define('timer-24h-card-editor', Timer24HCardEditor);