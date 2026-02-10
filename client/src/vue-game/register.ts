import { defineCustomElement } from 'vue'
import GameRoot from './GameRoot.ce.vue'

const element = defineCustomElement(GameRoot)

if (!customElements.get('vlackjack-game')) {
  customElements.define('vlackjack-game', element)
}
