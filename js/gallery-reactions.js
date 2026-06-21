(function () {
  var WORKER = 'https://mindset-gallery.wenga-eric.workers.dev';
  var IDB_NAME = 'gallery-reactions-cache';
  var IDB_STORE = 'reactionsByTeam';

  var _map = {};
  var _callbacks = {};
  var _idb = null;

  function openIdb() {
    return new Promise(function (resolve) {
      var req = indexedDB.open(IDB_NAME, 1);
      req.onupgradeneeded = function (e) {
        e.target.result.createObjectStore(IDB_STORE);
      };
      req.onsuccess = function (e) { resolve(e.target.result); };
      req.onerror = function () { resolve(null); };
    });
  }

  function getIdb() {
    if (_idb) return Promise.resolve(_idb);
    return openIdb().then(function (db) { _idb = db; return db; });
  }

  function idbRead(team) {
    return getIdb().then(function (db) {
      if (!db) return null;
      return new Promise(function (resolve) {
        var tx = db.transaction(IDB_STORE, 'readonly');
        var req = tx.objectStore(IDB_STORE).get(team);
        req.onsuccess = function () { resolve(req.result || null); };
        req.onerror = function () { resolve(null); };
      });
    }).catch(function () { return null; });
  }

  function idbWrite(team, map) {
    return getIdb().then(function (db) {
      if (!db) return;
      return new Promise(function (resolve) {
        var tx = db.transaction(IDB_STORE, 'readwrite');
        tx.objectStore(IDB_STORE).put(map, team);
        tx.oncomplete = resolve;
        tx.onerror = resolve;
      });
    }).catch(function () {});
  }

  function fireCallbacks(key) {
    var cbs = _callbacks[key];
    if (cbs) cbs.forEach(function (fn) { try { fn(_map[key] || null); } catch (e) {} });
  }

  function mergeMap(incoming) {
    Object.keys(incoming).forEach(function (key) {
      var prev = _map[key];
      var next = incoming[key];
      var changed = !prev
        || prev.mine !== next.mine
        || prev.counts.heart !== next.counts.heart
        || prev.counts.thumbsup !== next.counts.thumbsup
        || prev.counts.laughing !== next.counts.laughing;
      _map[key] = next;
      if (changed) fireCallbacks(key);
    });
  }

  window.GalleryReactions = {
    getDeviceId: function () {
      var id = localStorage.getItem('gallery_device_id');
      if (!id) {
        id = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
          var r = Math.random() * 16 | 0;
          return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
        });
        localStorage.setItem('gallery_device_id', id);
      }
      return id;
    },

    fetch: function (team, keys) {
      if (!keys || !keys.length) return Promise.resolve();
      var self = this;
      var deviceId = self.getDeviceId();

      idbRead(team).then(function (cached) {
        if (cached) mergeMap(cached);
      });

      var url = WORKER + '/reactions?team=' + encodeURIComponent(team)
        + '&keys=' + keys.map(encodeURIComponent).join(',')
        + '&deviceId=' + encodeURIComponent(deviceId);

      return fetch(url)
        .then(function (r) { return r.json(); })
        .then(function (data) {
          if (data && data.reactions) {
            mergeMap(data.reactions);
            idbWrite(team, _map);
          }
        })
        .catch(function () {});
    },

    post: function (team, imageKey, reaction) {
      var self = this;
      var deviceId = self.getDeviceId();
      var prev = _map[imageKey]
        ? { counts: Object.assign({}, _map[imageKey].counts), mine: _map[imageKey].mine }
        : { counts: { heart: 0, thumbsup: 0, laughing: 0 }, mine: null };

      var nextCounts = Object.assign({}, prev.counts);
      if (prev.mine) nextCounts[prev.mine] = Math.max(0, (nextCounts[prev.mine] || 0) - 1);
      nextCounts[reaction] = (nextCounts[reaction] || 0) + 1;
      _map[imageKey] = { counts: nextCounts, mine: reaction };
      fireCallbacks(imageKey);
      idbWrite(team, _map);

      return fetch(WORKER + '/reactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ team: team, imageKey: imageKey, deviceId: deviceId, reaction: reaction })
      }).then(function (r) {
        if (!r.ok) throw new Error('post failed');
      }).catch(function () {
        _map[imageKey] = prev;
        fireCallbacks(imageKey);
        idbWrite(team, _map);
      });
    },

    getMap: function () { return _map; },

    onUpdate: function (key, callback) {
      if (!_callbacks[key]) _callbacks[key] = [];
      _callbacks[key].push(callback);
      return function () {
        if (_callbacks[key]) {
          _callbacks[key] = _callbacks[key].filter(function (fn) { return fn !== callback; });
        }
      };
    }
  };
})();
