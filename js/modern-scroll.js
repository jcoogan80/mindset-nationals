
/* ===== MODERN SCROLL EFFECTS (self-contained) ===== */
(function(){
  var root=document.documentElement;
  var reduce=window.matchMedia&&matchMedia('(prefers-reduced-motion: reduce)').matches;
  root.classList.add('js-reveal');

  function animateCount(el){
    var orig=(el.textContent||'').trim();
    var m=orig.match(/^(\D*?)([\d,]*\.?\d+)(\D*)$/);
    if(!m){return;}
    var prefix=m[1],numStr=m[2],suffix=m[3];
    var decimals=(numStr.split('.')[1]||'').length;
    var target=parseFloat(numStr.replace(/,/g,''));
    if(isNaN(target)){return;}
    var dur=1200,start=null;
    el.textContent=prefix+(decimals?(0).toFixed(decimals):'0')+suffix;
    function frame(ts){
      if(start===null)start=ts;
      var p=Math.min(1,(ts-start)/dur);
      var e=1-Math.pow(1-p,3);
      var val=target*e;
      el.textContent=prefix+(decimals?val.toFixed(decimals):Math.round(val).toLocaleString())+suffix;
      if(p<1)requestAnimationFrame(frame);else el.textContent=orig;
    }
    requestAnimationFrame(frame);
  }

  function init(){
    /* hero logo mirrors the header emblem */
    try{
      var hh=document.getElementById('hdr-logo'),hl=document.getElementById('hero-logo');
      if(hl){
        if(hh&&hh.getAttribute('src')&&hh.getAttribute('src').indexOf('data:')===0) hl.src=hh.getAttribute('src');
        else if(typeof LOGO_B64!=='undefined') hl.src='data:image/jpeg;base64,'+LOGO_B64;
        else if(hh&&hh.src) hl.src=hh.src;
      }
    }catch(e){}

    /* hero entrance */
    var hero=document.getElementById('hero');
    if(hero){requestAnimationFrame(function(){requestAnimationFrame(function(){hero.classList.add('ready');});});}

    /* reveal-on-scroll */
    var sel=['.team-banner','.stat-row','.trwrap','.sec-hd','.card','.pcard','.rcard','.fev','.thermo-wrap','.flog-wrap','.donor-wrap','table.st','.pki','.ggrid','.ubanner'];
    var nodes=[];
    sel.forEach(function(s){Array.prototype.forEach.call(document.querySelectorAll(s),function(n){if(!n.closest('.hero'))nodes.push(n);});});
    var groups={};
    nodes.forEach(function(n){
      n.setAttribute('data-reveal','');
      var key=n.parentElement?(n.parentElement.className||'p'):'p';
      var i=(groups[key]=(groups[key]||0));groups[key]++;
      var d=Math.min(i*60,300);if(d)n.style.transitionDelay=d+'ms';
    });
    if(reduce||!('IntersectionObserver' in window)){
      nodes.forEach(function(n){n.classList.add('reveal-in');});
    }else{
      var io=new IntersectionObserver(function(ents){
        ents.forEach(function(en){if(en.isIntersecting){en.target.classList.add('reveal-in');io.unobserve(en.target);}});
      },{threshold:0.12,rootMargin:'0px 0px -7% 0px'});
      nodes.forEach(function(n){io.observe(n);});
    }

    /* count-up on stat banner */
    var statRow=document.querySelector('.stat-row');
    if(statRow&&!reduce&&('IntersectionObserver' in window)){
      var io2=new IntersectionObserver(function(ents){
        ents.forEach(function(en){if(en.isIntersecting){Array.prototype.forEach.call(statRow.querySelectorAll('.spn'),function(el){animateCount(el);});io2.disconnect();}});
      },{threshold:0.4});
      io2.observe(statRow);
    }

    /* scroll-linked fx */
    var hdr=document.querySelector('.hdr');
    var prog=document.getElementById('scroll-progress');
    var toTop=document.getElementById('to-top');
    var heroInner=hero?hero.querySelector('.hero-inner'):null;
    var cue=hero?hero.querySelector('.hero-cue'):null;
    var ticking=false;
    function onScroll(){
      var y=window.pageYOffset||document.documentElement.scrollTop||0;
      var docH=document.documentElement.scrollHeight-window.innerHeight;
      if(prog)prog.style.width=(docH>0?Math.min(100,y/docH*100):0)+'%';
      if(hdr)hdr.classList.toggle('scrolled',y>40);
      if(toTop)toTop.classList.toggle('on',y>window.innerHeight*0.55);
      if(heroInner&&!reduce&&y<window.innerHeight*1.15){
        heroInner.style.transform='translateY('+(y*0.3)+'px)';
        var o=1-y/(window.innerHeight*0.72);heroInner.style.opacity=o<0?0:o;
      }
      if(cue)cue.style.opacity=y>30?'0':'';
      ticking=false;
    }
    window.addEventListener('scroll',function(){if(!ticking){window.requestAnimationFrame(onScroll);ticking=true;}},{passive:true});
    onScroll();
    if(toTop)toTop.addEventListener('click',function(){window.scrollTo({top:0,behavior:reduce?'auto':'smooth'});});

    /* hero countdown */
    var pad=function(n){return String(n).padStart(2,'0');};
    function tick(){
      var d=new Date('2026-06-25T08:00:00')-new Date();
      var ids=['hcd-d','hcd-h','hcd-m','hcd-s'];
      if(d<=0){ids.forEach(function(id){var e=document.getElementById(id);if(e)e.textContent='00';});return;}
      var map={'hcd-d':Math.floor(d/86400000),'hcd-h':Math.floor((d%86400000)/3600000),'hcd-m':Math.floor((d%3600000)/60000),'hcd-s':Math.floor((d%60000)/1000)};
      Object.keys(map).forEach(function(id){var e=document.getElementById(id);if(e)e.textContent=pad(map[id]);});
    }
    tick();setInterval(tick,1000);
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);
  else init();
})();
