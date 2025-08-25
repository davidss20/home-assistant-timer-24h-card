// Timer 24H Card for Home Assistant
// Version 2.1.0

class Timer24HCard extends HTMLElement {

  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this.timeSlots = this.initializeTimeSlots();
    this.currentTime = new Date();
    this.isAtHome = false;
    this.lastControlledStates = new Map();
    this.updateInterval = null;
    this.config = null;
    this._hass = null;
    this._layout = null;
    
    // Initialize layout property immediately
    this.layout = {
      grid_rows: 3,
      grid_columns: 3,
      grid_min_rows: 3,
      grid_min_columns: 3
    };
  }

  // Home Assistant required methods
  static async getConfigElement() {
    // Ensure editor is loaded
    if (!customElements.get('timer-24h-card-editor')) {
      // Load editor inline if not already defined
      await import('./timer-24h-card-editor.js').catch(() => {
        console.warn('Timer Card: Loading editor inline...');
        // Define editor inline as fallback
        class Timer24HCardEditor extends HTMLElement {
          setConfig(config) {
            this._config = config || {};
            this.innerHTML = `
              <div style="padding: 16px;">
                <h3>Timer 24H Card Configuration</h3>
                <p>Basic configuration (full editor loading...)</p>
                <label>Title: <input type="text" value="${config.title || 'Timer 24H'}" /></label>
              </div>
            `;
          }
          set hass(hass) { this._hass = hass; }
        }
        if (!customElements.get('timer-24h-card-editor')) {
          customElements.define('timer-24h-card-editor', Timer24HCardEditor);
        }
      });
    }
    return document.createElement('timer-24h-card-editor');
  }

  static getStubConfig() {
    return {
      title: 'Timer 24H',
      home_logic: 'OR',
      entities: [],
      home_sensors: [],
      save_state: false,
      storage_entity_id: '',
      auto_create_helper: true,
      allow_local_fallback: true
    };
  }

  // Legacy Masonry layout support
  getCardSize() {
    return 3;
  }

  // Grid layout support - NEW Home Assistant sections
  static getLayoutOptions() {
    return {
      grid_rows: 3,
      grid_columns: 3,
      grid_min_rows: 3,
      grid_min_columns: 3
    };
  }

  // Layout property for grid sections
  get layout() {
    return {
      grid_rows: 3,
      grid_columns: 3,
      grid_min_rows: 3,
      grid_min_columns: 3
    };
  }

  set layout(value) {
    // Accept layout changes from Home Assistant
    if (value && typeof value === 'object') {
      this._layout = { ...value };
    } else {
      // Fallback to default layout
      this._layout = {
        grid_rows: 3,
        grid_columns: 3,
        grid_min_rows: 3,
        grid_min_columns: 3
      };
    }
  }

  // Additional layout methods for compatibility
  getLayoutOptions() {
    return {
      grid_rows: 3,
      grid_columns: 3,
      grid_min_rows: 3,
      grid_min_columns: 3
    };
  }

  setConfig(config) {
    if (!config) {
      throw new Error('Invalid configuration');
    }
    
    this.config = {
      title: 'טיימר 24 שעות',
      home_sensors: [],
      home_logic: 'OR',
      entities: [],
      save_state: true,
      ...config
    };
    
    // Load saved state asynchronously
    this.loadSavedState().then(() => {
      if (this.shadowRoot) {
        this.render();
      }
    }).catch(error => {
      console.error('Timer Card: Error loading saved state:', error);
      // Ensure timeSlots is still an array even if loading fails
      if (!Array.isArray(this.timeSlots)) {
        this.timeSlots = this.initializeTimeSlots();
      }
      if (this.shadowRoot) {
    this.render();
      }
    });
  }

    set hass(hass) {
    const wasHassAvailable = !!this._hass;
    this._hass = hass;
    
    if (hass) {
      const oldHomeStatus = this.isAtHome;
      this.checkHomeStatus();
      
      if (oldHomeStatus !== this.isAtHome) {
        this.controlEntities();
      }
      
      this.updateCurrentTime();
      
      // אם hass לא היה זמין קודם, טען נתונים שמורים עכשיו
      if (!wasHassAvailable && this.config?.save_state) {
        this.loadSavedState().then(() => {
          this.render();
        }).catch(error => {
          console.error('Timer Card: Error loading saved state on hass update:', error);
          this.render();
        });
      } else {
        this.render();
      }
    }
  }



  get hass() {
    return this._hass;
  }

  connectedCallback() {
    super.connectedCallback && super.connectedCallback();
    this.startTimer();
    
    // הגדר סינכרון אוטומטי
    this.setupAutoSync();
    
    // Ensure layout is set for grid sections
    if (!this.layout) {
      this.layout = {
        grid_rows: 3,
        grid_columns: 3,
        grid_min_rows: 3,
        grid_min_columns: 3
      };
    }
  }

  setupAutoSync() {
    // סינכרון כל דקה עם השרת
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
    }
    
    this.syncInterval = setInterval(async () => {
      if (this.config?.save_state && this.hass && this.hass.connection) {
        try {
          const storageKey = `timer_24h_card_${this.generateCardId()}`;
          const result = await this.hass.connection.sendMessagePromise({
            type: 'frontend/get_user_data',
            key: storageKey
          });
          
          if (result && result.value && result.value.timeSlots) {
            // בדוק אם יש שינויים מהשרת
            const serverDataStr = JSON.stringify(result.value.timeSlots);
            const localDataStr = JSON.stringify(this.timeSlots);
            
            if (serverDataStr !== localDataStr && result.value.timestamp > (this.lastSyncTime || 0)) {
              console.log('Timer Card: Syncing changes from server...');
              this.timeSlots = result.value.timeSlots;
              this.lastSyncTime = result.value.timestamp;
              this.render();
            }
          }
        } catch (error) {
          // שקט - לא צריך לוג לשגיאות סינכרון
        }
      }
    }, 60000); // כל דקה
  }

  disconnectedCallback() {
    super.disconnectedCallback && super.disconnectedCallback();
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
    }
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
    }
  }

  // Additional methods for Home Assistant compatibility
  updated(changedProperties) {
    super.updated && super.updated(changedProperties);
  }

  firstUpdated(changedProperties) {
    super.firstUpdated && super.firstUpdated(changedProperties);
  }

  initializeTimeSlots() {
    const slots = [];
    for (let hour = 0; hour < 24; hour++) {
      slots.push({ hour, minute: 0, isActive: false });
      slots.push({ hour, minute: 30, isActive: false });
    }
    console.log('Timer Card: Initialized timeSlots with', slots.length, 'slots');
    return slots;
  }

  startTimer() {
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
    }
    
    this.updateInterval = setInterval(() => {
      this.updateCurrentTime();
    }, 120000); // Check every 2 minutes
  }



  checkHomeStatus() {
    if (!this.hass || !this.config.home_sensors?.length) {
      this.isAtHome = true;
      return;
    }

    const logic = this.config.home_logic || 'OR';
    let homeStatus = logic === 'AND';
    
    for (const sensorId of this.config.home_sensors) {
      const sensor = this.hass.states[sensorId];
      if (!sensor) continue;
      
      let isTrue;
      
      if (sensorId === 'binary_sensor.jewish_calendar_issur_melacha_in_effect') {
        isTrue = sensor.state.toLowerCase() === 'off';
      } else {
        isTrue = ['on', 'home', 'true', '1', 'yes'].includes(sensor.state.toLowerCase());
      }
      
      if (logic === 'OR') {
        if (isTrue) {
          homeStatus = true;
          break;
        }
      } else {
        if (!isTrue) {
          homeStatus = false;
          break;
        }
      }
    }
    
    this.isAtHome = homeStatus;
  }

  updateCurrentTime() {
    const newTime = new Date();
    const oldHour = this.currentTime.getHours();
    const oldMinute = Math.floor(this.currentTime.getMinutes() / 30) * 30;
    const newHour = newTime.getHours();
    const newMinute = Math.floor(newTime.getMinutes() / 30) * 30;
    
    this.currentTime = newTime;
    
    if (oldHour !== newHour || oldMinute !== newMinute) {
      console.log(`Timer Card: Time segment changed to ${newHour}:${newMinute === 0 ? '00' : '30'}`);
      this.controlEntities();
    }
  }

  controlEntities() {
    if (!this.hass || !this.config.entities?.length || !this.isAtHome) {
      return;
    }
    
    // Ensure timeSlots is an array
    if (!Array.isArray(this.timeSlots)) {
      this.timeSlots = this.initializeTimeSlots();
    }

    const currentHour = this.currentTime.getHours();
    const currentMinute = this.currentTime.getMinutes();
    const minute = currentMinute < 30 ? 0 : 30;
    
    const currentSlot = this.timeSlots.find(slot => 
      slot.hour === currentHour && slot.minute === minute
    );
    
    const shouldBeOn = currentSlot?.isActive || false;
    
    for (const entityId of this.config.entities) {
      const entity = this.hass.states[entityId];
      if (!entity) continue;
      
      const currentState = entity.state === 'on';
      const lastControlledState = this.lastControlledStates.get(entityId);
      
      if (currentState !== shouldBeOn && lastControlledState !== shouldBeOn) {
        try {
          this.hass.callService('homeassistant', shouldBeOn ? 'turn_on' : 'turn_off', {
          entity_id: entityId
        });
            console.log(`Timer Card: ${shouldBeOn ? 'Turned on' : 'Turned off'} ${entityId}`);
          
          this.lastControlledStates.set(entityId, shouldBeOn);
          
          setTimeout(() => {
            if (this.lastControlledStates.get(entityId) === shouldBeOn) {
              this.lastControlledStates.delete(entityId);
            }
          }, 30000);
          
        } catch (error) {
          console.error(`Timer Card: Failed to control ${entityId}:`, error);
        }
      }
    }
  }

  toggleTimeSlot(hour, minute) {
    // Ensure timeSlots is an array
    if (!Array.isArray(this.timeSlots)) {
      this.timeSlots = this.initializeTimeSlots();
    }
    
    const slot = this.timeSlots.find(s => s.hour === hour && s.minute === minute);
    if (slot) {
      slot.isActive = !slot.isActive;
      this.saveState();
      this.lastControlledStates.clear();
      this.controlEntities();
      this.render();
    }
  }

  async saveState() {
    if (!this.config.save_state) return;
    
    console.log('Timer Card: Saving state...');
    
    try {
      // שימוש ב-Home Assistant Frontend Storage - מסונכרן אוטומטית!
      const storageKey = `timer_24h_card_${this.generateCardId()}`;
      const data = {
        timeSlots: this.timeSlots,
        timestamp: Date.now(),
        version: '2.1.0'
      };
      
      // שמירה דרך ה-Home Assistant connection
      if (this.hass && this.hass.connection) {
        try {
          this.lastSyncTime = data.timestamp; // שמור זמן הסינכרון
          await this.hass.connection.sendMessagePromise({
            type: 'frontend/set_user_data',
            key: storageKey,
            value: data
          });
          console.log('✅ Timer Card: State saved to Home Assistant user data (synced across devices)');
          return;
        } catch (frontendError) {
          console.warn('Timer Card: Frontend storage failed, trying alternative method:', frontendError);
        }
      }
      
      // שיטה חלופית: שימוש ב-persistent_notification כ-storage
      if (this.hass) {
        try {
          const notificationId = `timer_24h_card_data_${this.generateCardId()}`;
          
          // מחק notification קודם אם קיים
          try {
            await this.hass.callService('persistent_notification', 'dismiss', {
              notification_id: notificationId
            });
          } catch (e) {
            // לא נורא אם לא קיים
          }
          
          // צור notification חדש עם הנתונים (מוסתר)
          await this.hass.callService('persistent_notification', 'create', {
            notification_id: notificationId,
            title: `Timer Card Data - ${this.config.title}`,
            message: JSON.stringify(data),
            // הוסף metadata שמסמן שזה נתונים פנימיים
            data: {
              timer_card_internal: true,
              hidden: true
            }
          });
          
          console.log('✅ Timer Card: State saved via persistent notification (synced)');
          return;
          
        } catch (notificationError) {
          console.warn('Timer Card: Notification storage failed:', notificationError);
        }
      }
      
      // Fallback ל-localStorage
      localStorage.setItem(`timer-24h-${this.config.title}`, JSON.stringify(this.timeSlots));
      console.log('💾 Timer Card: Fallback to localStorage (device-only)');
      
    } catch (error) {
      console.error('Timer Card: All save methods failed:', error);
      // Last resort
      localStorage.setItem(`timer-24h-${this.config.title}`, JSON.stringify(this.timeSlots));
    }
  }





  async loadSavedState() {
    if (!this.config?.save_state) return;
    
    console.log('Timer Card: Loading saved state...');
    
    if (this.hass) {
      try {
        const storageKey = `timer_24h_card_${this.generateCardId()}`;
        
        // נסה לטעון מ-Home Assistant Frontend Storage
        if (this.hass.connection) {
          try {
            const result = await this.hass.connection.sendMessagePromise({
              type: 'frontend/get_user_data',
              key: storageKey
            });
            
            if (result && result.value && result.value.timeSlots) {
              this.timeSlots = result.value.timeSlots;
              console.log(`✅ Timer Card: State loaded from Home Assistant user data (${this.timeSlots.length} slots)`);
              return;
            }
          } catch (frontendError) {
            console.warn('Timer Card: Frontend storage load failed:', frontendError);
          }
        }
        
        // שיטה חלופית: טען מ-persistent_notification
        try {
          const notificationId = `timer_24h_card_data_${this.generateCardId()}`;
          
          // בדוק אם יש notification עם הנתונים
          const notifications = this.hass.states['persistent_notification.' + notificationId];
          if (notifications && notifications.attributes && notifications.attributes.message) {
            const data = JSON.parse(notifications.attributes.message);
            if (data.timeSlots && Array.isArray(data.timeSlots)) {
              this.timeSlots = data.timeSlots;
              console.log(`✅ Timer Card: State loaded from persistent notification (${this.timeSlots.length} slots)`);
              return;
            }
          }
        } catch (notificationError) {
          console.warn('Timer Card: Notification load failed:', notificationError);
        }
        
      } catch (error) {
        console.warn('Timer Card: Home Assistant load failed:', error);
      }
    }
    
    // Fallback ל-localStorage
    console.log('Timer Card: Loading from localStorage fallback...');
    try {
      const saved = localStorage.getItem(`timer-24h-${this.config.title}`);
      if (saved) {
        const parsedData = JSON.parse(saved);
        if (Array.isArray(parsedData)) {
          this.timeSlots = parsedData;
          console.log(`✅ Timer Card: State loaded from localStorage (${this.timeSlots.length} slots)`);
          return;
        }
      }
    } catch (error) {
      console.warn('Timer Card: localStorage load failed:', error);
    }
    
    console.log('Timer Card: No saved data found, using defaults');
  }

  generateCardId() {
    // Generate a unique ID based on the card title and configuration
    const title = this.config.title || 'default';
    
    // Extract only English letters and numbers, ignore Hebrew and special chars
    const englishOnly = title.match(/[a-zA-Z0-9]/g);
    
    if (englishOnly && englishOnly.length > 0) {
      return englishOnly.join('').toLowerCase();
    }
    
    // If no English chars found, use a simple hash of the title
    let hash = 0;
    for (let i = 0; i < title.length; i++) {
      const char = title.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    
    return 'timer_' + Math.abs(hash).toString();
  }

  // Persistence helper methods for editor
  static async ensureStorageEntity(hass, desiredId) {
    try {
      const entityId = desiredId || `input_text.timer_24h_card_${Date.now()}`;
      
      // Check if entity already exists
      if (hass.states[entityId]) {
        return entityId;
      }

      // Try to create via WebSocket API
      try {
        await hass.callWS({
          type: 'config/input_text/create',
          name: 'Timer 24H Card Storage',
          max: 10000,
          initial: '{}',
          entity_id: entityId.replace('input_text.', '')
        });
        
        // Wait for entity to be available
        await new Promise(resolve => setTimeout(resolve, 1000));
        return entityId;
        
      } catch (wsError) {
        // Try alternative API
        await hass.callWS({
          type: 'config/helpers/create',
          domain: 'input_text',
          data: {
            name: 'Timer 24H Card Storage',
            max: 10000,
            initial: '{}'
          }
        });
        
        await new Promise(resolve => setTimeout(resolve, 1000));
        return entityId;
      }
      
    } catch (error) {
      throw new Error(`Cannot create storage entity: ${error.message}. Please create an input_text helper manually.`);
    }
  }

  static async readStorage(hass, entityId) {
    try {
      const entity = hass.states[entityId];
      if (!entity) {
        throw new Error(`Storage entity ${entityId} not found`);
      }
      
      const data = entity.state;
      if (!data || data === 'unknown' || data === '') {
        return {};
      }
      
      return JSON.parse(data);
    } catch (error) {
      console.warn('Timer Card: Failed to read storage:', error);
      return {};
    }
  }

  static async writeStorage(hass, entityId, data) {
    try {
      const jsonData = JSON.stringify(data);
      
      // Check size limit (8KB)
      if (jsonData.length > 8192) {
        throw new Error('Data too large (>8KB). Please reduce configuration size.');
      }
      
      await hass.callService('input_text', 'set_value', {
        entity_id: entityId,
        value: jsonData
      });
      
    } catch (error) {
      throw new Error(`Failed to write storage: ${error.message}`);
    }
  }





  createSectorPath(hour, totalSectors, innerRadius, outerRadius, centerX, centerY) {
    const startAngle = (hour * 360 / totalSectors - 90) * (Math.PI / 180);
    const endAngle = ((hour + 1) * 360 / totalSectors - 90) * (Math.PI / 180);
    
    const x1 = centerX + innerRadius * Math.cos(startAngle);
    const y1 = centerY + innerRadius * Math.sin(startAngle);
    const x2 = centerX + outerRadius * Math.cos(startAngle);
    const y2 = centerY + outerRadius * Math.sin(startAngle);
    const x3 = centerX + outerRadius * Math.cos(endAngle);
    const y3 = centerY + outerRadius * Math.sin(endAngle);
    const x4 = centerX + innerRadius * Math.cos(endAngle);
    const y4 = centerY + innerRadius * Math.sin(endAngle);
    
    const largeArcFlag = endAngle - startAngle <= Math.PI ? 0 : 1;
    
    return `M ${x1} ${y1} L ${x2} ${y2} A ${outerRadius} ${outerRadius} 0 ${largeArcFlag} 1 ${x3} ${y3} L ${x4} ${y4} A ${innerRadius} ${innerRadius} 0 ${largeArcFlag} 0 ${x1} ${y1}`;
  }

  getTextPosition(hour, totalSectors, radius, centerX, centerY) {
    const angle = ((hour + 0.5) * 360 / totalSectors - 90) * (Math.PI / 180);
    const x = centerX + radius * Math.cos(angle);
    const y = centerY + radius * Math.sin(angle);
    return { x, y };
  }

  getTimeLabel(hour, minute) {
    return `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
  }

  render() {
    if (!this.config) return;
    
    // Ensure timeSlots is always an array
    if (!Array.isArray(this.timeSlots)) {
      this.timeSlots = this.initializeTimeSlots();
    }

    const centerX = 200;
    const centerY = 200;
    const outerRadius = 180;
    const innerRadius = 50;
    
    // בדוק אם הטיימר פעיל עכשיו
    const currentHour = this.currentTime.getHours();
    const currentMinute = this.currentTime.getMinutes();
    const minute = currentMinute < 30 ? 0 : 30;
    
    const currentSlot = this.timeSlots.find(slot => 
      slot.hour === currentHour && slot.minute === minute
    );
    
    const isCurrentlyActive = currentSlot?.isActive || false;

        const sectors = Array.from({ length: 24 }, (_, hour) => {
      const middleRadius = (innerRadius + outerRadius) / 2;
      
      // חצי חיצוני (שעה מלאה - 00)
      const outerSectorPath = this.createSectorPath(hour, 24, middleRadius, outerRadius, centerX, centerY);
      const outerTextPos = this.getTextPosition(hour, 24, (middleRadius + outerRadius) / 2, centerX, centerY);
      const outerSlot = this.timeSlots.find(s => s.hour === hour && s.minute === 0);
      const outerIsActive = outerSlot?.isActive || false;
      const outerIsCurrent = this.currentTime.getHours() === hour && this.currentTime.getMinutes() < 30;
      
      // חצי פנימי (חצי שעה - 30)
      const innerSectorPath = this.createSectorPath(hour, 24, innerRadius, middleRadius, centerX, centerY);
      const innerTextPos = this.getTextPosition(hour, 24, (innerRadius + middleRadius) / 2, centerX, centerY);
      const innerSlot = this.timeSlots.find(s => s.hour === hour && s.minute === 30);
      const innerIsActive = innerSlot?.isActive || false;
      const innerIsCurrent = this.currentTime.getHours() === hour && this.currentTime.getMinutes() >= 30;
      
      // אינדיקטור שעה נוכחית
      let currentTimeIndicator = '';
      if (outerIsCurrent || innerIsCurrent) {
        const indicatorAngle = ((hour + 0.5) * 360 / 24 - 90) * (Math.PI / 180);
        const indicatorX = centerX + (outerRadius + 10) * Math.cos(indicatorAngle);
        const indicatorY = centerY + (outerRadius + 10) * Math.sin(indicatorAngle);
        
        currentTimeIndicator = `
          <circle cx="${indicatorX}" cy="${indicatorY}" r="4" 
                  fill="#ff6b6b" stroke="#ffffff" stroke-width="2">
            <animate attributeName="r" values="4;6;4" dur="2s" repeatCount="indefinite"/>
          </circle>
        `;
      }
      
      return `
        <!-- חצי חיצוני (שעה מלאה) -->
        <path d="${outerSectorPath}" 
              fill="${outerIsActive ? '#10b981' : '#ffffff'}"
              stroke="${outerIsCurrent ? '#ff6b6b' : '#e5e7eb'}"
              stroke-width="${outerIsCurrent ? '3' : '1'}"
              style="cursor: pointer; transition: all 0.2s;"
              onclick="this.getRootNode().host.toggleTimeSlot(${hour}, 0)"/>
        <text x="${outerTextPos.x}" y="${outerTextPos.y + 2}" 
              text-anchor="middle" font-size="9" font-weight="bold"
              style="pointer-events: none; user-select: none;"
              fill="${outerIsActive ? '#ffffff' : '#374151'}">
          ${this.getTimeLabel(hour, 0)}
        </text>
        
        <!-- חצי פנימי (חצי שעה) -->
        <path d="${innerSectorPath}" 
              fill="${innerIsActive ? '#10b981' : '#f8f9fa'}"
              stroke="${innerIsCurrent ? '#ff6b6b' : '#e5e7eb'}"
              stroke-width="${innerIsCurrent ? '3' : '1'}"
              style="cursor: pointer; transition: all 0.2s;"
              onclick="this.getRootNode().host.toggleTimeSlot(${hour}, 30)"/>
        <text x="${innerTextPos.x}" y="${innerTextPos.y + 1}" 
              text-anchor="middle" font-size="7" font-weight="bold"
              style="pointer-events: none; user-select: none;"
              fill="${innerIsActive ? '#ffffff' : '#6b7280'}">
          ${this.getTimeLabel(hour, 30)}
        </text>
        
        ${currentTimeIndicator}
      `;
    }).join('');

    const dividerLines = Array.from({ length: 24 }, (_, i) => {
      const angle = (i * 360 / 24 - 90) * (Math.PI / 180);
      const xInner = centerX + innerRadius * Math.cos(angle);
      const yInner = centerY + innerRadius * Math.sin(angle);
      const xOuter = centerX + outerRadius * Math.cos(angle);
      const yOuter = centerY + outerRadius * Math.sin(angle);
      return `<line x1="${xInner}" y1="${yInner}" x2="${xOuter}" y2="${yOuter}" stroke="#e5e7eb" stroke-width="1"/>`;
    }).join('');

    this.shadowRoot.innerHTML = `
      <style>
        :host {
          display: block;
          font-family: var(--primary-font-family, sans-serif);
          position: relative;
          contain: layout style paint;
          margin: 8px;
        }
        
        .card {
          background: var(--card-background-color, #ffffff);
          border-radius: var(--ha-card-border-radius, 12px);
          box-shadow: var(--ha-card-box-shadow, 0 2px 8px rgba(0,0,0,0.1));
          padding: 0;
          overflow: hidden;
          height: calc(100% - 16px);
          min-height: 200px;
          display: flex;
          flex-direction: column;
          position: relative;
          z-index: 1;
          isolation: isolate;
          margin: 8px;
        }
        
        .header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 4px;
          padding: 4px 8px 0 8px;
        }
        
        .title {
          font-size: 1rem;
          font-weight: bold;
          color: var(--primary-text-color, #212121);
        }
        
        .status-container {
          display: flex;
          flex-direction: column;
          align-items: flex-end;
          gap: 2px;
        }
        
        .home-status {
          font-size: 0.7rem;
          text-align: center;
          margin: 0;
        }
        
        .sync-status {
          font-size: 0.6rem;
          text-align: center;
          margin: 0;
          opacity: 0.8;
          color: var(--secondary-text-color, #666);
        }
        
        .home-status.home {
          color: #10b981;
        }
        
        .home-status.away {
          color: #f59e0b;
        }
        
        .timer-container {
          display: flex;
          justify-content: center;
          margin: 0;
          padding: 0;
          flex: 1;
          min-height: 0;
        }
        
        .timer-svg {
          width: 100%;
          height: 100%;
          max-width: 100%;
          max-height: 100%;
          display: block;
        }
      </style>
      
      <div class="card">
        <div class="header">
          <div class="title">${this.config.title}</div>
          <div class="status-container">
            <div class="home-status ${this.isAtHome ? 'home' : 'away'}">
              ${this.isAtHome ? 'בבית' : 'מחוץ לבית'}
            </div>
            <div class="sync-status">
              ${this.hass && this.hass.connection ? '🌐 מסונכרן' : '💾 מקומי'}
            </div>
          </div>
        </div>
        
        <div class="timer-container">
          <svg class="timer-svg" viewBox="0 0 400 400">
            <!-- עיגולים חיצוניים -->
            <circle cx="${centerX}" cy="${centerY}" r="${outerRadius}" 
                    fill="none" stroke="#e5e7eb" stroke-width="2"/>
            <circle cx="${centerX}" cy="${centerY}" r="${innerRadius}" 
                    fill="none" stroke="#e5e7eb" stroke-width="2"/>
            <!-- עיגול אמצע המפריד בין חצי פנימי וחיצוני -->
            <circle cx="${centerX}" cy="${centerY}" r="${(innerRadius + outerRadius) / 2}" 
                    fill="none" stroke="#d1d5db" stroke-width="1.5"/>
            
            ${dividerLines}
            ${sectors}
            
            <!-- אינדיקטור מרכזי -->
            <circle cx="${centerX}" cy="${centerY}" r="45" 
                    fill="${isCurrentlyActive ? 'rgba(239, 68, 68, 0.1)' : 'rgba(107, 114, 128, 0.05)'}" 
                    stroke="${isCurrentlyActive ? 'rgba(239, 68, 68, 0.3)' : 'rgba(107, 114, 128, 0.2)'}" 
                    stroke-width="1"/>
            
            <text x="${centerX}" y="${centerY - 8}" 
                  text-anchor="middle" font-size="14" font-weight="bold"
                  fill="${isCurrentlyActive ? '#ef4444' : '#6b7280'}">
              ${isCurrentlyActive ? 'פעיל' : 'כבוי'}
            </text>
            
            <text x="${centerX}" y="${centerY + 8}" 
                  text-anchor="middle" font-size="10"
                  fill="${isCurrentlyActive ? '#ef4444' : '#6b7280'}">
              ${this.currentTime.getHours().toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}
            </text>
          </svg>
        </div>
      </div>
    `;
  }
}

// Register the custom element
customElements.define('timer-24h-card', Timer24HCard);

// Register card for HACS and Home Assistant UI
window.customCards = window.customCards || [];
window.customCards.push({
  type: 'timer-24h-card',
  name: 'Timer 24H Card',
  description: '24h timer with UI-based entity selection and automatic server sync',
  preview: true,
  documentationURL: 'https://github.com/davidss20/home-assistant-timer-card',
  configurable: true, // This tells HA that the card has a GUI editor
  // Grid layout support
  grid_options: {
    rows: 3,
    columns: 3,
    min_rows: 3,
    min_columns: 3
  }
});

// Ensure layout compatibility with Home Assistant grid sections
if (Timer24HCard && Timer24HCard.prototype) {
  Timer24HCard.prototype.getLayoutOptions = Timer24HCard.prototype.getLayoutOptions || function() {
    return {
      grid_rows: 3,
      grid_columns: 3,
      grid_min_rows: 3,
      grid_min_columns: 3
    };
  };

  // Static layout options for Home Assistant
  Timer24HCard.getLayoutOptions = Timer24HCard.getLayoutOptions || function() {
    return {
      grid_rows: 3,
      grid_columns: 3,
      grid_min_rows: 3,
      grid_min_columns: 3
    };
  };

  // Ensure layout property exists
  if (!Timer24HCard.prototype.hasOwnProperty('layout')) {
    Object.defineProperty(Timer24HCard.prototype, 'layout', {
      get: function() {
        return this._layout || {
          grid_rows: 3,
          grid_columns: 3,
          grid_min_rows: 3,
          grid_min_columns: 3
        };
      },
      set: function(value) {
        if (value && typeof value === 'object') {
          this._layout = { ...value };
        } else {
          this._layout = {
            grid_rows: 3,
            grid_columns: 3,
            grid_min_rows: 3,
            grid_min_columns: 3
          };
        }
      },
      enumerable: true,
      configurable: true
    });
  }
}

console.info(
  '%c  TIMER-24H-CARD  %c  Version 2.1.0 - Enhanced UI & Sync  ',
  'color: orange; font-weight: bold; background: black',
  'color: white; font-weight: bold; background: dimgray'
);

// Load editor component
(async () => {
  try {
    // Try to load external editor file
    await import('./timer-24h-card-editor.js');
  } catch (e) {
    console.warn('Timer Card: External editor not found, using inline editor');
    
    // Inline editor fallback
    class Timer24HCardEditor extends HTMLElement {
      constructor() {
        super();
        this.attachShadow({ mode: 'open' });
        this._config = {};
        this._hass = null;
      }

      setConfig(config) {
        this._config = {
          title: config?.title || 'Timer 24H',
          home_logic: config?.home_logic || 'OR',
          entities: config?.entities || [],
          home_sensors: config?.home_sensors || [],
          save_state: config?.save_state || false,
          storage_entity_id: config?.storage_entity_id || '',
          auto_create_helper: config?.auto_create_helper !== false,
          allow_local_fallback: config?.allow_local_fallback !== false
        };
        this.render();
      }

      set hass(hass) {
        this._hass = hass;
        this.render();
      }

      _handleChange(key, value) {
        this._config[key] = value;
        this.dispatchEvent(new CustomEvent('config-changed', {
          detail: { config: { ...this._config } },
          bubbles: true,
          composed: true
        }));
      }

      render() {
        if (!this.shadowRoot) return;

        this.shadowRoot.innerHTML = `
          <style>
            :host {
              display: block;
              padding: 16px;
              font-family: var(--primary-font-family, sans-serif);
            }
            .form-group {
              margin-bottom: 16px;
            }
            .form-label {
              display: block;
              margin-bottom: 4px;
              font-weight: 500;
            }
            .form-input, .form-select {
              width: 100%;
              padding: 8px;
              border: 1px solid #ccc;
              border-radius: 4px;
              font-size: 14px;
            }
            .toggle {
              display: flex;
              align-items: center;
              gap: 8px;
            }
          </style>
          
          <div class="form-group">
            <label class="form-label">Card Title</label>
            <input 
              type="text" 
              class="form-input" 
              value="${this._config.title}"
              id="title-input"
            />
          </div>

          <div class="form-group">
            <label class="form-label">Home Logic</label>
            <select 
              class="form-select"
              id="logic-select"
            >
              <option value="OR" ${this._config.home_logic === 'OR' ? 'selected' : ''}>OR - At least one sensor active</option>
              <option value="AND" ${this._config.home_logic === 'AND' ? 'selected' : ''}>AND - All sensors active</option>
            </select>
          </div>

          <div class="form-group">
            <div class="toggle">
              <input 
                type="checkbox" 
                id="save-state-checkbox"
                ${this._config.save_state ? 'checked' : ''}
              />
              <label class="form-label">Save state on server</label>
            </div>
          </div>

          <div class="form-group">
            <label class="form-label">Controlled Entities (comma separated)</label>
            <input 
              type="text" 
              class="form-input" 
              value="${this._config.entities.join(', ')}"
              id="entities-input"
              placeholder="switch.living_room, light.kitchen"
            />
          </div>

          <div class="form-group">
            <label class="form-label">Home Sensors (comma separated)</label>
            <input 
              type="text" 
              class="form-input" 
              value="${this._config.home_sensors.join(', ')}"
              id="sensors-input"
              placeholder="person.john, binary_sensor.motion"
            />
          </div>
        `;

        // Add event listeners
        const titleInput = this.shadowRoot.getElementById('title-input');
        const logicSelect = this.shadowRoot.getElementById('logic-select');
        const saveStateCheckbox = this.shadowRoot.getElementById('save-state-checkbox');
        const entitiesInput = this.shadowRoot.getElementById('entities-input');
        const sensorsInput = this.shadowRoot.getElementById('sensors-input');

        titleInput?.addEventListener('input', (e) => this._handleChange('title', e.target.value));
        logicSelect?.addEventListener('change', (e) => this._handleChange('home_logic', e.target.value));
        saveStateCheckbox?.addEventListener('change', (e) => this._handleChange('save_state', e.target.checked));
        entitiesInput?.addEventListener('input', (e) => this._handleChange('entities', e.target.value.split(',').map(s => s.trim()).filter(s => s)));
        sensorsInput?.addEventListener('input', (e) => this._handleChange('home_sensors', e.target.value.split(',').map(s => s.trim()).filter(s => s)));
      }

      connectedCallback() {
        this.render();
      }
    }

    // Register the inline editor
    if (!customElements.get('timer-24h-card-editor')) {
      customElements.define('timer-24h-card-editor', Timer24HCardEditor);
      console.info('Timer Card: Inline editor registered');
    }
  }
})();
