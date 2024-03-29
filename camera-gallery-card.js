import { html, LitElement, css, nothing } from "https://unpkg.com/lit-element@3.0.0/lit-element.js?module";

var cardVersion="1.0.0";

export class CameraGalleryCard extends LitElement {

    // private property
    _hass;
    _mediaUrlCache;

    // internal reactive states
    static get properties() {
        return {
            _entity_hourly: { state: true },
            _entity_motion: { state: true },
            _state_h: { state: true },
            _state_m: { state: true },
            _selectedImage: { type: String },
            _showOverlay: { type: Boolean },
            _showVideoPopup: { type: Boolean },
            _selectedThumbnail: { type: String },
            _mediaUrl: { type: String },
        };
    }

    constructor() {
        super();
        this._showOverlay = false;
        this._mediaUrl = "";
        this._showVideoPopup = false;
        this._mediaUrlCache = new Map();
    }

    // lifecycle interface
    setConfig(config) {
        this._entity_hourly = config.hourly_dir_entity;
        this._entity_motion = config.motion_dir_entity;
        // call set hass() to immediately adjust to a changed entity
        // while editing the entity in the card editor
        if (this._hass) {
            this.hass = this._hass;
        }
    }

    set hass(hass) {
        this._hass = hass;

        let newH = hass.states[this._entity_hourly];
        let newM = hass.states[this._entity_motion];

        if (!this._state_h || !this._state_m ||
            this._state_h.state !== newH.state ||
            this._state_m.state !== newM.state ||
            this._state_h.attributes.number_of_files != newH.attributes.number_of_files ||
            this._state_m.attributes.number_of_files != newM.attributes.number_of_files)
        {

            this._state_h = hass.states[this._entity_hourly];
            this._state_m = hass.states[this._entity_motion];
            
            if (this._state_h.attributes.file_list.length > 0) {
                let url = this._state_h.attributes.file_list[0].image;
                let urlM = this._getSizedURL(url, "med")
                if (this._selectedImage != urlM) {
                    this._selectedImage = urlM;
                    this._selectedThumbnail = this._getSizedURL(url, "thumb");
                }
                // fill up the media_source cache
                this._state_h.attributes.file_list.map((entry, index) => { this.prepareVideoUrl(entry.video, false); });
                this._state_m.attributes.file_list.map((entry, index) => { this.prepareVideoUrl(entry.video, false); });        
            }
        }
    }

    render_images(entity) {

        return html`${ entity.attributes.file_list.map((entry, index) => {
                let thumb = this._getSizedURL(entry.image, "thumb");
                return html`<img class="thumbnail ${this._selectedThumbnail === thumb ? 'selected' : ''}" src="${thumb}" @click="${() => this.selectImage(thumb, entry.video)}">`;
            })
        }`;
    }

    render() {

        let content;
        if (!this._state_h || !this._state_m) {
            content = html`
                <p class="error">
                    ${this._state_h} is unavailable.
                </p>
            `;
        } else {
            content = html`

            <div class="container">
                <div class="view-pane">
                    <img src="${this._selectedImage}" @click="${this.toggleOverlay}" alt="View Image">
                    <button class="play-button ${this._mediaUrl !== "" ? 'visible' : ''}" @click="${this.toggleVideoPopup}">Play</button>
                </div>
                <div class="vertical-list">
                    ${this.render_images(this._state_h)}
                </div>
                <div class="horizontal-list">
                    ${this.render_images(this._state_m)}
                </div>
            </div>
        
            `;
        }
        return html`
            <ha-card>
                ${content}
                ${this._showOverlay ? html`
                <div class="overlay" @click="${this.toggleOverlay}">
                  <img src="${this._selectedImage.replace("_med", "")}" class="overlay-image">
                </div>
              ` : ''}              
            </ha-card>
        `;
    }

    toggleVideoPopup(e) {
        e.stopPropagation(); // Prevent triggering the view pane @click handler
        this._showVideoPopup = !this._showVideoPopup;
    }

    toggleOverlay() {
        this._showOverlay = !this._showOverlay;
    }

    selectImage(url, mediaContentId) {
        this._selectedThumbnail = url;
        this._selectedImage = url.replace("_thumb", "_med");
        this.prepareVideoUrl(mediaContentId)
    }

