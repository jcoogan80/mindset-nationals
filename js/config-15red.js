// ─────────────────────────────────────────────────────────────────
//  Team config — Mindset Premier 15 Red
//  Loaded BEFORE gallery.js and hub.js. Data only; no logic.
// ─────────────────────────────────────────────────────────────────
window._GALLERY_TEAM = '15red';

window.HUB_CONFIG = Object.freeze({
  team: '15red',
  dataFile: '15red-data.json',
  teamName: 'Mindset Premier 15 Red',

  pool: Object.freeze({
    id: 'R1P5',
    prefix: 'p5',
    mindsetSeed: 25,
    teams: [
      { name: 'GP 15 National',          seed: 5,  region: 'FL' },
      { name: 'Mindset Premier 15 Red',  seed: 25, region: 'IL' },
      { name: '540 VB 15 Elite',         seed: 38, region: 'VA' },
      { name: 'Premier Nebraska 15 Red', seed: 60, region: 'NE' },
      { name: 'Red Rock 15 Chi',         seed: 70, region: 'NC' },
      { name: '949 G15 Black',           seed: 92, region: 'CA' },
    ],
  }),

  players: [
    { id: '15-amelia-l',   num: '##', name: 'Amelia L.',   pos: 'Position' },
    { id: '15-andrea-k',   num: '##', name: 'Andrea K.',   pos: 'Position' },
    { id: '15-ema-v',      num: '##', name: 'Ema V.',      pos: 'Position' },
    { id: '15-emma-l',     num: '##', name: 'Emma L.',     pos: 'Position' },
    { id: '15-evette-t',   num: '##', name: 'Evette T.',   pos: 'Position' },
    { id: '15-isabella-r', num: '##', name: 'Isabella R.', pos: 'Position' },
    { id: '15-izzie-r',    num: '##', name: 'Izzie R.',    pos: 'Position' },
    { id: '15-liana-l',    num: '##', name: 'Liana L.',    pos: 'Position' },
    { id: '15-nicole-t',   num: '##', name: 'Nicole T.',   pos: 'Position' },
    { id: '15-victoria-g', num: '##', name: 'Victoria G.', pos: 'Position' },
  ],

  staff: [
    { id: 'coach15-head',  role: 'Head Coach', name: 'Jake Achettu', instagram: '' },
    { id: 'coach15-asst',  role: 'Asst Coach', name: 'Elmina Alic',  instagram: '' },
    { id: 'coach15-owner', role: 'Owner',      name: 'Randy Satovitz', instagram: '' },
  ],

  // 15 Red has no cheerleaders section.
  cheerleaders: [],
});
