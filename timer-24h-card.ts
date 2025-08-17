import {
  LitElement,
  html,
  css,
  CSSResultGroup,
  TemplateResult,
  PropertyValues,
} from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { HomeAssistant, LovelaceCard, LovelaceCardConfig } from 'custom-card-helpers';

// Types
interface Timer24HCardConfig extends LovelaceCardConfig {
  title?: string;
  home_sensors?: string[];
  home_logic?: 'OR' | 'AND';
  entities?: string[];
  save_state?: boolean;
}

interface TimeSlot {
  hour: number;
  minute: number;
  isActive: boolean;
}

interface GridOptions {
  rows: number;
  columns: number;
  min_rows?: number;
  min_columns?: number;
}

// Validation schema
const CARD_CONFIG_SCHEMA = {
  title: { type: 'string', optional: true },
  home_sensors: { type: 'array', optional: true },
  home_logic: { type: 'string', enum: ['OR', 'AND'], optional: true },
  entities: { type: 'array', optional: true },
  save_state: { type: 'boolean', optional: true }
};

@customElement('timer-24h-card')
export class Timer24HCard extends LitElement implements LovelaceCard {
  @property({ attribute: false }) public hass!: HomeAssistant;
  @state() private config!: Timer24HCardConfig;
  @state() private timeSlots: TimeSlot[] = [];
  @state() private currentTime: Date = new Date();
  @state() private isAtHome: boolean = false;
  
  private lastControlledStates = new Map<string, boolean>();
  private lastHomeStatus?: boolean;
  private updateInterval?: number;

  // Grid support for new Sections layout
  public static getLayoutOptions() {
    return {
      grid_rows: 2,
      grid_columns: 6,
      grid_min_rows: 2,
      grid_min_columns: 3
    };
  }

  // Alternative method name that HA might use
  public static getGridOptions(): GridOptions {
    return {
      rows: 2,
      columns: 6,
      min_rows: 2,
      min_columns: 3
    };
  }

  // Masonry support for legacy layouts
  public getCardSize(): number {
    return 3;
  }

  // Dynamic card size based on content
  public getCardHeight(): number {
    return 2; // Grid rows
  }

  public getCardWidth(): number {
    return 6; // Grid columns
  }

  public static async getConfigElement() {
    return document.createElement('timer-24h-card-editor');
  }

  public static getStubConfig(): Timer24HCardConfig {
    return {
      title: '24 Hour Timer',
      home_sensors: [],
      home_logic: 'OR',
      entities: [],
      save_state: true
    };
  }

  // Card metadata for Home Assistant
  public static get cardInfo() {
    return {
      type: 'timer-24h-card',
      name: 'Timer 24H Card',
      description: 'A 24-hour timer card with automatic entity control',
      preview: true,
      grid_options: {
        rows: 2,
        columns: 6,
        min_rows: 2,
        min_columns: 3
      }
    };
  }

  constructor() {
    super();
    this.timeSlots = this.initializeTimeSlots();
  }

  public setConfig(config: Timer24HCardConfig): void {
    this.validateConfig(config);
    this.config = {
      title: '24 Hour Timer',
      home_sensors: [],
      home_logic: 'OR',
      entities: [],
      save_state: true,
      ...config
    };
    this.loadSavedState();
  }

  private validateConfig(config: Timer24HCardConfig): void {
    if (!config) {
      throw new Error('Invalid configuration: config is required');
    }

    // Validate each property
    Object.entries(CARD_CONFIG_SCHEMA).forEach(([key, schema]) => {
      const value = (config as any)[key];
      
      if (value !== undefined) {
        if (schema.type === 'string' && typeof value !== 'string') {
          throw new Error(`Invalid configuration: ${key} must be a string`);
        }
        if (schema.type === 'boolean' && typeof value !== 'boolean') {
          throw new Error(`Invalid configuration: ${key} must be a boolean`);
        }
        if (schema.type === 'array' && !Array.isArray(value)) {
          throw new Error(`Invalid configuration: ${key} must be an array`);
        }
        if (schema.enum && !schema.enum.includes(value)) {
          throw new Error(`Invalid configuration: ${key} must be one of ${schema.enum.join(', ')}`);
        }
      } else if (!schema.optional) {
        throw new Error(`Invalid configuration: ${key} is required`);
      }
    });

    // Validate entities exist in hass (if available)
    if (this.hass && config.entities) {
      const invalidEntities = config.entities.filter(entityId => !this.hass.states[entityId]);
      if (invalidEntities.length > 0) {
        console.warn(`Timer Card: Some entities not found: ${invalidEntities.join(', ')}`);
      }
    }
  }

