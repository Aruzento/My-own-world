export function createCampaignMapTemplate() {

  return {
    name: 'Карта',
    template: 'campaignMap',
    type: 'campaignMap',
    tags: ['campaign-map'],
    iconSvg: `
      <svg viewBox="0 0 24 24">
        <path d="M9 18l-6 3v-15l6 -3l6 3l6 -3v15l-6 3z"></path>
        <path d="M9 3v15"></path>
        <path d="M15 6v15"></path>
      </svg>
    `,
    content: `
      <div
        class="campaign-map-document"
        data-campaign-map="v1"
        contenteditable="false"
      >
        <div class="campaign-map-topbar" contenteditable="false">
          <h1
            class="campaign-map-title singleline-field"
            contenteditable="true"
            data-placeholder="Название карты"
          >
            Новая карта
          </h1>
        </div>

        <div
          class="campaign-map-stage"
          data-grid="false"
          data-fog-mode="draw"
          data-fog-image=""
          contenteditable="false"
        >
          <div class="campaign-map-viewport">
            <div class="campaign-map-background"></div>
            <div class="campaign-map-object-layer"></div>
            <canvas class="campaign-map-fog-canvas"></canvas>
          </div>
        </div>
      </div>
    `
  };
}
