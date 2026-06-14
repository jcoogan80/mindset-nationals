
/* ===== TAB BAR: sticky, scroll, center-active, edge fades ===== */
(function(){
  var bar,tabs;
  function hdrH(){var h=document.querySelector('.hdr');return h?h.getBoundingClientRect().height:56;}
  function setHdrVar(){document.documentElement.style.setProperty('--hdr-h',Math.round(hdrH())+'px');}
  function centerActive(smooth){
    if(!tabs)return;var act=tabs.querySelector('.tab.active');if(!act)return;
    var rel=(act.getBoundingClientRect().left-tabs.getBoundingClientRect().left)+tabs.scrollLeft;
    var target=rel-(tabs.clientWidth-act.offsetWidth)/2;
    target=Math.max(0,Math.min(target,tabs.scrollWidth-tabs.clientWidth));
    tabs.scrollTo({left:target,behavior:smooth?'smooth':'auto'});
  }
  function updateFades(){
    if(!bar||!tabs)return;
    bar.classList.toggle('can-left',tabs.scrollLeft>4);
    bar.classList.toggle('can-right',tabs.scrollLeft<tabs.scrollWidth-tabs.clientWidth-4);
  }
  function updateStuck(){
    if(!bar)return;
    var top=bar.getBoundingClientRect().top;
    bar.classList.toggle('stuck',Math.abs(top-hdrH())<2.5&&window.pageYOffset>4);
  }
  function init(){
    bar=document.getElementById('tabbar');tabs=document.getElementById('tabs');
    if(!bar||!tabs)return;
    setHdrVar();
    tabs.addEventListener('scroll',updateFades,{passive:true});
    window.addEventListener('resize',function(){setHdrVar();updateFades();centerActive(false);});
    var ticking=false;
    window.addEventListener('scroll',function(){if(!ticking){requestAnimationFrame(function(){updateStuck();ticking=false;});ticking=true;}},{passive:true});
    document.querySelectorAll('.tab').forEach(function(t){
      t.addEventListener('click',function(){
        setTimeout(function(){centerActive(true);},0);
        var y=window.pageYOffset+bar.getBoundingClientRect().top-hdrH();
        if(window.pageYOffset>y+2)window.scrollTo({top:y,behavior:'smooth'});
      });
    });
    requestAnimationFrame(function(){updateFades();centerActive(false);updateStuck();});
    if(document.fonts&&document.fonts.ready)document.fonts.ready.then(function(){setHdrVar();updateFades();centerActive(false);});
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();