  protected updated(changedProps: PropertyValues): void {
    super.updated(changedProps);
    
    if (changedProps.has('hass') && this.hass) {
      const oldHomeStatus = this.isAtHome;
      this.checkHomeStatus();
      
      // Only run control if home status changed
      if (oldHomeStatus !== this.isAtHome) {
        this.controlEntities();
      }
      
      this.updateCurrentTime();
    }
  }

  connectedCallback(): void {
    super.connectedCallback();
    this.startTimer();
  }

  disconnectedCallback(): void {
    super.disconnectedCallback();
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
    }
  }

  private initializeTimeSlots(): TimeSlot[] {
    const slots: TimeSlot[] = [];
    for (let hour = 0; hour < 24; hour++) {
      slots.push({ hour, minute: 0, isActive: false });
      slots.push({ hour, minute: 30, isActive: false });
    }
    return slots;
  }

  private startTimer(): void {
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
    }
    
    this.updateInterval = window.setInterval(() => {
      this.updateCurrentTime();
    }, 120000); // Check every 2 minutes
  }

  private checkHomeStatus(): void {
    if (!this.hass || !this.config.home_sensors?.length) {
      this.isAtHome = true; // Default - at home
      return;
    }

    const logic = this.config.home_logic || 'OR';
    let homeStatus = logic === 'AND';
    
    for (const sensorId of this.config.home_sensors) {
      const sensor = this.hass.states[sensorId];
      if (!sensor) continue;
      
      let isTrue: boolean;
      
      // Special handling for jewish calendar sensor
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

  private updateCurrentTime(): void {
    const newTime = new Date();
    const oldHour = this.currentTime.getHours();
    const oldMinute = Math.floor(this.currentTime.getMinutes() / 30) * 30;
    const newHour = newTime.getHours();
    const newMinute = Math.floor(newTime.getMinutes() / 30) * 30;
    
    this.currentTime = newTime;
    
    // Only control entities if time segment changed
    if (oldHour !== newHour || oldMinute !== newMinute) {
      console.log(`Timer Card: Time segment changed to ${newHour}:${newMinute === 0 ? '00' : '30'}`);
      this.controlEntities();
    }
  }

  private controlEntities(): void {
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
    
    // Control entities
    for (const entityId of this.config.entities) {
      const entity = this.hass.states[entityId];
      if (!entity) continue;
      
      const currentState = entity.state === 'on';
      const lastControlledState = this.lastControlledStates.get(entityId);
      
      // Only send command if state differs and we haven't sent this command
      if (currentState !== shouldBeOn && lastControlledState !== shouldBeOn) {
        try {
          this.hass.callService('homeassistant', shouldBeOn ? 'turn_on' : 'turn_off', {
            entity_id: entityId
          });
          console.log(`Timer Card: ${shouldBeOn ? 'Turned on' : 'Turned off'} ${entityId}`);
          
          // Remember what command we sent
          this.lastControlledStates.set(entityId, shouldBeOn);
          
          // Clear the memory after some time
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

  private toggleTimeSlot(hour: number, minute: number): void {
    const slot = this.timeSlots.find(s => s.hour === hour && s.minute === minute);
    if (slot) {
      slot.isActive = !slot.isActive;
      this.saveState();
      this.requestUpdate();
      
      // Clear control memory when manually changing settings
      this.lastControlledStates.clear();
      this.controlEntities();
    }
  }

  private saveState(): void {
    if (this.config.save_state) {
      localStorage.setItem(`timer-24h-${this.config.title}`, JSON.stringify(this.timeSlots));
    }
  }

  private loadSavedState(): void {
    if (this.config.save_state) {
      const saved = localStorage.getItem(`timer-24h-${this.config.title}`);
      if (saved) {
        try {
          this.timeSlots = JSON.parse(saved);
        } catch (error) {
          console.error('Timer Card: Failed to load saved state:', error);
        }
      }
    }
  }

  private createSectorPath(hour: number, totalSectors: number, innerRadius: number, outerRadius: number, centerX: number, centerY: number): string {
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

  private getTextPosition(hour: number, totalSectors: number, radius: number, centerX: number, centerY: number): { x: number; y: number } {
    const angle = ((hour + 0.5) * 360 / totalSectors - 90) * (Math.PI / 180);
    const x = centerX + radius * Math.cos(angle);
    const y = centerY + radius * Math.sin(angle);
    return { x, y };
  }

  private getTimeLabel(hour: number, minute: number): string {
    return `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
  }

  private isCurrentTimeSlotActive(): boolean {
    const currentHour = this.currentTime.getHours();
    const currentMinute = this.currentTime.getMinutes();
    const minute = currentMinute < 30 ? 0 : 30;
    
    const currentSlot = this.timeSlots.find(slot => 
      slot.hour === currentHour && slot.minute === minute
    );
    
    return currentSlot?.isActive || false;
  }

  protected render(): TemplateResult {
    const centerX = 200;
    const centerY = 200;
    const outerRadius = 180;
    const innerRadius = 50;

    return html`
      <ha-card>
        <div class="header">
          <div class="title">${this.config.title}</div>
          <div class="home-status ${this.isAtHome ? 'home' : 'away'}">
            ${this.isAtHome ? 'At Home' : 'Away'}
          </div>
        </div>
        
        <div class="timer-container">
          <svg class="timer-svg" viewBox="0 0 400 400">
            <!-- Border circles -->
            <circle cx="${centerX}" cy="${centerY}" r="${outerRadius}" 
                    fill="none" stroke="var(--divider-color)" stroke-width="2"/>
            <circle cx="${centerX}" cy="${centerY}" r="${innerRadius}" 
                    fill="none" stroke="var(--divider-color)" stroke-width="2"/>
            
            <!-- Dividing lines (only in outer ring) -->
            ${Array.from({ length: 24 }, (_, i) => {
              const angle = (i * 360 / 24 - 90) * (Math.PI / 180);
              const xInner = centerX + innerRadius * Math.cos(angle);
              const yInner = centerY + innerRadius * Math.sin(angle);
              const xOuter = centerX + outerRadius * Math.cos(angle);
              const yOuter = centerY + outerRadius * Math.sin(angle);
              return html`<line x1="${xInner}" y1="${yInner}" x2="${xOuter}" y2="${yOuter}" 
                               stroke="var(--divider-color)" stroke-width="1"/>`;
            })}
            
            <!-- Outer sectors -->
            ${Array.from({ length: 24 }, (_, hour) => {
              const sectorPath = this.createSectorPath(hour, 24, innerRadius, outerRadius, centerX, centerY);
              const textPos = this.getTextPosition(hour, 24, (innerRadius + outerRadius) / 2, centerX, centerY);
              const slot = this.timeSlots.find(s => s.hour === hour && s.minute === 0);
              const isActive = slot?.isActive || false;
              const isCurrent = this.currentTime.getHours() === hour && this.currentTime.getMinutes() < 30;
              
              return html`
                <path d="${sectorPath}" 
                      fill="${isActive ? 'var(--primary-color)' : 'var(--card-background-color)'}"
                      stroke="${isCurrent ? 'var(--accent-color)' : 'var(--divider-color)'}"
                      stroke-width="${isCurrent ? '3' : '1'}"
                      style="cursor: pointer; transition: opacity 0.2s;"
                      @click="${() => this.toggleTimeSlot(hour, 0)}"/>
                <text x="${textPos.x}" y="${textPos.y + 3}" 
                      text-anchor="middle" font-size="10" font-weight="bold"
                      style="pointer-events: none; user-select: none; font-weight: bold;"
                      fill="${isActive ? 'var(--text-primary-color)' : 'var(--primary-text-color)'}">
                  ${this.getTimeLabel(hour, 0)}
                </text>
              `;
            })}
            
            <!-- Inner sectors -->
            ${Array.from({ length: 24 }, (_, hour) => {
              const sectorPath = this.createSectorPath(hour, 24, 50, innerRadius, centerX, centerY);
              const textPos = this.getTextPosition(hour, 24, (50 + innerRadius) / 2, centerX, centerY);
              const slot = this.timeSlots.find(s => s.hour === hour && s.minute === 30);
              const isActive = slot?.isActive || false;
              const isCurrent = this.currentTime.getHours() === hour && this.currentTime.getMinutes() >= 30;
              
              return html`
                <path d="${sectorPath}" 
                      fill="${isActive ? 'var(--primary-color)' : 'var(--card-background-color)'}"
                      stroke="${isCurrent ? 'var(--accent-color)' : 'var(--divider-color)'}"
                      stroke-width="${isCurrent ? '3' : '1'}"
                      style="cursor: pointer; transition: opacity 0.2s;"
                      @click="${() => this.toggleTimeSlot(hour, 30)}"/>
                <text x="${textPos.x}" y="${textPos.y + 2}" 
                      text-anchor="middle" font-size="8" font-weight="bold"
                      style="pointer-events: none; user-select: none; font-weight: bold;"
                      fill="${isActive ? 'var(--text-primary-color)' : 'var(--primary-text-color)'}">
                  ${this.getTimeLabel(hour, 30)}
                </text>
              `;
            })}
          </svg>
        </div>
      </ha-card>
    `;
  }

  static get styles(): CSSResultGroup {
    return css`
      :host {
        display: block;
        font-family: var(--primary-font-family, sans-serif);
      }
      
      ha-card {
        padding: 0;
        overflow: hidden;
        height: 100%;
        min-height: 200px;
        display: flex;
        flex-direction: column;
        container-type: inline-size;
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
        color: var(--primary-text-color);
      }
      
      .home-status {
        font-size: 0.7rem;
        text-align: center;
        margin: 0;
      }
      
      .home-status.home {
        color: var(--success-color, #10b981);
      }
      
      .home-status.away {
        color: var(--warning-color, #f59e0b);
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
      
      /* Responsive adjustments */
      @container (max-width: 250px) {
        .header {
          padding: 1px 2px 0 2px;
          margin-bottom: 1px;
        }
        
        .title {
          font-size: 0.8rem;
        }
        
        .home-status {
          font-size: 0.6rem;
        }
        
        .sector-text {
          font-size: 6px !important;
        }
      }
      
      @container (min-width: 400px) {
        .title {
          font-size: 1.1rem;
        }
        
        .home-status {
          font-size: 0.8rem;
        }
        
        .header {
          padding: 6px 10px 0 10px;
        }
      }
      
      @container (min-width: 600px) {
        .title {
          font-size: 1.3rem;
        }
        
        .home-status {
          font-size: 0.9rem;
        }
        
        .header {
          padding: 8px 12px 0 12px;
        }
      }
    `;
  }
}

// Add card info to console
console.info(
  '%c  TIMER-24H-CARD  %c  Version 2.0.0  ',
  'color: orange; font-weight: bold; background: black',
  'color: white; font-weight: bold; background: dimgray',
);

// Register card for HACS and Home Assistant
(window as any).customCards = (window as any).customCards || [];
(window as any).customCards.push({
  type: 'timer-24h-card',
  name: 'Timer 24H Card',
  description: 'A 24-hour timer card with automatic entity control',
  preview: true,
  documentationURL: 'https://github.com/davidss20/timer-24h-card',
  grid_options: {
    rows: 2,
    columns: 6,
    min_rows: 2,
    min_columns: 3
  }
});

// Register with Home Assistant's card registry
if ((window as any).customElements && (window as any).customElements.get('timer-24h-card')) {
  console.log('Timer 24H Card already registered');
} else {
  console.log('Registering Timer 24H Card');
}
