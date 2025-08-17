class Timer24HCard extends HTMLElement {
  constructor() {
    super();
    this.timeSlots = [];
    this.currentTime = new Date();
    this.lastControlledStates = new Map();
    this.lastHomeStatus = undefined;
    this._lastKnownState = undefined;
    this._lastSentData = undefined;
    this.language = this.detectLanguage();
    
    // Initialize 48 time slots (30 minutes each)
    for (let hour = 0; hour < 24; hour++) {
      this.timeSlots.push({ hour, minute: 0, isActive: false });
      this.timeSlots.push({ hour, minute: 30, isActive: false });
    }
  }

  detectLanguage() {
    try {
      // Check config first
      if (this.config?.language && this.config.language !== 'auto') {
        console.log('🌍 Using config language:', this.config.language);
        return this.config.language;
      }

      // Try to detect from Home Assistant
      if (this._hass) {
        const hassLang = this._hass.language || 
                        this._hass.locale?.language || 
                        this._hass.user?.language || 
                        this._hass.selectedLanguage;
        
        if (hassLang) {
          console.log('🌍 Detected HA language:', hassLang);
          return hassLang.startsWith('he') ? 'he' : 'en';
        }
      }

      // Fallback to browser language
      const browserLang = navigator.language || navigator.languages?.[0] || 'en';
      console.log('🌍 Using browser language:', browserLang);
      return browserLang.startsWith('he') ? 'he' : 'en';
    } catch (error) {
      console.warn('Language detection failed:', error);
      return 'en';
    }
  }

  translate(key) {
    const translations = {
      en: {
        'will_turn_on': 'Will Turn On',
        'sensors_block': 'Blocked by Sensors', 
        'time_inactive': 'Time Inactive',
        'not_ready': 'Not Ready',
        'no_entities': 'No Entities',
        'error': 'Error'
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
    
    return translations[this.language]?.[key] || translations['en'][key] || key;
  }

  setConfig(config) {
    if (!config) {
      throw new Error('Invalid configuration');
    }
    
    this.config = {
      title: config.title || 'Timer Card',
      entities: config.entities || [],
      home_sensors: config.home_sensors || [],
      home_logic: config.home_logic || 'AND',
      save_state: config.save_state !== false,
      save_to_ha: config.save_to_ha !== false,
      language: config.language || 'auto',
      ...config
    };

    // Re-detect language if config changed
    if (config.language) {
      this.language = this.detectLanguage();
    }
  }

  set hass(hass) {
    const oldHass = this._hass;
    this._hass = hass;
    
    // Re-detect language when hass changes
    const oldLanguage = this.language;
    this.language = this.detectLanguage();
    
    if (oldLanguage !== this.language) {
      this.setAttribute('lang', this.language);
      this.render();
    }

    if (!oldHass) {
      this.loadSavedState();
      this.setupRealtimeSync();
      this.render();
    }

    if (hass && hass.states) {
      try {
        const wasAtHome = this.lastHomeStatus;
        const isAtHome = this.checkHomeStatus();
        
        if (wasAtHome !== isAtHome) {
          this.updateDisplay();
          this.controlEntities();
        }

        const sensorStatusChanged = this.checkSensorStatus() !== this._lastSensorStatus;
        if (sensorStatusChanged) {
          this._lastSensorStatus = this.checkSensorStatus();
          this.updateDisplay();
          this.controlEntities();
        }
      } catch (error) {
        console.warn('Error in hass setter:', error);
      }
    }
  }

  saveState() {
    console.log('🔄 SAVE STATE DEBUG:', {
      save_state: this.config.save_state,
      save_to_ha: this.config.save_to_ha,
      has_hass: !!this._hass,
      title: this.config.title,
      timeSlots_count: this.timeSlots.length
    });
    
    if (this.config.save_state) {
      const state = {
        timeSlots: this.timeSlots,
        timestamp: Date.now()
      };
      
      console.log('💾 Saving state:', state);
      
      // Always save to localStorage first
      console.log('💾 Saving to localStorage...');
      localStorage.setItem(`timer-24h-${this.config.title}`, JSON.stringify(state));
      console.log('✅ State saved to localStorage');
      
      // Send sync data to other devices via notification
      if (this._hass && this.config.save_to_ha !== false) {
        this.saveToHAStorage(state);
      }
      
      // Update our known state to prevent sync loops
      this._lastKnownState = JSON.stringify(state.timeSlots);
    } else {
      console.log('⚠️ Save state is disabled in config');
    }
  }

  async saveToHAStorage(state) {
    try {
      const syncData = {
        timeSlots: state.timeSlots,
        timestamp: Date.now(),
        device: `device_${Date.now() % 10000}`
      };
      
      console.log('🌐 Saving via persistent notification...');
      
      // Use persistent notification as storage - simple and reliable
      await this._hass.callService('persistent_notification', 'create', {
        notification_id: this._syncKey,
        title: `Timer Sync ${this.config.title}`,
        message: JSON.stringify(syncData)
      });
      
      console.log('✅ Saved to HA notification storage');
      this._lastSentData = JSON.stringify(state.timeSlots);
      
    } catch (error) {
      console.warn('⚠️ Notification save failed:', error);
    }
  }

  loadSavedState() {
    if (this.config.save_state) {
      // Try to load from Home Assistant notification first
      if (this._hass && this.config.save_to_ha !== false) {
        this.loadFromHAStorage();
      } else {
        // Fallback to localStorage
        this.loadFromLocalStorage();
      }
    }
  }

  async loadFromHAStorage() {
    try {
      if (!this._syncKey || !this._hass) {
        console.log('⚠️ HA not available, using localStorage');
        this.loadFromLocalStorage();
        return;
      }
      
      console.log('🌐 Loading from HA notification...');
      
      // Check if notification exists
      const notifications = this._hass.states['persistent_notification.' + this._syncKey];
      if (notifications && notifications.attributes?.message) {
        try {
          const syncData = JSON.parse(notifications.attributes.message);
          
          console.log('✅ Loaded data from HA notification');
          this.timeSlots = syncData.timeSlots || this.timeSlots;
          this._lastKnownState = JSON.stringify(this.timeSlots);
          
          this.updateDisplay();
          this.controlEntities();
          return;
        } catch (parseError) {
          console.log('⚠️ Failed to parse notification data');
        }
      }
      
      console.log('⚠️ No notification found, using localStorage');
      this.loadFromLocalStorage();
      
    } catch (error) {
      console.warn('⚠️ Failed to load from HA notification:', error);
      this.loadFromLocalStorage();
    }
  }

  loadFromLocalStorage() {
    try {
      const savedState = localStorage.getItem(`timer-24h-${this.config.title}`);
      if (savedState) {
        const state = JSON.parse(savedState);
        if (state.timeSlots) {
          this.timeSlots = state.timeSlots;
          this._lastKnownState = JSON.stringify(this.timeSlots);
          console.log('✅ Timer Card: State loaded from localStorage');
          this.updateDisplay();
          this.controlEntities();
        }
      }
    } catch (e) {
      console.error('❌ Timer Card: Failed to load saved state:', e);
    }
  }

  setupRealtimeSync() {
    console.log('🔄 SETUP SYNC DEBUG:', {
      has_hass: !!this._hass,
      save_to_ha: this.config.save_to_ha,
      title: this.config.title
    });
    
    const cardId = this.config.title.toLowerCase().replace(/[^a-z0-9]/g, '_');
    this._lastKnownState = JSON.stringify(this.timeSlots);
    this._syncKey = `timer_24h_${cardId}`;
    
    // Always set up localStorage sync (works immediately)
    this.setupLocalStorageSync();
    
    // Set up notification-based sync for cross-device synchronization
    this.setupNotificationSync();
    
    console.log('🔄 Real-time sync enabled for', cardId);
  }

  setupNotificationSync() {
    if (!this._hass) {
      console.log('⚠️ HASS not available, using localStorage only');
      return;
    }

    try {
      // Set up notification-based sync checking
      this._syncCheckInterval = setInterval(() => {
        this.checkNotificationSync();
      }, 2000); // Check every 2 seconds
      
      console.log('✅ Notification sync enabled for cross-device synchronization');
      console.log('🔍 Sync key:', this._syncKey);
    } catch (error) {
      console.warn('⚠️ Could not set up notification sync:', error);
    }
  }

  async checkNotificationSync() {
    try {
      if (!this._hass) {
        return;
      }
      
      // Check persistent notifications for sync data
      const notifications = this._hass.states['persistent_notification.' + this._syncKey];
      if (notifications && notifications.attributes?.message) {
        try {
          const syncData = JSON.parse(notifications.attributes.message);
          const newStateStr = JSON.stringify(syncData.timeSlots);
          const currentStateStr = JSON.stringify(this.timeSlots);
          
          // Only update if data is different and not from this device
          if (newStateStr !== currentStateStr && 
              newStateStr !== this._lastKnownState && 
              newStateStr !== this._lastSentData) {
            
            console.log('🔄 Detected notification sync from another device');
            console.log('📱 Updating from device:', syncData.device);
            
            this.timeSlots = syncData.timeSlots;
            this._lastKnownState = newStateStr;
            this.updateDisplay();
            this.controlEntities();
          }
        } catch (parseError) {
          // Ignore parsing errors
        }
      }
    } catch (error) {
      // Ignore errors
    }
  }

  setupLocalStorageSync() {
    // Listen for localStorage changes from other tabs/windows
    window.addEventListener('storage', (event) => {
      const storageKey = `timer-24h-${this.config.title}`;
      
      if (event.key === storageKey && event.newValue) {
        try {
          const newState = JSON.parse(event.newValue);
          const currentStateStr = JSON.stringify(this.timeSlots);
          const newStateStr = JSON.stringify(newState.timeSlots || []);
          
          if (newStateStr !== currentStateStr && newStateStr !== this._lastKnownState) {
            console.log('🔄 Timer Card: Detected change from another tab/window');
            
            if (newState.timeSlots) {
              this.timeSlots = newState.timeSlots;
              this._lastKnownState = newStateStr;
              this.updateDisplay();
              this.controlEntities();
            }
          }
        } catch (error) {
          console.warn('Failed to parse localStorage sync data:', error);
        }
      }
    });
    
    console.log('💾 localStorage sync enabled for cross-tab synchronization');
  }

  disconnectedCallback() {
    // Clean up intervals and event listeners
    if (this._entityCheckInterval) {
      clearInterval(this._entityCheckInterval);
    }
    if (this._syncCheckInterval) {
      clearInterval(this._syncCheckInterval);
    }
    super.disconnectedCallback?.();
  }

  // Rest of the class methods remain the same...
  render() {
    // Implementation here
  }

  // Add other necessary methods...
}

customElements.define('timer-24h-card', Timer24HCard);
