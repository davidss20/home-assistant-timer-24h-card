class Timer24HCard extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this.timeSlots = this.initializeTimeSlots();
    this.currentTime = new Date();
    this.isAtHome = false;
    this.lastControlledStates = new Map(); // Track last sent commands
    this.lastHomeStatus = undefined; // Track home status changes
    this.language = this.detectLanguage(); // Auto-detect language
  }

  initializeTimeSlots() {
    const slots = [];
    for (let hour = 0; hour < 24; hour++) {
      slots.push({ hour, minute: 0, isActive: false });
      slots.push({ hour, minute: 30, isActive: false });
    }
    return slots;
  }

  detectLanguage() {
    // Debug logging
    console.log('🌍 Language Detection Debug:');
    console.log('- HASS object:', !!this._hass);
    console.log('- HASS language:', this._hass?.language);
    console.log('- HASS locale:', this._hass?.locale?.language);
    console.log('- HASS user language:', this._hass?.user?.language);
    console.log('- Browser language:', navigator.language);
    console.log('- Browser languages:', navigator.languages);
    
    // Try multiple sources for language detection
    let detectedLang = 'en';
    
    // 1. Try Home Assistant language settings
    if (this._hass) {
      // Check various HASS language properties
      const hassLang = this._hass.language || 
                      this._hass.locale?.language || 
                      this._hass.user?.language ||
                      this._hass.selectedLanguage;
      
      if (hassLang) {
        console.log('📍 Found HASS language:', hassLang);
        detectedLang = hassLang;
      }
    }
    
    // 2. Check browser language as fallback
    if (detectedLang === 'en') {
      const browserLang = navigator.language || navigator.userLanguage;
      console.log('📍 Using browser language:', browserLang);
      detectedLang = browserLang;
    }
    
    // 3. Normalize language code
    if (detectedLang.startsWith('he') || detectedLang.includes('hebrew')) {
      detectedLang = 'he';
    } else {
      detectedLang = 'en';
    }
    
    console.log('🎯 Final detected language:', detectedLang);
    return detectedLang;
  }

  translate(key) {
    const translations = {
      en: {
        'will_turn_on': 'WILL TURN ON',
        'sensors_block': 'SENSORS BLOCK',
        'time_inactive': 'TIME INACTIVE',
        'not_ready': 'NOT READY',
        'no_entities': 'NO ENTITIES',
        'error': 'ERROR'
      },
      he: {
        'will_turn_on': 'ידלק',
        'sensors_block': 'חסום ע"י סנסורים',
        'time_inactive': 'זמן לא פעיל',
        'not_ready': 'לא מוכן',
        'no_entities': 'אין ישויות',
        'error': 'שגיאה'
      }
    };

    const lang = this.language || 'en';
    return translations[lang]?.[key] || translations['en'][key] || key;
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
      // Save to Home Assistant instead of localStorage
      save_to_ha: config.save_to_ha !== false,
      // Home presence logic
      home_logic: config.home_logic || 'OR',
      // Language override (auto, en, he)
      language: config.language || 'auto',
      ...config
    };
    
    // Update language if manually set in config
    if (config.language && config.language !== 'auto') {
      this.language = config.language;
      console.log('🌍 Language set via config:', this.language);
    }

    this.loadSavedState();
    this.setupRealtimeSync();
    this.render();
  }

  set hass(hass) {
    if (hass && hass.states) {
      try {
        const oldSensorStatus = this.checkSensorStatus();
        const oldLanguage = this.language;
        this._hass = hass;
        
        // Update language when hass changes
        const newLanguage = this.detectLanguage();
        if (newLanguage !== oldLanguage) {
          this.language = newLanguage;
          console.log('🌍 Language updated to:', this.language);
          // Re-render to apply new language
          this.render();
          return; // Exit early since render() will call updateDisplay
        }
        
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
      const state = {
        timeSlots: this.timeSlots,
        timestamp: Date.now()
      };
      
      // Try to save to Home Assistant first
      if (this._hass && this.config.save_to_ha !== false) {
        this.saveToHomeAssistant(state);
      } else {
        // Fallback to localStorage
        localStorage.setItem(`timer-24h-${this.config.title}`, JSON.stringify(state));
        console.log('💾 Timer Card: State saved to localStorage (fallback)');
      }
    }
  }

  async saveToHomeAssistant(state) {
    try {
      const cardId = this.config.title.toLowerCase().replace(/[^a-z0-9]/g, '_');
      
      // Try new storage service first
      if (this._hass.services?.timer_card_storage?.save) {
        await this._hass.callService('timer_card_storage', 'save', {
          card_id: cardId,
          data: state
        });
        console.log('✅ Timer Card: State saved to server storage:', cardId);
        return;
      }
      
      // Fallback to input_text method
      const entityId = `input_text.timer_24h_card_${cardId}`;
      
      // Check if entity exists
      if (!this._hass.states[entityId]) {
        console.warn('⚠️ Timer Card: No storage service or entity found');
        console.log('📝 Install timer_card_storage component or create entity:');
        console.log(`input_text:\n  timer_24h_card_${cardId}:\n    name: "${this.config.title} Timer State"\n    max: 10000`);
        
        // Fallback to localStorage
        localStorage.setItem(`timer-24h-${this.config.title}`, JSON.stringify(state));
        return;
      }
      
      // Save state to the entity
      await this._hass.callService('input_text', 'set_value', {
        entity_id: entityId,
        value: JSON.stringify(state)
      });
      
      console.log('✅ Timer Card: State saved to Home Assistant entity:', entityId);
    } catch (error) {
      console.warn('⚠️ Timer Card: Failed to save to HA, using localStorage fallback:', error);
      // Fallback to localStorage
      localStorage.setItem(`timer-24h-${this.config.title}`, JSON.stringify(state));
    }
  }

  loadSavedState() {
    if (this.config.save_state) {
      // Try to load from Home Assistant first
      if (this._hass && this.config.save_to_ha !== false) {
        this.loadFromHomeAssistant();
      } else {
        // Fallback to localStorage
        this.loadFromLocalStorage();
      }
    }
  }

  async loadFromHomeAssistant() {
    try {
      const cardId = this.config.title.toLowerCase().replace(/[^a-z0-9]/g, '_');
      
      // Try new storage service first
      if (this._hass.services?.timer_card_storage?.load) {
        // Listen for the data loaded event
        const eventListener = (event) => {
          if (event.data.card_id === cardId && event.data.data?.timeSlots) {
            this.timeSlots = event.data.data.timeSlots;
            console.log('✅ Timer Card: State loaded from server storage:', cardId);
            this.updateDisplay();
            // Remove listener after receiving data
            this._hass.connection.removeEventListener('timer_card_data_loaded', eventListener);
          }
        };
        
        // Add event listener
        this._hass.connection.addEventListener('timer_card_data_loaded', eventListener);
        
        // Request data load
        await this._hass.callService('timer_card_storage', 'load', {
          card_id: cardId
        });
        
        // Wait a bit for the event, then continue with fallback if needed
        setTimeout(() => {
          this._hass.connection.removeEventListener('timer_card_data_loaded', eventListener);
        }, 2000);
        
        return;
      }
      
      // Fallback to input_text method
      const entityId = `input_text.timer_24h_card_${cardId}`;
      const entity = this._hass.states[entityId];
      
      if (entity && entity.state && entity.state !== 'unknown' && entity.state !== '') {
        const state = JSON.parse(entity.state);
        if (state.timeSlots) {
          this.timeSlots = state.timeSlots;
          console.log('✅ Timer Card: State loaded from Home Assistant entity:', entityId);
          return;
        }
      }
    } catch (error) {
      console.warn('⚠️ Timer Card: Failed to load from HA, trying localStorage:', error);
    }
    
    // Fallback to localStorage
    this.loadFromLocalStorage();
  }

  loadFromLocalStorage() {
    const saved = localStorage.getItem(`timer-24h-${this.config.title}`);
    if (saved) {
      try {
        const state = JSON.parse(saved);
        // Handle both old and new format
        if (state.timeSlots) {
          this.timeSlots = state.timeSlots;
        } else if (Array.isArray(state)) {
          this.timeSlots = state; // Old format
        }
        console.log('💾 Timer Card: State loaded from localStorage');
      } catch (e) {
        console.error('❌ Timer Card: Failed to load saved state:', e);
      }
    }
  }

  setupRealtimeSync() {
    if (!this._hass || !this.config.save_to_ha) return;
    
    const cardId = this.config.title.toLowerCase().replace(/[^a-z0-9]/g, '_');
    
    // Listen for real-time updates from other devices
    const syncListener = (event) => {
      if (event.data.card_id === cardId && event.data.data?.timeSlots) {
        // Only update if the data is different and newer
        const currentTime = this.timeSlots.reduce((acc, slot) => acc + (slot.isActive ? 1 : 0), 0);
        const newTime = event.data.data.timeSlots.reduce((acc, slot) => acc + (slot.isActive ? 1 : 0), 0);
        
        if (currentTime !== newTime) {
          console.log('🔄 Timer Card: Syncing from another device:', cardId);
          this.timeSlots = event.data.data.timeSlots;
          this.updateDisplay();
          this.controlEntities();
        }
      }
    };
    
    // Add event listener for real-time sync
    if (this._hass.connection) {
      this._hass.connection.addEventListener('timer_card_data_saved', syncListener);
      
      // Store listener reference for cleanup
      this._syncListener = syncListener;
    }
  }

  disconnectedCallback() {
    // Clean up event listener when component is removed
    if (this._hass?.connection && this._syncListener) {
      this._hass.connection.removeEventListener('timer_card_data_saved', this._syncListener);
    }
    super.disconnectedCallback?.();
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

  getCenterStatusInfo() {
    const status = this.getAutomationStatus();
    
    switch (status) {
      case 'will-activate':
        return {
          icon: '⚡',
          text: this.translate('will_turn_on'),
          bgColor: 'rgba(5, 150, 105, 0.15)',
          borderColor: '#059669',
          borderWidth: '3'
        };
      case 'will-not-activate':
        // Check reason for more specific display
        if (!this.currentTime) {
          return {
            icon: '⏳',
            text: this.translate('not_ready'),
            bgColor: 'rgba(107, 114, 128, 0.15)',
            borderColor: '#6b7280',
            borderWidth: '2'
          };
        }
        
        const currentHour = this.currentTime.getHours();
        const currentMinute = this.currentTime.getMinutes();
        const halfHour = currentMinute >= 30 ? 30 : 0;
        const currentSlot = this.timeSlots.find(slot => 
          slot.hour === currentHour && slot.minute === halfHour
        );
        
        if (!currentSlot || !currentSlot.isActive) {
          return {
            icon: '⏸️',
            text: this.translate('time_inactive'),
            bgColor: 'rgba(220, 38, 38, 0.15)',
            borderColor: '#dc2626',
            borderWidth: '2'
          };
        } else {
          return {
            icon: '🚫',
            text: this.translate('sensors_block'),
            bgColor: 'rgba(245, 101, 101, 0.15)',
            borderColor: '#f56565',
            borderWidth: '2'
          };
        }
      case 'no-entities':
        return {
          icon: '⚙️',
          text: this.translate('no_entities'),
          bgColor: 'rgba(107, 114, 128, 0.15)',
          borderColor: '#6b7280',
          borderWidth: '2'
        };
      default:
        return {
          icon: '❓',
          text: this.translate('error'),
          bgColor: 'rgba(107, 114, 128, 0.15)',
          borderColor: '#6b7280',
          borderWidth: '2'
        };
    }
  }

  updateDisplay() {
    const shadowRoot = this.shadowRoot;
    if (!shadowRoot) return;
    
    // Wait for DOM to be ready
    if (!shadowRoot.querySelector('#center-status-text')) {
      setTimeout(() => this.updateDisplay(), 100);
      return;
    }

    // Update center status indicator - with safety checks
    const statusText = shadowRoot.querySelector('#center-status-text');
    const statusSubtext = shadowRoot.querySelector('#center-status-subtext');
    const statusCircle = shadowRoot.querySelector('circle[r="45"]');
    
    if (statusText && statusSubtext && statusCircle) {
      try {
        const status = this.getAutomationStatus();
        const statusInfo = this.getCenterStatusInfo();
        
        statusText.textContent = statusInfo.icon;
        statusSubtext.textContent = statusInfo.text;
        statusCircle.setAttribute('fill', statusInfo.bgColor);
        statusCircle.setAttribute('stroke', statusInfo.borderColor);
        statusCircle.setAttribute('stroke-width', statusInfo.borderWidth);
        
        // Static display - no animations
        statusCircle.style.filter = 'none';
        statusCircle.style.animation = 'none';
        statusText.style.animation = 'none';
        statusSubtext.style.animation = 'none';
      } catch (error) {
        console.error('Timer Card: Error updating center display:', error);
        statusText.textContent = '❓';
        statusSubtext.textContent = 'ERROR';
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
    // Update language detection
    this.language = this.detectLanguage();
    
    // Set the lang attribute for RTL support
    if (this.language === 'he') {
      this.setAttribute('lang', 'he');
    } else {
      this.setAttribute('lang', 'en');
    }
    
    const centerX = 200;
    const centerY = 200;
    const outerRadius = 150;
    const innerRadius = 100;

    this.shadowRoot.innerHTML = `
      <style>
        :host {
          display: block;
          font-family: var(--primary-font-family, sans-serif);
          direction: var(--card-direction, ltr);
        }
        
        :host([lang="he"]) {
          direction: rtl;
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
          justify-content: center;
          align-items: center;
          margin-bottom: 0px;
          padding: 1px 2px 0 2px;
          flex-shrink: 0;
        }
        
        .title {
          font-size: 1rem;
          font-weight: bold;
          color: var(--primary-text-color);
        }
        

        
        /* Center status indicator styles */
        #center-status-text {
          font-size: 16px;
          font-weight: bold;
        }
        
        #center-status-subtext {
          font-size: 10px;
          font-weight: 500;
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
          overflow: hidden;
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
            padding: 0px 0px 0 0px;
            margin-bottom: 0px;
          }
          
          .title {
            font-size: 0.6rem;
          }
          
          #center-status-text {
            font-size: 10px;
          }
          
          #center-status-subtext {
            font-size: 7px;
          }
        }
        
        @container (min-width: 400px) {
          .title {
            font-size: 0.9rem;
          }
          
          #center-status-text {
            font-size: 14px;
          }
          
          #center-status-subtext {
            font-size: 9px;
          }
          
          .header {
            padding: 1px 2px 0 2px;
            margin-bottom: 0px;
          }
        }
        
        @container (min-width: 600px) {
          .title {
            font-size: 1.0rem;
          }
          
          #center-status-text {
            font-size: 16px;
          }
          
          #center-status-subtext {
            font-size: 10px;
          }
          
          .header {
            padding: 1px 3px 0 3px;
            margin-bottom: 0px;
          }
        }

      </style>
      
      <div class="card">
        <div class="header">
          <div class="title">${this.config.title}</div>
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
            
            <!-- Center status indicator -->
            <circle cx="200" cy="200" r="45" fill="var(--card-background-color)" stroke="var(--divider-color)" stroke-width="2"/>
            <text id="center-status-text" x="200" y="195" text-anchor="middle" font-size="14" font-weight="bold" fill="var(--primary-text-color)">
              Loading...
            </text>
            <text id="center-status-subtext" x="200" y="210" text-anchor="middle" font-size="10" fill="var(--secondary-text-color)">
              Status
            </text>

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
  '%c  TIMER-24H-CARD  %c  Version 1.2.0  ',
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