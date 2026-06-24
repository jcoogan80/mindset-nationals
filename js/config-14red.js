// ─────────────────────────────────────────────────────────────────
//  Team config — Mindset Premier 14 Red
//  Loaded BEFORE gallery.js and hub.js. Data only; no logic.
// ─────────────────────────────────────────────────────────────────
window._GALLERY_TEAM = '14red';

window.HUB_CONFIG = Object.freeze({
  team: '14red',
  dataFile: '14red-data.json',
  teamName: 'Mindset Premier 14 Red',

  pool: Object.freeze({
    id: 'R1P9',
    prefix: 'p9',
    mindsetSeed: 21,
    teams: [
      { name: 'PSVA 14-1',              seed: 9,  region: 'FL' },
      { name: 'Mindset Premier 14 Red', seed: 21, region: 'IL' },
      { name: 'SNVF 14 BLIZZARD',       seed: 42, region: 'WA' },
      { name: 'DYNASTY 14 Gold',        seed: 56, region: 'KS' },
      { name: 'UNION 14 Black',         seed: 74, region: 'PR' },
      { name: 'CMASS Edge 14 Black',    seed: 88, region: 'MA' },
    ],
  }),

  players: [
    { id: 'alena-h',   num: '14', name: 'Alena H.',   pos: 'Middle / Right Side' },
    { id: 'emily-o',   num: '21', name: 'Emily O.',   pos: 'Setter / Libero' },
    { id: 'emma-s',    num: '23', name: 'Emma S.',    pos: 'Middle Hitter' },
    { id: 'hailey-y',  num: '3',  name: 'Hailey Y.',  pos: 'DS / Libero' },
    { id: 'katrin-s',  num: '5',  name: 'Katrin S.',  pos: 'DS / Libero' },
    { id: 'lily-j',    num: '6',  name: 'Lily J.',    pos: 'Outside Hitter' },
    { id: 'reese-c',   num: '31', name: 'Reese C.',   pos: 'Outside Hitter' },
    { id: 'clarice-b', num: '58', name: 'Clarice B.', pos: 'Right Side Hitter' },
    { id: 'peyton-b',  num: '10', name: 'Peyton B.',  pos: 'Setter' },
  ],

  staff: [
    { id: 'coach-head',  role: 'Head Coach', name: 'Billy Koulouvaris', instagram: '' },
    { id: 'coach-asst',  role: 'Asst Coach', name: 'Marc Karam',        instagram: '' },
    { id: 'coach-owner', role: 'Owner',      name: 'Randy Satovitz',    instagram: '' },
  ],

  cheerleaders: [
    { id: 'cheer-sydney', role: 'Team Cheerleader', name: 'Sydney Coogan', instagram: '' },
    { id: 'cheer-olivia', role: 'Team Cheerleader', name: 'Olivia Orozco', instagram: '' },
  ],
});
