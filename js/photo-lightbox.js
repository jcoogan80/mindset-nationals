
/* ===== PHOTO LIGHTBOX (gallery + team photo) ===== */
(function(){
  var lbx,lbxImg,lbxCount,curImgs=[],idx=0;
  function build(){
    lbx=document.createElement('div');lbx.className='lbx';lbx.setAttribute('aria-hidden','true');
    lbx.innerHTML=''
      +'<button class="lbx-close" aria-label="Close"><i class="ti ti-x"></i></button>'
      +'<button class="lbx-play" aria-label="Play slideshow"><i class="ti ti-player-play-filled"></i></button>'
      +'<button class="lbx-nav prev" aria-label="Previous"><i class="ti ti-chevron-left"></i></button>'
      +'<div class="lbx-stage"><img class="lbx-img" alt=""></div>'
      +'<button class="lbx-nav next" aria-label="Next"><i class="ti ti-chevron-right"></i></button>'
      +'<div class="lbx-count"></div>';
    document.body.appendChild(lbx);
    lbxImg=lbx.querySelector('.lbx-img');lbxCount=lbx.querySelector('.lbx-count');
    lbx.querySelector('.lbx-close').addEventListener('click',close);
    lbx.querySelector('.lbx-play').addEventListener('click',toggleAuto);
    lbx.querySelector('.prev').addEventListener('click',function(e){e.stopPropagation();go(-1);});
    lbx.querySelector('.next').addEventListener('click',function(e){e.stopPropagation();go(1);});
    lbx.addEventListener('click',function(e){if(e.target===lbx||e.target.classList.contains('lbx-stage'))close();});
    var sx=0,sy=0;
    lbx.addEventListener('touchstart',function(e){sx=e.touches[0].clientX;sy=e.touches[0].clientY;},{passive:true});
    lbx.addEventListener('touchend',function(e){var dx=e.changedTouches[0].clientX-sx,dy=e.changedTouches[0].clientY-sy;if(Math.abs(dx)>50&&Math.abs(dx)>Math.abs(dy))go(dx<0?1:-1);},{passive:true});
    document.addEventListener('keydown',function(e){if(!lbx||lbx.getAttribute('aria-hidden')==='true')return;if(e.key==='Escape')close();else if(e.key==='ArrowLeft')go(-1);else if(e.key==='ArrowRight')go(1);});
  }
  function render(){lbxImg.src=curImgs[idx]||'';var multi=curImgs.length>1;lbxCount.textContent=multi?(idx+1)+' / '+curImgs.length:'';lbx.querySelector('.prev').style.display=multi?'':'none';lbx.querySelector('.next').style.display=multi?'':'none';var pb=lbx.querySelector('.lbx-play');if(pb){pb.style.display=multi?'':'none';if(!multi)stopAuto();}}
  function go(d){if(!curImgs.length)return;idx=(idx+d+curImgs.length)%curImgs.length;render();}
  function open(imgs,start){curImgs=imgs;idx=start||0;if(!lbx)build();render();lbx.classList.add('on');lbx.setAttribute('aria-hidden','false');document.body.style.overflow='hidden';}
  var auto=null;
  function setPlayIcon(){var b=lbx&&lbx.querySelector('.lbx-play i');if(b)b.className='ti '+(auto?'ti-player-pause-filled':'ti-player-play-filled');}
  function startAuto(){if(curImgs.length<2)return;stopAuto();auto=setInterval(function(){go(1);},3500);setPlayIcon();}
  function stopAuto(){if(auto){clearInterval(auto);auto=null;}setPlayIcon();}
  function toggleAuto(){if(auto)stopAuto();else startAuto();}
  function close(){if(!lbx)return;stopAuto();lbx.classList.remove('on');lbx.setAttribute('aria-hidden','true');document.body.style.overflow='';}
  window.openLightbox=open;
  function galleryImgs(){var out=[];[].forEach.call(document.querySelectorAll('#gallery .gslot.has img'),function(im){out.push(im.src);});return out;}
  function init(){
    var g=document.getElementById('gallery');
    if(g){g.addEventListener('click',function(e){
      if(document.body.classList.contains('em'))return;
      if(e.target.closest('.gdel'))return;
      var slot=e.target.closest('.gslot');if(!slot||!slot.classList.contains('has'))return;
      var im=slot.querySelector('img');if(!im)return;
      var imgs=galleryImgs();var start=imgs.indexOf(im.src);if(start<0)start=0;
      open(imgs,start);
    });}
    var tb=document.querySelector('.team-banner');
    if(tb)tb.addEventListener('click',function(){var im=tb.querySelector('img');if(im)open([im.src],0);});
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);
  else init();
})();
