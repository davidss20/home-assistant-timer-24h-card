// Timer 24H Card for Home Assistant
// Version 2.0.0

class Timer24HCard extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this.timeSlots = this.initializeTimeSlots();
    this.currentTime = new Date();
    this.isAtHome = false;
    this.lastControlledStates = new Map();
    this.updateInterval = null;
  }

  // Home Assistant required methods
  static getConfigElement() {
    return document.createElement('timer-24h-card-editor');
  }

  static getStubConfig() {
    return {
      title: 'טיימר 24 שעות',
      home_sensors: [],
      home_logic: 'OR',
      entities: [],
      save_state: true
    };
  }

  getCardSize() {
    return 3;
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
    
    this.loadSavedState().then(() => {
      this.render();
    });
  }

  set hass(hass) {
    this._hass = hass;
    if (hass) {
      const oldHomeStatus = this.isAtHome;
      this.checkHomeStatus();
      
      if (oldHomeStatus !== this.isAtHome) {
        this.controlEntities();
      }
      
      this.updateCurrentTime();
      this.render();
    }
  }

  get hass() {
    return this._hass;
  }

  connectedCallback() {
    this.startTimer();
  }

  disconnectedCallback() {
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
    }
  }

  initializeTimeSlots() {
    const slots = [];
    for (let hour = 0; hour < 24; hour++) {
      slots.push({ hour, minute: 0, isActive: false });
      slots.push({ hour, minute: 30, isActive: false });
    }
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
    if (!this.config.save_state || !this.hass) return;
    
    try {
      const cardId = this.generateCardId();
      const entityId = `input_text.timer_24h_card_${cardId}`;
      const data = {
        timeSlots: this.timeSlots,
        timestamp: Date.now(),
        version: '2.0.0'
      };
      
      // Try to save to an input_text entity
      const jsonData = JSON.stringify(data);
      
      // Check if entity exists, if not create it
      if (!this.hass.states[entityId]) {
        try {
          await this.hass.callService('input_text', 'set_value', {
            entity_id: entityId,
            value: jsonData
          });
        } catch (createError) {
          // Entity doesn't exist, try to create it dynamically
          await this.createInputTextEntity(cardId, this.config.title);
          // Try again after creation
          await this.hass.callService('input_text', 'set_value', {
            entity_id: entityId,
            value: jsonData
          });
        }
      } else {
        // Entity exists, just update it
        await this.hass.callService('input_text', 'set_value', {
          entity_id: entityId,
          value: jsonData
        });
      }
      
      console.log(`Timer Card: State saved to Home Assistant entity: ${entityId}`);
    } catch (error) {
      console.warn('Timer Card: Failed to save to Home Assistant, using localStorage fallback:', error);
      // Fallback to localStorage if Home Assistant storage fails
      localStorage.setItem(`timer-24h-${this.config.title}`, JSON.stringify(this.timeSlots));
    }
  }

  async createInputTextEntity(cardId, cardTitle) {
    try {
      // Try to create the input_text entity dynamically
      await this.hass.callWS({
        type: 'config/config_entries/create',
        domain: 'input_text',
        data: {
          name: `Timer 24H Card - ${cardTitle}`,
          entity_id: `timer_24h_card_${cardId}`,
          max: 10000,
          initial: '{}'
        }
      });
    } catch (error) {
      console.warn('Timer Card: Could not create input_text entity automatically:', error);
      console.info(`Timer Card: Please create this entity manually in configuration.yaml:
      
input_text:
  timer_24h_card_${cardId}:
    name: "Timer 24H Card - ${cardTitle}"
    max: 10000
    initial: "{}"
      `);
    }
  }

  async loadSavedState() {
    if (!this.config?.save_state) return;
    
    try {
      const cardId = this.generateCardId();
      const entityId = `input_text.timer_24h_card_${cardId}`;
      
      // Try to load from Home Assistant input_text entity first
      if (this.hass && this.hass.states[entityId]) {
        const entityState = this.hass.states[entityId];
        const jsonData = entityState.state;
        
        if (jsonData && jsonData !== 'unknown' && jsonData !== '') {
          try {
            const data = JSON.parse(jsonData);
            if (data.timeSlots) {
              this.timeSlots = data.timeSlots;
              console.log(`Timer Card: State loaded from Home Assistant entity: ${entityId}`);
              return;
            }
          } catch (parseError) {
            console.warn('Timer Card: Failed to parse data from Home Assistant entity:', parseError);
          }
        }
      }
    } catch (error) {
      console.warn('Timer Card: Failed to load from Home Assistant entity, trying localStorage:', error);
    }
    
    // Fallback to localStorage
    const saved = localStorage.getItem(`timer-24h-${this.config.title}`);
    if (saved) {
      try {
        this.timeSlots = JSON.parse(saved);
        console.log('Timer Card: State loaded from localStorage (fallback)');
        
        // Migrate to Home Assistant storage if possible
        if (this.hass) {
          setTimeout(() => this.saveState(), 1000); // Delay to ensure hass is ready
        }
      } catch (error) {
        console.error('Timer Card: Failed to load saved state:', error);
      }
    }
  }

  generateCardId() {
    // Generate a unique ID based on the card title and configuration
    const title = this.config.title || 'default';
    const sanitized = title.toLowerCase().replace(/[^a-z0-9]/g, '_');
    return `timer_card_${sanitized}`;
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

    const centerX = 200;
    const centerY = 200;
    const outerRadius = 180;
    const innerRadius = 50;

    const outerSectors = Array.from({ length: 24 }, (_, hour) => {
      const sectorPath = this.createSectorPath(hour, 24, innerRadius, outerRadius, centerX, centerY);
      const textPos = this.getTextPosition(hour, 24, (innerRadius + outerRadius) / 2, centerX, centerY);
      const slot = this.timeSlots.find(s => s.hour === hour && s.minute === 0);
      const isActive = slot?.isActive || false;
      const isCurrent = this.currentTime.getHours() === hour && this.currentTime.getMinutes() < 30;
      
      return `
        <path d="${sectorPath}" 
              fill="${isActive ? '#10b981' : '#ffffff'}"
              stroke="${isCurrent ? '#3b82f6' : '#e5e7eb'}"
              stroke-width="${isCurrent ? '3' : '1'}"
              style="cursor: pointer; transition: opacity 0.2s;"
              onclick="this.getRootNode().host.toggleTimeSlot(${hour}, 0)"/>
        <text x="${textPos.x}" y="${textPos.y + 3}" 
              text-anchor="middle" font-size="10" font-weight="bold"
              style="pointer-events: none; user-select: none;"
              fill="${isActive ? '#ffffff' : '#374151'}">
          ${this.getTimeLabel(hour, 0)}
        </text>
      `;
    }).join('');

    const innerSectors = Array.from({ length: 24 }, (_, hour) => {
      const sectorPath = this.createSectorPath(hour, 24, 50, innerRadius, centerX, centerY);
      const textPos = this.getTextPosition(hour, 24, (50 + innerRadius) / 2, centerX, centerY);
      const slot = this.timeSlots.find(s => s.hour === hour && s.minute === 30);
      const isActive = slot?.isActive || false;
      const isCurrent = this.currentTime.getHours() === hour && this.currentTime.getMinutes() >= 30;
      
      return `
        <path d="${sectorPath}" 
              fill="${isActive ? '#10b981' : '#ffffff'}"
              stroke="${isCurrent ? '#3b82f6' : '#e5e7eb'}"
              stroke-width="${isCurrent ? '3' : '1'}"
              style="cursor: pointer; transition: opacity 0.2s;"
              onclick="this.getRootNode().host.toggleTimeSlot(${hour}, 30)"/>
        <text x="${textPos.x}" y="${textPos.y + 2}" 
              text-anchor="middle" font-size="8" font-weight="bold"
              style="pointer-events: none; user-select: none;"
              fill="${isActive ? '#ffffff' : '#374151'}">
          ${this.getTimeLabel(hour, 30)}
        </text>
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
        }
        
        .card {
          background: var(--card-background-color, #ffffff);
          border-radius: var(--ha-card-border-radius, 12px);
          box-shadow: var(--ha-card-box-shadow, 0 2px 8px rgba(0,0,0,0.1));
          padding: 0;
          overflow: hidden;
          height: 100%;
          min-height: 200px;
          display: flex;
          flex-direction: column;
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
        
        .home-status {
          font-size: 0.7rem;
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
          <div class="home-status ${this.isAtHome ? 'home' : 'away'}">
            ${this.isAtHome ? 'בבית' : 'מחוץ לבית'}
          </div>
        </div>
        
        <div class="timer-container">
          <svg class="timer-svg" viewBox="0 0 400 400">
            <circle cx="${centerX}" cy="${centerY}" r="${outerRadius}" 
                    fill="none" stroke="#e5e7eb" stroke-width="2"/>
            <circle cx="${centerX}" cy="${centerY}" r="${innerRadius}" 
                    fill="none" stroke="#e5e7eb" stroke-width="2"/>
            
            ${dividerLines}
            ${outerSectors}
            ${innerSectors}
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
  description: 'כרטיס טיימר 24 שעות עם בקרה אוטומטית על ישויות',
  preview: true,
  documentationURL: 'https://github.com/davidss20/home-assistant-timer-card'
});

console.info(
  '%c  TIMER-24H-CARD  %c  Version 2.0.0  ',
  'color: orange; font-weight: bold; background: black',
  'color: white; font-weight: bold; background: dimgray'
);
