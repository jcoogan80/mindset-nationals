
/* ===== PLAYER SPOTLIGHT (gallery / slideshow) ===== */
(function(){
  var GRID_IDS=['pgrid','staff-grid','cheer-grid'];
  var spot,spotCard,spotDots,curCards=[],curIndex=0;

  function txt(card,sel){var e=card.querySelector(sel);return e?e.textContent.trim():'';}
  function pidOf(card){return (card.id||'').replace(/^pc-/,'');}
  function esc(s){return String(s).replace(/[&<>"]/g,function(c){return{'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c];});}

  function roleFallback(card){
    var first=card.querySelector('.pbody > div');
    if(first && !first.classList.contains('pnum') && !first.classList.contains('pname') && !first.classList.contains('pstat') && !first.classList.contains('pig')) return first.textContent.trim();
    return '';
  }
  function readCard(card){
    var img=card.querySelector('.pwrap img');
    var pid=pidOf(card);
    var ract=document.getElementById('ract-'+pid);
    return {
      card:card,pid:pid,
      photo: img? (img.dataset.full||img.getAttribute('src')||'') : '',
      num: txt(card,'.pnum'),
      name: txt(card,'.pname'),
      position: txt(card,'[data-pf="position"]') || roleFallback(card),
      height: txt(card,'[data-pf="height"]'),
      instagram: txt(card,'[data-pf="instagram"]'),
      hasReelUI: !!card.querySelector('.rbox'),
      hasReel: !!(ract && ract.style.display!=='none')
    };
  }
  function igHref(h){
    if(!h) return '';
    if(/^https?:/i.test(h)) return h;
    var clean=h.replace(/^@/,'').trim();
    if(!clean || /^(instagram|instagramusername|username|handle)$/i.test(clean)) return '';
    return 'https://instagram.com/'+clean;
  }

  function buildSpot(){
    spot=document.createElement('div');
    spot.className='spot';spot.id='spot';spot.setAttribute('aria-hidden','true');
    spot.innerHTML=''
      +'<button class="spot-close" aria-label="Close"><i class="ti ti-x"></i></button>'
      +'<button class="spot-play" aria-label="Play slideshow"><i class="ti ti-player-play-filled"></i></button>'
      +'<button class="spot-nav prev" aria-label="Previous"><i class="ti ti-chevron-left"></i></button>'
      +'<div class="spot-card"></div>'
      +'<button class="spot-nav next" aria-label="Next"><i class="ti ti-chevron-right"></i></button>'
      +'<div class="spot-dots"></div>';
    document.body.appendChild(spot);
    spotCard=spot.querySelector('.spot-card');
    spotDots=spot.querySelector('.spot-dots');
    spot.querySelector('.spot-close').addEventListener('click',close);
    spot.querySelector('.spot-play').addEventListener('click',toggleAuto);
    spot.querySelector('.prev').addEventListener('click',function(){go(-1);});
    spot.querySelector('.next').addEventListener('click',function(){go(1);});
    spot.addEventListener('click',function(e){if(e.target===spot)close();});
    var sx=0,sy=0;
    spotCard.addEventListener('touchstart',function(e){sx=e.touches[0].clientX;sy=e.touches[0].clientY;},{passive:true});
    spotCard.addEventListener('touchend',function(e){
      var dx=e.changedTouches[0].clientX-sx,dy=e.changedTouches[0].clientY-sy;
      if(Math.abs(dx)>50&&Math.abs(dx)>Math.abs(dy))go(dx<0?1:-1);
    },{passive:true});
  }

  function render(){
    var d=readCard(curCards[curIndex]);
    var ig=igHref(d.instagram);
    var igText=(d.instagram&&!/^@?instagram$/i.test(d.instagram))?d.instagram:'';
    var jersey=d.num?(d.num.charAt(0)==='#'?d.num:('#'+d.num)):'';
    var html=''
      +'<div class="spot-photo">'
        +(d.num?'<span class="spot-bignum">'+esc(d.num.replace(/^#/,''))+'</span>':'')
        +(d.photo?'<img src="'+esc(d.photo)+'" alt="'+esc(d.name)+'" onerror="this.style.display=\'none\'">':'')
        +'<div class="spot-cap"><div class="spot-name">'+esc(d.name||'')+'</div>'
        +(d.position?'<span class="spot-pos">'+esc(d.position)+'</span>':'')+'</div>'
      +'</div>'
      +'<div class="spot-meta">';
    if(jersey||d.height){
      html+='<div class="spot-rows">'
        +(jersey?'<div class="spot-stat"><span>Jersey</span><b>'+esc(jersey)+'</b></div>':'')
        +(d.hasReelUI?'<div class="spot-stat"><span>Height</span><b>'+esc(d.height&&d.height!=='—'?d.height:'—')+'</b></div>':'')
      +'</div>';
    }
    html+=(igText&&ig?'<a class="spot-ig" href="'+esc(ig)+'" target="_blank" rel="noopener"><i class="ti ti-brand-instagram"></i>'+esc(igText)+'</a>':igText?'<div class="spot-ig"><i class="ti ti-brand-instagram"></i>'+esc(igText)+'</div>':'<div class="spot-ig" style="visibility:hidden" aria-hidden="true"><i class="ti ti-brand-instagram"></i></div>');
    if(d.hasReelUI) html+='<button class="spot-reel"><i class="ti ti-player-play-filled"></i>'+(d.hasReel?'Watch Highlights':'Add Highlight Reel')+'</button>';
    html+='</div>';
    spotCard.innerHTML=html;
    var rb=spotCard.querySelector('.spot-reel');
    if(rb) rb.addEventListener('click',function(){if(typeof openReel==='function')openReel(d.pid,d.name||'');});
    spotDots.innerHTML='';
    if(curCards.length>1){
      curCards.forEach(function(_,i){
        var dot=document.createElement('button');dot.className='spot-dot'+(i===curIndex?' on':'');dot.setAttribute('aria-label','Go to '+(i+1));
        dot.addEventListener('click',function(){curIndex=i;render();});
        spotDots.appendChild(dot);
      });
    }
    spot.querySelector('.prev').style.display=curCards.length>1?'':'none';
    spot.querySelector('.next').style.display=curCards.length>1?'':'none';
  }
  function go(dir){if(!curCards.length)return;curIndex=(curIndex+dir+curCards.length)%curCards.length;render();}

  var auto=null;
  function setPlayIcon(){var b=spot&&spot.querySelector('.spot-play i');if(b)b.className='ti '+(auto?'ti-player-pause-filled':'ti-player-play-filled');}
  function startAuto(){stopAuto();auto=setInterval(function(){go(1);},3500);setPlayIcon();}
  function stopAuto(){if(auto){clearInterval(auto);auto=null;}setPlayIcon();}
  function toggleAuto(){if(auto)stopAuto();else startAuto();}
  function open(card,play){
    var grid=card.closest('#pgrid,#staff-grid,#cheer-grid')||card.parentElement;
    curCards=[].slice.call(grid.querySelectorAll('.pcard'));
    curIndex=Math.max(0,curCards.indexOf(card));
    if(!spot)buildSpot();
    render();
    spot.classList.add('on');spot.setAttribute('aria-hidden','false');
    document.body.style.overflow='hidden';
    if(play&&curCards.length>1)startAuto();else stopAuto();
  }
  function close(){if(!spot)return;stopAuto();spot.classList.remove('on');spot.setAttribute('aria-hidden','true');document.body.style.overflow='';}
  window.openSpotlight=open;

  function addViewButtons(){
    GRID_IDS.forEach(function(gid){
      var g=document.getElementById(gid);if(!g)return;
      [].forEach.call(g.querySelectorAll('.pcard'),function(card){
        var wrap=card.querySelector('.pwrap');if(!wrap||wrap.querySelector('.pview'))return;
        var b=document.createElement('button');b.type='button';b.className='pview';b.setAttribute('aria-label','View profile');
        b.innerHTML='<i class="ti ti-arrows-maximize"></i>';
        b.addEventListener('click',function(e){e.stopPropagation();open(card);});
        wrap.appendChild(b);
      });
    });
  }
  function init(){
    GRID_IDS.forEach(function(gid){
      var g=document.getElementById(gid);if(!g)return;
      g.addEventListener('click',function(e){
        if(document.body.classList.contains('em'))return;
        if(e.target.closest('button,a,input,textarea,summary,details,[contenteditable="true"],.rbox,.pig,.pview'))return;
        var card=e.target.closest('.pcard');if(card)open(card);
      });
      new MutationObserver(function(){addViewButtons();}).observe(g,{childList:true});
    });
    addViewButtons();
    var pa=document.getElementById('playall-players');
    if(pa)pa.addEventListener('click',function(){var f=document.querySelector('#pgrid .pcard');if(f)open(f,true);});
    document.addEventListener('keydown',function(e){
      if(!spot||!spot.classList.contains('on'))return;
      if(e.key==='Escape')close();
      else if(e.key==='ArrowLeft')go(-1);
      else if(e.key==='ArrowRight')go(1);
    });
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);
  else init();
})();
