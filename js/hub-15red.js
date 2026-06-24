// ═══════════════════════════════════════════════════════════════════
//  hub-15red.js — Premier 15 Red plugin
//  Adds: Team Highlight Reel (single embed with edit/clear)
//  Loaded AFTER hub.js; hooks in through window.Hub.
// ═══════════════════════════════════════════════════════════════════
(() => {
  const Hub = window.Hub;
  if (!Hub) return;

  const $ = (id) => document.getElementById(id);

  function toggleTREdit() {
    const p = $('tr-edit-panel');
    const on = p.style.display !== 'none';
    p.style.display = on ? 'none' : 'block';
    if (!on && Hub.data.hub.team_reel_url) $('tr-url-in').value = Hub.data.hub.team_reel_url;
  }

  function applyTREmbed(url) {
    const e = Hub.toEmbed(url);
    if (!e) return;
    $('trph').style.display = 'none';
    $('triframe').style.display = 'block';
    $('triframe-el').src = e;
  }

  function saveTR() {
    const url = $('tr-url-in').value.trim();
    if (!url) return;
    Hub.data.hub.team_reel_url = url;
    applyTREmbed(url);
    Hub.save();
    toggleTREdit();
    Hub.toast('Team reel saved!');
  }

  function clearTR() {
    Hub.data.hub.team_reel_url = '';
    $('trph').style.display = 'flex';
    $('triframe').style.display = 'none';
    $('triframe-el').src = '';
    Hub.save();
    toggleTREdit();
  }

  Hub.onRender(() => { if (Hub.data.hub.team_reel_url) applyTREmbed(Hub.data.hub.team_reel_url); });
  Hub.expose({ toggleTREdit, saveTR, clearTR, applyTREmbed });
})();
