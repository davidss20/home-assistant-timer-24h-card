class Timer24HCard extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this.timeSlots = this.initializeTimeSlots();
    this.currentTime = new Date();
    this.isAtHome = false;
    this.lastControlledStates = new Map(); // Track last sent commands
    this.lastHomeStatus = undefined; // Track home status changes
  }

  initializeTimeSlots() {
    const slots = [];
    for (let hour = 0; hour < 24; hour++) {
      slots.push({ hour, minute: 0, isActive: false });
      slots.push({ hour, minute: 30, isActive: false });
    }
    return slots;
  }

  setConfig(config) {
    if (!config) {
      throw new Error('Invalid configuration');
    }
    
    this.config = {
      // Sensors for checking home presence
      home_sensors: config.home_sensors || [],
      // Entities to control
      entities: config.entities || [],
      // Card title
      title: config.title || '24 Hour Timer',
      // Whether to save settings in local storage
      save_state: config.save_state !== false,
      // Home presence logic
      home_logic: config.home_logic || 'OR',
      ...config
    };

    this.loadSavedState();
    this.render();
  }

  set hass(hass) {
    if (hass && hass.states) {
      try {
        const oldSensorStatus = this.checkSensorStatus();
        this._hass = hass;
        this.checkHomeStatus();
        
        // Update display and control when sensor status changes
        const newSensorStatus = this.checkSensorStatus();
        if (oldSensorStatus !== newSensorStatus) {
          this.updateDisplay();
          this.controlEntities();
        }
        
        this.updateCurrentTime();
      } catch (error) {
        console.error('Timer Card: Error in hass setter:', error);
      }
    } else {
      this._hass = hass;
    }
  }

  get hass() {
    return this._hass;
  }

  checkHomeStatus() {
    // Safety check: ensure hass and states are available
    if (!this._hass || !this._hass.states || !this.config.home_sensors.length) {
      this.isAtHome = true; // Default - at home
      return;
    }

    // Check if all conditions are met (AND) or at least one (OR)
    const logic = this.config.home_logic || 'OR';
    
    let homeStatus = logic === 'AND';
    
    for (const sensorId of this.config.home_sensors) {
      const sensor = this._hass.states[sensorId];
      if (!sensor) continue;
      
      let isTrue;
      
      // Special handling for jewish calendar sensor - ON means automation is allowed
      if (sensorId === 'binary_sensor.jewish_calendar_issur_melacha_in_effect') {
        isTrue = sensor.state.toLowerCase() === 'on';
        console.log(`Timer Card Debug: Jewish calendar sensor ${sensorId} state: ${sensor.state}, isTrue: ${isTrue}`);
      } else {
        // Regular sensors - ON means at home/present
        isTrue = ['on', 'home', 'true', '1', 'yes'].includes(sensor.state.toLowerCase());
      }
      
      if (logic === 'OR') {
        if (isTrue) {
          homeStatus = true;
          break;
        }
      } else { // AND
        if (!isTrue) {
          homeStatus = false;
          break;
        }
      }
    }
    
    this.isAtHome = homeStatus;
    
    // Debug logging (only when status changes)
    if (this.lastHomeStatus !== homeStatus) {
      console.log(`Timer Card - Home Status changed to: ${homeStatus ? 'At Home' : 'Away'}`);
      this.lastHomeStatus = homeStatus;
    }
  }

  updateCurrentTime() {
    const newTime = new Date();
    const oldHour = this.currentTime.getHours();
    const oldMinute = Math.floor(this.currentTime.getMinutes() / 30) * 30;
    const newHour = newTime.getHours();
    const newMinute = Math.floor(newTime.getMinutes() / 30) * 30;
    
    this.currentTime = newTime;
    
    // Only update display and control entities if time segment changed
    if (oldHour !== newHour || oldMinute !== newMinute) {
      console.log(`Timer Card: Time segment changed to ${newHour}:${newMinute === 0 ? '00' : '30'}`);
      this.updateDisplay();
      this.controlEntities();
    }
  }

  controlEntities() {
    // Safety check: ensure hass and states are available
    if (!this._hass || !this._hass.states || !this.config.entities.length || !this.isAtHome) {
      return;
    }

    const currentHour = this.currentTime.getHours();
    const currentMinute = this.currentTime.getMinutes();
    const minute = currentMinute < 30 ? 0 : 30;
    
    const currentSlot = this.timeSlots.find(slot => 
      slot.hour === currentHour && slot.minute === minute
    );
    
    const shouldBeOn = currentSlot?.isActive || false;
    
    // Control entities
    for (const entityId of this.config.entities) {
      const entity = this._hass.states[entityId];
      if (!entity) continue;
      
      const currentState = entity.state === 'on';
      const lastControlledState = this.lastControlledStates.get(entityId);
      
      // Only send command if:
      // 1. Current state is different from desired state
      // 2. We haven't already sent this command (to prevent infinite loops)
      if (currentState !== shouldBeOn && lastControlledState !== shouldBeOn) {
        try {
          if (this._hass.callService) {
            this._hass.callService('homeassistant', shouldBeOn ? 'turn_on' : 'turn_off', {
              entity_id: entityId
            });
            console.log(`Timer Card: ${shouldBeOn ? 'Turned on' : 'Turned off'} ${entityId}`);
          } else {
            console.warn('Timer Card: callService not available');
          }
          
          // Remember what command we sent
          this.lastControlledStates.set(entityId, shouldBeOn);
          
          // Clear the memory after some time to allow re-control if needed
          setTimeout(() => {
            if (this.lastControlledStates.get(entityId) === shouldBeOn) {
              this.lastControlledStates.delete(entityId);
            }
          }, 30000); // Clear after 30 seconds
          
        } catch (error) {
          console.error(`Timer Card: Failed to control ${entityId}:`, error);
        }
      }
    }
  }

  toggleTimeSlot(hour, minute) {
    const slot = this.timeSlots.find(s => s.hour === hour && s.minute === minute);
    if (slot) {
      slot.isActive = !slot.isActive;
      this.saveState();
      this.updateDisplay();
      
      // Clear the control memory when manually changing settings
      this.lastControlledStates.clear();
      
      this.controlEntities();
    }
  }

  toggleCurrentTimeSlot() {
    const currentHour = this.currentTime.getHours();
    const currentMinute = this.currentTime.getMinutes();
    const minute = currentMinute < 30 ? 0 : 30;
    this.toggleTimeSlot(currentHour, minute);
  }

  saveState() {
    if (this.config.save_state) {
      localStorage.setItem(`timer-24h-${this.config.title}`, JSON.stringify(this.timeSlots));
    }
  }

  loadSavedState() {
    if (this.config.save_state) {
      const saved = localStorage.getItem(`timer-24h-${this.config.title}`);
      if (saved) {
        try {
          this.timeSlots = JSON.parse(saved);
        } catch (e) {
          console.error('Failed to load saved state:', e);
        }
      }
    }
  }

  formatTime(num) {
    return num.toString().padStart(2, '0');
  }

  getTimeLabel(hour, minute) {
    return `${this.formatTime(hour)}:${this.formatTime(minute)}`;
  }

  getCurrentAngle() {
    const currentHour = this.currentTime.getHours();
    const currentMinute = this.currentTime.getMinutes();
    const totalMinutes = currentHour * 60 + currentMinute;
    const angle = (totalMinutes / (24 * 60)) * 360 - 90 - 360/(24*2);
    return angle;
  }

  isCurrentTimeSlotActive() {
    const currentHour = this.currentTime.getHours();
    const currentMinute = this.currentTime.getMinutes();
    const currentSlot = this.timeSlots.find(slot => 
      slot.hour === currentHour && 
      (slot.minute === 0 && currentMinute < 30 || slot.minute === 30 && currentMinute >= 30)
    );
    return currentSlot?.isActive || false;
  }

  createSectorPath(index, total, innerRadius, outerRadius, centerX, centerY) {
    const startAngle = (index * 360 / total - 90 - 360/(total*2)) * (Math.PI / 180);
    const endAngle = ((index + 1) * 360 / total - 90 - 360/(total*2)) * (Math.PI / 180);
    
    const x1 = centerX + innerRadius * Math.cos(startAngle);
    const y1 = centerY + innerRadius * Math.sin(startAngle);
    const x2 = centerX + outerRadius * Math.cos(startAngle);
    const y2 = centerY + outerRadius * Math.sin(startAngle);
    const x3 = centerX + outerRadius * Math.cos(endAngle);
    const y3 = centerY + outerRadius * Math.sin(endAngle);
    const x4 = centerX + innerRadius * Math.cos(endAngle);
    const y4 = centerY + innerRadius * Math.sin(endAngle);
    
    const largeArcFlag = (endAngle - startAngle) > Math.PI ? 1 : 0;
    
    return `M ${x1} ${y1} L ${x2} ${y2} A ${outerRadius} ${outerRadius} 0 ${largeArcFlag} 1 ${x3} ${y3} L ${x4} ${y4} A ${innerRadius} ${innerRadius} 0 ${largeArcFlag} 0 ${x1} ${y1} Z`;
  }

  getTextPosition(index, total, radius, centerX, centerY) {
    const angle = (index * 360 / total - 90) * (Math.PI / 180);
    const x = centerX + radius * Math.cos(angle);
    const y = centerY + radius * Math.sin(angle);
    return { x, y };
  }

  getAutomationStatus() {
    // Check if we have entities to control
    if (!this.config.entities || this.config.entities.length === 0) {
      return 'no-entities';
    }

    // Check current time slot
    const currentHour = this.currentTime.getHours();
    const currentMinute = this.currentTime.getMinutes();
    const halfHour = currentMinute >= 30 ? 30 : 0;
    
    const currentSlot = this.timeSlots.find(slot => 
      slot.hour === currentHour && slot.minute === halfHour
    );

    // Check if current time slot is active
    if (!currentSlot || !currentSlot.isActive) {
      return 'will-not-activate';
    }

    // Check if sensors allow activation (same logic as isAtHome)
    const sensorsAllow = this.checkSensorStatus();
    
    if (sensorsAllow) {
      return 'will-activate';
    } else {
      return 'will-not-activate';
    }
  }

  checkSensorStatus() {
    // Safety check: ensure hass is available
    if (!this._hass || !this._hass.states) {
      return false; // No hass available, be conservative
    }

    if (!this.config.home_sensors || this.config.home_sensors.length === 0) {
      return true; // No sensors configured, assume allowed
    }

    const sensorStates = this.config.home_sensors.map(sensorId => {
      const entity = this._hass.states[sensorId];
      if (!entity) return false;

      // Special handling for Jewish calendar sensor
      if (sensorId === 'binary_sensor.jewish_calendar_issur_melacha_in_effect') {
        const isAllowed = entity.state === 'on'; // ON means automation is allowed
        console.log(`Timer Card: Jewish calendar sensor state: ${entity.state}, automation allowed: ${isAllowed}`);
        return isAllowed;
      }

      // For other sensors, check if they indicate "home" or "on"
      return entity.state === 'on' || entity.state === 'home';
    });

    // Apply home logic
    if (this.config.home_logic === 'AND') {
      return sensorStates.every(state => state === true);
    } else {
      return sensorStates.some(state => state === true);
    }
  }

  getAutomationStatusText() {
    const status = this.getAutomationStatus();
    
    switch (status) {
      case 'will-activate':
        return '🟢 WILL TURN ON';
      case 'will-not-activate':
        // More detailed reason - with safety checks
        if (!this.currentTime) {
          return '🔴 NOT READY';
        }
        
        const currentHour = this.currentTime.getHours();
        const currentMinute = this.currentTime.getMinutes();
        const halfHour = currentMinute >= 30 ? 30 : 0;
        const currentSlot = this.timeSlots.find(slot => 
          slot.hour === currentHour && slot.minute === halfHour
        );
        
        if (!currentSlot || !currentSlot.isActive) {
          return '🔴 TIME INACTIVE';
        } else {
          return '🔴 SENSORS BLOCK';
        }
      case 'no-entities':
        return '⚙️ NO ENTITIES';
      default:
        return '❓ ERROR';
    }
  }

  updateDisplay() {
    const shadowRoot = this.shadowRoot;
    if (!shadowRoot) return;
    
    // Wait for DOM to be ready
    if (!shadowRoot.querySelector('#automation-status')) {
      setTimeout(() => this.updateDisplay(), 100);
      return;
    }

    // Update automation status - with safety checks
    const automationStatus = shadowRoot.querySelector('#automation-status');
    if (automationStatus) {
      try {
        const status = this.getAutomationStatus();
        automationStatus.textContent = this.getAutomationStatusText();
        automationStatus.className = `automation-status ${status}`;
      } catch (error) {
        console.error('Timer Card: Error updating display:', error);
        automationStatus.textContent = '❓ ERROR';
        automationStatus.className = 'automation-status no-entities';
      }
    }





    // Update sectors
    this.updateSectors();
  }



  updateSectors() {
    const shadowRoot = this.shadowRoot;
    if (!shadowRoot) return;
    
    // Wait for DOM to be ready
    if (!shadowRoot.querySelector('#outer-sector-0')) {
      setTimeout(() => this.updateSectors(), 100);
      return;
    }

    // Update outer sectors
    for (let hour = 0; hour < 24; hour++) {
      const sector = shadowRoot.querySelector(`#outer-sector-${hour}`);
      const text = shadowRoot.querySelector(`#outer-text-${hour}`);
      if (sector && text) {
        const isActive = this.timeSlots.find(slot => slot.hour === hour && slot.minute === 0)?.isActive;
        const isCurrent = this.currentTime.getHours() === hour && this.currentTime.getMinutes() < 30;
        
        sector.style.fill = isActive ? '#10b981' : '#f3f4f6';
        sector.style.stroke = isCurrent ? '#3b82f6' : '#d1d5db';
        sector.style.strokeWidth = isCurrent ? '3' : '1';
        text.style.fill = isActive ? 'white' : '#374151';
      }
    }

    // Update inner sectors
    for (let hour = 0; hour < 24; hour++) {
      const sector = shadowRoot.querySelector(`#inner-sector-${hour}`);
      const text = shadowRoot.querySelector(`#inner-text-${hour}`);
      if (sector && text) {
        const isActive = this.timeSlots.find(slot => slot.hour === hour && slot.minute === 30)?.isActive;
        const isCurrent = this.currentTime.getHours() === hour && this.currentTime.getMinutes() >= 30;
        
        sector.style.fill = isActive ? '#10b981' : '#f9fafb';
        sector.style.stroke = isCurrent ? '#3b82f6' : '#d1d5db';
        sector.style.strokeWidth = isCurrent ? '3' : '1';
        text.style.fill = isActive ? 'white' : '#4b5563';
      }
    }
  }

  render() {
    const centerX = 200;
    const centerY = 200;
    const outerRadius = 150;
    const innerRadius = 100;

    this.shadowRoot.innerHTML = `
      <style>
        :host {
          display: block;
          font-family: var(--primary-font-family, sans-serif);
        }
        
        
        .card {
          background: var(--card-background-color, white);
          border-radius: var(--ha-card-border-radius, 12px);
          box-shadow: var(--ha-card-box-shadow, 0 2px 8px rgba(0,0,0,0.1));
          padding: 0;
          margin: 0;
          overflow: hidden;
          container-type: inline-size;
          height: 100%;
          display: flex;
          flex-direction: column;
        }
        
        .header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 2px;
          padding: 2px 4px 0 4px;
          flex-shrink: 0;
        }
        
        .title {
          font-size: 1rem;
          font-weight: bold;
          color: var(--primary-text-color);
        }
        

        
        .automation-status {
          font-size: 0.6rem;
          text-align: center;
          margin: 0;
          padding: 1px 4px;
          border-radius: 6px;
          font-weight: 500;
          min-width: 60px;
        }
        
        .automation-status.will-activate {
          color: white;
          background: #059669;
          animation: pulse 2s infinite;
          box-shadow: 0 0 8px rgba(5, 150, 105, 0.4);
        }
        
        .automation-status.will-not-activate {
          color: white;
          background: #dc2626;
        }
        
        .automation-status.no-entities {
          color: white;
          background: #6b7280;
        }
        
        @keyframes pulse {
          0%, 100% { 
            opacity: 1; 
            transform: scale(1);
          }
          50% { 
            opacity: 0.8; 
            transform: scale(1.02);
          }
        }
        
        .timer-container {
          display: flex;
          justify-content: center;
          align-items: center;
          margin: 0;
          padding: 0;
          flex: 1;
          min-height: 0;
          width: 100%;
        }
        
        .timer-svg {
          width: 100%;
          height: 100%;
          max-width: 100%;
          max-height: 100%;
          aspect-ratio: 1;
          display: block;
          object-fit: contain;
        }
        
        .sector {
          cursor: pointer;
          transition: opacity 0.2s;
        }
        
        .sector:hover {
          opacity: 0.8;
        }
        
        .sector-text {
          pointer-events: none;
          user-select: none;
          font-weight: bold;
        }
        
        /* Responsive adjustments for minimal spacing */
        @container (max-width: 300px) {
          .header {
            padding: 0px 1px 0 1px;
            margin-bottom: 0px;
          }
          
          .title {
            font-size: 0.7rem;
          }
          
          .automation-status {
            font-size: 0.4rem;
            padding: 1px 2px;
            min-width: 40px;
          }
        }
        
        @container (min-width: 400px) {
          .title {
            font-size: 1rem;
          }
          
          .automation-status {
            font-size: 0.6rem;
            padding: 1px 4px;
            min-width: 60px;
          }
          
          .header {
            padding: 3px 5px 0 5px;
            margin-bottom: 3px;
          }
        }
        
        @container (min-width: 600px) {
          .title {
            font-size: 1.2rem;
          }
          
          .automation-status {
            font-size: 0.7rem;
            padding: 2px 6px;
            min-width: 70px;
          }
          
          .header {
            padding: 4px 6px 0 6px;
            margin-bottom: 4px;
          }
        }

      </style>
      
      <div class="card">
        <div class="header">
          <div class="title">${this.config.title}</div>
          <div id="automation-status" class="automation-status"></div>
        </div>
        

        
        <div class="timer-container">
          <svg class="timer-svg" viewBox="0 0 400 400">
            <!-- Border circles -->
            <circle cx="${centerX}" cy="${centerY}" r="${outerRadius}" 
                    fill="none" stroke="#e5e7eb" stroke-width="2"/>
            <circle cx="${centerX}" cy="${centerY}" r="${innerRadius}" 
                    fill="none" stroke="#e5e7eb" stroke-width="2"/>
            
            <!-- Dividing lines (only in outer ring) -->
            ${Array.from({ length: 24 }, (_, i) => {
              const angle = (i * 360 / 24 - 90) * (Math.PI / 180);
              const xInner = centerX + innerRadius * Math.cos(angle);
              const yInner = centerY + innerRadius * Math.sin(angle);
              const xOuter = centerX + outerRadius * Math.cos(angle);
              const yOuter = centerY + outerRadius * Math.sin(angle);
              return `<line x1="${xInner}" y1="${yInner}" x2="${xOuter}" y2="${yOuter}" 
                           stroke="#d1d5db" stroke-width="1"/>`;
            }).join('')}
            
            <!-- Outer sectors -->
            ${Array.from({ length: 24 }, (_, hour) => {
              const sectorPath = this.createSectorPath(hour, 24, innerRadius, outerRadius, centerX, centerY);
              const textPos = this.getTextPosition(hour, 24, (innerRadius + outerRadius) / 2, centerX, centerY);
              
              return `
                <path id="outer-sector-${hour}" class="sector" d="${sectorPath}" 
                      onclick="this.getRootNode().host.toggleTimeSlot(${hour}, 0)"/>
                <text id="outer-text-${hour}" class="sector-text" 
                      x="${textPos.x}" y="${textPos.y + 3}" 
                      text-anchor="middle" font-size="10" font-weight="bold">
                  ${this.getTimeLabel(hour, 0)}
                </text>
              `;
            }).join('')}
            
            <!-- Inner sectors -->
            ${Array.from({ length: 24 }, (_, hour) => {
              const sectorPath = this.createSectorPath(hour, 24, 50, innerRadius, centerX, centerY);
              const textPos = this.getTextPosition(hour, 24, (50 + innerRadius) / 2, centerX, centerY);
              
              return `
                <path id="inner-sector-${hour}" class="sector" d="${sectorPath}" 
                      onclick="this.getRootNode().host.toggleTimeSlot(${hour}, 30)"/>
                <text id="inner-text-${hour}" class="sector-text" 
                      x="${textPos.x}" y="${textPos.y + 2}" 
                      text-anchor="middle" font-size="8" font-weight="bold">
                  ${this.getTimeLabel(hour, 30)}
                </text>
              `;
            }).join('')}
            

          </svg>
        </div>
        

      </div>
    `;

    // Start timer for updating time
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
    }
    
    this.updateInterval = setInterval(() => {
      this.updateCurrentTime();
    }, 120000); // Check every 2 minutes instead of 1

    this.updateDisplay();
  }

  disconnectedCallback() {
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
    }
  }

  static getConfigElement() {
    return document.createElement("timer-24h-card-editor");
  }

  static getStubConfig() {
    return {
      title: "24 Hour Timer",
      home_sensors: [],
      entities: [],
      save_state: true,
      home_logic: "OR"
    };
  }
  static getConfigElement() {
    // Make sure the editor element is defined
    if (!customElements.get('timer-24h-card-editor')) {
      console.warn('timer-24h-card-editor not found, make sure timer-24h-card-editor.js is loaded');
    }
    return document.createElement('timer-24h-card-editor');
  }

  static getStubConfig() {
    return {
      title: '24 Hour Timer',
      home_sensors: [],
      home_logic: 'OR',
      entities: [],
      save_state: true
    };
  }

  // Grid support for new Sections layout
  static getLayoutOptions() {
    return {
      grid_rows: 2,
      grid_columns: 6,
      grid_min_rows: 2,
      grid_min_columns: 3
    };
  }

  static getGridOptions() {
    return {
      rows: 2,
      columns: 6,
      min_rows: 2,
      min_columns: 3
    };
  }
}

customElements.define('timer-24h-card', Timer24HCard);

// Add card info to console
console.info(
  '%c  TIMER-24H-CARD  %c  Version 1.1.0  ',
  'color: orange; font-weight: bold; background: black',
  'color: white; font-weight: bold; background: dimgray',
);

// Add to window for console access
window.customCards = window.customCards || [];
window.customCards.push({
  type: "timer-24h-card",
  name: "Timer 24H Card",
  description: "24-hour timer card with entity control"
}); 