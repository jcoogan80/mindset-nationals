/* install prompt */
(function(){
  var isStandalone=window.matchMedia('(display-mode:standalone)').matches||window.navigator.standalone;
  if(isStandalone)return;
  if(sessionStorage.getItem('pwa-dismissed'))return;

  var banner=document.getElementById('install-banner');
  var btn=document.getElementById('install-btn');
  var close=document.getElementById('install-close');
  var hint=document.getElementById('install-hint');
  var deferred;

  close.addEventListener('click',function(){
    banner.hidden=true;
    sessionStorage.setItem('pwa-dismissed','1');
  });

  var isIOS=/iphone|ipad|ipod/i.test(navigator.userAgent)&&!window.MSStream;
  var isSafari=/^((?!chrome|android).)*safari/i.test(navigator.userAgent);
  if(isIOS&&isSafari){
    hint.textContent='Tap the Share button ↗ then “Add to Home Screen”';
    btn.hidden=true;
    setTimeout(function(){banner.hidden=false;},3000);
    return;
  }

  window.addEventListener('beforeinstallprompt',function(e){
    e.preventDefault();
    deferred=e;
    setTimeout(function(){banner.hidden=false;},2000);
  });

  btn.addEventListener('click',function(){
    if(!deferred)return;
    deferred.prompt();
    deferred.userChoice.then(function(){
      banner.hidden=true;
      deferred=null;
    });
  });

  window.addEventListener('appinstalled',function(){banner.hidden=true;});
})();

/* entrance */
requestAnimationFrame(function(){requestAnimationFrame(function(){document.body.classList.add('ready');});});
document.body.classList.add('js');

/* countdown */
(function(){
  var pad=function(n){return String(n).padStart(2,'0');};
  function tick(){
    var d=new Date('2026-06-25T08:00:00')-new Date();
    var row=document.getElementById('cd-row');
    if(d<=0){if(row)row.innerHTML='<span class="cd-go">GAME TIME!</span>';return;}
    var map={'cd-d':Math.floor(d/86400000),'cd-h':Math.floor((d%86400000)/3600000),'cd-m':Math.floor((d%3600000)/60000),'cd-s':Math.floor((d%60000)/1000)};
    Object.keys(map).forEach(function(id){var e=document.getElementById(id);if(e)e.textContent=pad(map[id]);});
  }
  tick();setInterval(tick,1000);
})();

/* reveal on scroll */
(function(){
  var reduce=matchMedia('(prefers-reduced-motion: reduce)').matches;
  var nodes=[].slice.call(document.querySelectorAll('[data-reveal]'));
  if(reduce||!('IntersectionObserver' in window)){nodes.forEach(function(n){n.classList.add('in');});return;}
  var io=new IntersectionObserver(function(ents){
    ents.forEach(function(en){if(en.isIntersecting){en.target.classList.add('in');io.unobserve(en.target);}});
  },{threshold:.15,rootMargin:'0px 0px -8% 0px'});
  nodes.forEach(function(n){io.observe(n);});
})();

/* scroll progress + parallax + hide cue */
(function(){
  var reduce=matchMedia('(prefers-reduced-motion: reduce)').matches;
  var prog=document.getElementById('scroll-progress');
  var cue=document.querySelector('.hero-cue');
  var med=document.querySelector('.medallion');
  var ticking=false;
  function onScroll(){
    var y=window.pageYOffset||0;
    var docH=document.documentElement.scrollHeight-window.innerHeight;
    if(prog)prog.style.width=(docH>0?Math.min(100,y/docH*100):0)+'%';
    if(cue)cue.style.opacity=y>30?'0':'';
    if(med&&!reduce&&y<window.innerHeight){med.style.transform='translateY('+(y*0.18)+'px)';}
    ticking=false;
  }
  window.addEventListener('scroll',function(){if(!ticking){requestAnimationFrame(onScroll);ticking=true;}},{passive:true});
  onScroll();
})();
