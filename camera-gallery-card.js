import { html, LitElement, css, nothing } from "https://unpkg.com/lit-element@3.0.0/lit-element.js?module";

var cardVersion="1.0.0";


function baseName(str)
{
   var base = new String(str).substring(str.lastIndexOf('/') + 1); 
//    if(base.lastIndexOf(".") != -1)       
//        base = base.substring(0, base.lastIndexOf("."));
   return base;
}

export class CameraGalleryCard extends LitElement {

    // private property
    _hass;

    // internal reactive states
    static get properties() {
        return {
            _entity_hourly: { state: true },
            _entity_motion: { state: true },
            _name: { state: true },
            _state_h: { state: true },
            _state_m: { state: true },
        };
    }

    // lifecycle interface
    setConfig(config) {
        this._entity_hourly = config.hourly_dir_entity;
        this._entity_motion = config.motion_dir_entity;
        // call set hass() to immediately adjust to a changed entity
        // while editing the entity in the card editor
        if (this._hass) {
            this.hass = this._hass
        }
    }

    set hass(hass) {
        this._hass = hass;
        this._state_h = hass.states[this._entity_hourly];
        this._state_m = hass.states[this._entity_motion];
        if (this._state_h && this._state_m) {
            let fn = this._state_h.attributes.friendly_name;
            this._name = fn ? fn : this._entity_hourly;
        }
    }

    render_images(entity) {
        return html`${ entity.attributes.file_list.map((file, index) => {
                return html`<div>${file.substring(file.lastIndexOf('/') + 1)}</div>`;
            })
        }`;
    }

    render() {
        console.log ("RENDER");

        let content;
        if (!this._state_h || !this._state_m) {
            content = html`
                <p class="error">
                    ${this._state_h} is unavailable.
                </p>
            `;
        } else {
            console.log("ELSE")
            content = html`
                <div>${this.render_images(this._state_h)}</div>
            `;
        }
        return html`
            <ha-card header="foo">
                <div class="card-content">
                    ${content}
                </div>
            </ha-card>
        `;
    }


    OLD_render_ORG() {
        console.log("RENDER");
        let content;
        if (!this._state_h || !this._state_m) {
            content = html`
                <p class="error">
                    ${this._state_h} is unavailable.
                </p>
            `;
        } else {
            content = html`
                <dl class="dl">
                    <dt class="dt">${this._name}</dt>
                    <dd class="dd" @click="${this.doToggle}">
                        <span class="value">${this._state_h.state}</span>
                    </dd>
                </dl>
            `;
        }
        return html`
            <ha-card header="foo">
                <div class="card-content">
                    ${content}
                </div>
            </ha-card>
        `;
    }

    // event handling
    doToggle(event) {
        this._hass.callService("input_boolean", "toggle", {
            entity_id: this._entity
        });
    }

    // card configuration
    static getConfigElement() {
        return document.createElement("toggle-card-lit-editor");
    }

    static getStubConfig() {
        return {
            entity: "input_boolean.tcl",
            header: "",
        };
    }

    static get styles() {
        return css``
    }
}

customElements.define("camera-gallery-card", CameraGalleryCard);

console.groupCollapsed(`%cCAMERA-GALLERY-CARD ${cardVersion} IS INSTALLED`,"color: green; font-weight: bold");
console.log("Readme:","https://github.com/Kaptensanders/camera-gallery-card");
console.groupEnd();

window.customCards = window.customCards || [];
window.customCards.push({
    type: "camera-gallery-card",
    name: "Camera Gallery Card",
    description: "Card to view camera snapshot folders",
});
