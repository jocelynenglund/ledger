// Sample models bundled with Ledger. Each entry:
//   id          stable identifier
//   label       button text in the settings panel
//   jsonUrl     model file under assets/
//   sourceUrl   where the model is authored / lives (shown in chrome)
//   sourceLabel short text rendered next to the source link
//   visible     hide a sample without removing its JSON
//   default     the one auto-loaded on first visit
//
// Toggle `visible: true` once permission is granted.
window.SAMPLES = [
  {
    id: 'cart',
    label: 'Cart Shop',
    jsonUrl: 'assets/sample.json',
    sourceUrl: 'https://github.com/jocelynenglund/cartshop/',
    sourceLabel: 'github.com/jocelynenglund/cartshop',
    visible: true,
    default: true,
  },
  {
    id: 'license',
    label: 'License Management',
    jsonUrl: 'assets/registration.json',
    sourceUrl: 'https://app.eventmodelers.de',
    sourceLabel: 'app.eventmodelers.de',
    visible: false,
  },
];

window.findSample = function findSample(id) {
  return (window.SAMPLES || []).find(s => s.id === id) || null;
};
window.defaultSample = function defaultSample() {
  return (window.SAMPLES || []).find(s => s.default && s.visible)
      || (window.SAMPLES || []).find(s => s.visible)
      || null;
};
