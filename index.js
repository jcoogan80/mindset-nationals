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