    async prepareVideoUrl(mediaContentId, setActive = true) {

        if (this._mediaUrlCache.has(mediaContentId)) {
            if (setActive)
                this._mediaUrl = this._mediaUrlCache.get(mediaContentId);
            return
        }
        try {
            
            if (setActive)
                this._mediaUrl = ""

            if (mediaContentId) {                          
                const response = await this._hass.callWS(
                    {
                        type: "media_source/resolve_media",
                        media_content_id: mediaContentId
                    });                    

                if (response && response.url) {
                    if (setActive)
                        this._mediaUrl = response.url;
                    this._mediaUrlCache.set(mediaContentId, response.url)
                }
            }
        } catch (error) {
            console.error('Error fetching media URL:', error);
        }
      }


    _getSizedURL(orgUrl, size="full") {
    
        let index = orgUrl.indexOf(".jpg");
        if (size == "thumb") 
          return orgUrl.substring(0, index) + "_thumb" + orgUrl.substring(index);
        if (size == "med")
          return orgUrl.substring(0, index) + "_med" + orgUrl.substring(index);
        
        return orgUrl;
    
      }

    static get styles() {
        return css`
        
            ha-card {
                padding: 10px 5px 10px 10px;
            }
            .container {
                display: grid;
                grid-template-rows: 1fr 20%; /* 20% for horizontal list, rest for view pane */
                grid-template-columns: 1fr 20%; /* 20% for vertical list, rest for view pane */
                width: 100%; /* Width is 100% of parent */
                aspect-ratio: 16 / 9; /* Fixed aspect ratio */
                overflow: hidden; /* Handle overflow */
            }
            
            .horizontal-list, .vertical-list {
                overflow: auto; /* Scroll bars for lists */
                display: flex; /* Flex layout for thumbnails */
                align-items: center; /* Center thumbnails */
            }
            
            .horizontal-list {
                grid-row: 2;
                grid-column: 1 / 3;
                flex-direction: row; /* Horizontal layout */
                margin: 7px 13px 0 0;
            }
            
            .vertical-list {
                grid-row: 1;
                grid-column: 2 / 3;
                flex-direction: column; /* Vertical layout */
                margin-left: 7px;
            }
            
            .view-pane {
                grid-row: 1;
                grid-column: 1 / 2;
                display: flex;
                align-items: center;
                justify-content: center;
                position: relative;
            }
            
            img {
                cursor: pointer;
                border-radius: 8px;
            }
            
            .horizontal-list img, .vertical-list img {
                max-width: 100%; /* Full width in their container */
                max-height: 100%; /* Full height in their container */
                object-fit: contain; /* Keep aspect ratio */
            }

            .horizontal-list img {
                margin-right: 8px; 
            }

            .vertical-list img {
                margin-bottom: 8px; 
            }
            
            .view-pane img {
                max-width: 100%; /* Full width of view pane */
                max-height: 100%; /* Full height of view pane */
                object-fit: contain; /* Keep aspect ratio */
            }
            

            /* Style the scrollbar track (the part the thumb sits in) */
            .horizontal-list::-webkit-scrollbar, .vertical-list::-webkit-scrollbar {
                width: 15px; /* Width for vertical scrollbar */
                height: 15px; /* Height for horizontal scrollbar */
            }
            
            /* Style the scrollbar thumb (the draggable part) */
            .horizontal-list::-webkit-scrollbar-thumb, .vertical-list::-webkit-scrollbar-thumb {
                background-color: darkgrey; /* Or any color you prefer */
                border: 5px solid white;
            }
            
            /* Optionally, style the scrollbar thumb when hovering */
            .horizontal-list::-webkit-scrollbar-thumb:hover, .vertical-list::-webkit-scrollbar-thumb:hover {
                background-color: grey; /* Or any color for hover state */
            }

            .overlay {
                position: fixed;
                top: 0;
                left: 0;
                width: 100vw;
                height: 100vh;
                background-color: rgba(0, 0, 0, 0.8); /* semi-transparent black */
                display: flex;
                align-items: center;
                justify-content: center;
                z-index: 10; /* Make sure it's above other content */
              }
              
              .overlay img {
                max-width: 95%;
                max-height: 95%;
              }

              .thumbnail {
                transition: opacity 0.2s ease; /* Smooth transition for the opacity change */
                opacity: 1; /* Full opacity by default */
              }
              
              .thumbnail.selected {
                opacity: 0.5; /* 50% transparency for the selected thumbnail */
              }
                            
              .play-button {
                position: absolute;
                bottom: 10px;
                right: 10px;
                visibility: hidden; /* Initially hidden */
                /* Style your play button */
              }
              .play-button.visible {
                visibility: visible;
              }


            `
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
