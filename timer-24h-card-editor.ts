import {
  LitElement,
  html,
  css,
  CSSResultGroup,
  TemplateResult,
} from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { HomeAssistant, LovelaceCardEditor } from 'custom-card-helpers';

interface Timer24HCardConfig {
  title?: string;
  home_sensors?: string[];
  home_logic?: 'OR' | 'AND';
  entities?: string[];
  save_state?: boolean;
}

@customElement('timer-24h-card-editor')
export class Timer24HCardEditor extends LitElement implements LovelaceCardEditor {
  @property({ attribute: false }) public hass!: HomeAssistant;
  @state() private config!: Timer24HCardConfig;

  public setConfig(config: Timer24HCardConfig): void {
    this.config = { ...config };
  }

  protected render(): TemplateResult {
    if (!this.hass) {
      return html`<div>Loading...</div>`;
    }

    // Get list of all entities
    const entities = Object.keys(this.hass.states);
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

    return html`
      <div class="card-config">
        <div class="config-row">
          <label for="title">Card Title</label>
          <ha-textfield
            id="title"
            .value="${this.config.title || '24 Hour Timer'}"
            .placeholder="${'Enter card title'}"
            @input="${this.handleTitleChange}"
          ></ha-textfield>
          <div class="help-text">The title displayed at the top of the card</div>
        </div>
        
        <div class="section-title">Home Presence Settings</div>
        
        <div class="config-row">
          <label>Sensors for home presence detection</label>
          <div class="entity-list" id="sensor-list">
            ${sensors.map(entityId => {
              const entity = this.hass.states[entityId];
              const isChecked = (this.config.home_sensors || []).includes(entityId);
              return html`
                <div class="entity-item">
                  <ha-checkbox
                    .checked="${isChecked}"
                    .entityId="${entityId}"
                    @change="${this.handleSensorChange}"
                  ></ha-checkbox>
                  <label>${entityId}</label>
                  <span class="entity-state">${entity?.state || 'unavailable'}</span>
                </div>
              `;
            })}
          </div>
          <div class="help-text">Select sensors that indicate when you are at home</div>
        </div>
        
        <div class="config-row">
          <label for="home-logic">Home detection logic</label>
          <ha-select
            id="home-logic"
            .value="${this.config.home_logic || 'OR'}"
            @selected="${this.handleLogicChange}"
          >
            <mwc-list-item value="OR">OR - At least one sensor must be active</mwc-list-item>
            <mwc-list-item value="AND">AND - All sensors must be active</mwc-list-item>
          </ha-select>
          <div class="help-text">How to determine if you are at home based on the selected sensors</div>
        </div>
        
        <div class="section-title">Entity Control</div>
        
        <div class="config-row">
          <label>Entities to control based on timer</label>
          <div class="entity-list" id="entity-list">
            ${controllableEntities.map(entityId => {
              const entity = this.hass.states[entityId];
              const isChecked = (this.config.entities || []).includes(entityId);
              return html`
                <div class="entity-item">
                  <ha-checkbox
                    .checked="${isChecked}"
                    .entityId="${entityId}"
                    @change="${this.handleEntityChange}"
                  ></ha-checkbox>
                  <label>${entityId}</label>
                  <span class="entity-state">${entity?.state || 'unavailable'}</span>
                </div>
              `;
            })}
          </div>
          <div class="help-text">Select entities that will be automatically turned on/off according to the schedule</div>
        </div>
        
        <div class="section-title">Additional Settings</div>
        
        <div class="checkbox-container">
          <ha-checkbox
            id="save-state"
            .checked="${this.config.save_state !== false}"
            @change="${this.handleSaveStateChange}"
          ></ha-checkbox>
          <label for="save-state">Save timer settings in browser</label>
        </div>
        <div class="help-text">If checked, settings will be saved even after refreshing the page or closing the browser</div>
      </div>
    `;
  }

  private handleTitleChange(ev: Event): void {
    const target = ev.target as HTMLInputElement;
    this.config = { ...this.config, title: target.value };
    this.configChanged();
  }

  private handleLogicChange(ev: CustomEvent): void {
    const value = ev.detail.value as 'OR' | 'AND';
    this.config = { ...this.config, home_logic: value };
    this.configChanged();
  }

  private handleSaveStateChange(ev: Event): void {
    const target = ev.target as HTMLInputElement;
    this.config = { ...this.config, save_state: target.checked };
    this.configChanged();
  }

  private handleSensorChange(ev: Event): void {
    const target = ev.target as any;
    const entityId = target.entityId;
    const sensors = [...(this.config.home_sensors || [])];
    const index = sensors.indexOf(entityId);
    
    if (target.checked && index === -1) {
      sensors.push(entityId);
    } else if (!target.checked && index > -1) {
      sensors.splice(index, 1);
    }
    
    this.config = { ...this.config, home_sensors: sensors };
    this.configChanged();
  }

  private handleEntityChange(ev: Event): void {
    const target = ev.target as any;
    const entityId = target.entityId;
    const entities = [...(this.config.entities || [])];
    const index = entities.indexOf(entityId);
    
    if (target.checked && index === -1) {
      entities.push(entityId);
    } else if (!target.checked && index > -1) {
      entities.splice(index, 1);
    }
    
    this.config = { ...this.config, entities: entities };
    this.configChanged();
  }

  private configChanged(): void {
    const event = new CustomEvent('config-changed', {
      detail: { config: this.config },
      bubbles: true,
      composed: true
    });
    this.dispatchEvent(event);
  }

  static get styles(): CSSResultGroup {
    return css`
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
      
      ha-textfield, ha-select {
        width: 100%;
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
      
      .section-title {
        font-size: 16px;
        font-weight: bold;
        color: var(--primary-text-color);
        margin: 16px 0 8px 0;
        border-bottom: 1px solid var(--divider-color);
        padding-bottom: 4px;
      }
    `;
  }
}
