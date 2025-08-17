class Timer24HCard extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this.timeSlots = this.initializeTimeSlots();
    this.currentTime = new Date();
    this.isAtHome = false;
    this.lastControlledStates = new Map(); // Track last sent commands
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
    this._hass = hass;
    if (hass) {
      try {
        this.checkHomeStatus();
        this.updateCurrentTime();
        this.controlEntities();
      } catch (error) {
        console.error('Timer Card: Error in hass setter:', error);
      }
    }
  }

  get hass() {
    return this._hass;
  }

  checkHomeStatus() {
    if (!this._hass || !this.config.home_sensors.length) {
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
      
      // Special handling for jewish calendar sensor - it should be OFF (no issur melacha)
      if (sensorId === 'binary_sensor.jewish_calendar_issur_melacha_in_effect') {
        isTrue = sensor.state.toLowerCase() === 'off';
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
    
    // Debug logging
    console.log(`Timer Card Debug - Home Status: ${homeStatus}, Sensors:`, 
      this.config.home_sensors.map(id => {
        const sensor = this._hass.states[id];
        return `${id}: ${sensor?.state || 'unavailable'}`;
      }).join(', '));
  }

  updateCurrentTime() {
    this.currentTime = new Date();
    this.updateDisplay();
  }

  controlEntities() {
    if (!this._hass || !this.config.entities.length || !this.isAtHome) {
      console.log(`Timer Card Debug - Not controlling entities. HASS: ${!!this._hass}, Entities: ${this.config.entities.length}, At Home: ${this.isAtHome}`);
      return;
    }

    const currentHour = this.currentTime.getHours();
    const currentMinute = this.currentTime.getMinutes();
    const minute = currentMinute < 30 ? 0 : 30;
    
    const currentSlot = this.timeSlots.find(slot => 
      slot.hour === currentHour && slot.minute === minute
    );
    
    const shouldBeOn = currentSlot?.isActive || false;
    
    console.log(`Timer Card Debug - Control: Hour ${currentHour}:${minute < 10 ? '0' + minute : minute}, Slot Active: ${shouldBeOn}, At Home: ${this.isAtHome}`);
    
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
        console.log(`Timer Card Debug - Sending command to ${entityId}: ${shouldBeOn ? 'ON' : 'OFF'} (current: ${currentState}, last sent: ${lastControlledState})`);
        try {
          this._hass.callService('homeassistant', shouldBeOn ? 'turn_on' : 'turn_off', {
            entity_id: entityId
          });
          console.log(`Timer Card: ${shouldBeOn ? 'Turned on' : 'Turned off'} ${entityId}`);
          
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
      } else {
        console.log(`Timer Card Debug - Skipping ${entityId}: current=${currentState}, desired=${shouldBeOn}, lastSent=${lastControlledState}`);
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

  updateDisplay() {
    const shadowRoot = this.shadowRoot;
    if (!shadowRoot) return;
    
    // Wait for DOM to be ready
    if (!shadowRoot.querySelector('#home-status')) {
      setTimeout(() => this.updateDisplay(), 100);
      return;
    }



    // Update home status
    const homeStatus = shadowRoot.querySelector('#home-status');
    if (homeStatus) {
      homeStatus.textContent = this.isAtHome ? 'At Home' : 'Away';
      homeStatus.className = this.isAtHome ? 'home-status home' : 'home-status away';
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
          overflow: hidden;
        }
        
        .header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 8px;
          padding: 8px 12px 0 12px;
        }
        
        .title {
          font-size: 1.2rem;
          font-weight: bold;
          color: var(--primary-text-color);
        }
        

        
        .home-status {
          font-size: 0.8rem;
          text-align: center;
          margin: 0;
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
        }
        
        .timer-svg {
          width: 100%;
          height: auto;
          aspect-ratio: 1;
          display: block;
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
        

        

      </style>
      
      <div class="card">
        <div class="header">
          <div class="title">${this.config.title}</div>
          <div id="home-status" class="home-status"></div>
        </div>
        

        
        <div class="timer-container">
          <svg class="timer-svg" viewBox="0 0 400 400">
            <!-- Border circles -->
            <circle cx="${centerX}" cy="${centerY}" r="${outerRadius}" 
                    fill="none" stroke="#e5e7eb" stroke-width="2"/>
            <circle cx="${centerX}" cy="${centerY}" r="${innerRadius}" 
                    fill="none" stroke="#e5e7eb" stroke-width="2"/>
            
            <!-- Dividing lines -->
            ${Array.from({ length: 24 }, (_, i) => {
              const angle = (i * 360 / 24 - 90) * (Math.PI / 180);
              const x = centerX + outerRadius * Math.cos(angle);
              const y = centerY + outerRadius * Math.sin(angle);
              return `<line x1="${centerX}" y1="${centerY}" x2="${x}" y2="${y}" 
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
    }, 60000);

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