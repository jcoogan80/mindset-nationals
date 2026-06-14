
/* ===== SWIPE BETWEEN MAIN SECTIONS ===== */
(function(){
  var startX=0,startY=0,startT=0,tracking=false,startEl=null;
  function sectionTabs(){return [].slice.call(document.querySelectorAll('.tab[data-tab]'));}
  function blocked(el){return !!(el&&el.closest&&el.closest('.tabs,.dtabs,.spot,.lbx,table,.st,input,textarea,select,[contenteditable="true"],.trwrap,.pwrap,details,.thermo-wrap'));}
  document.addEventListener('touchstart',function(e){
    if(e.touches.length!==1){tracking=false;return;}
    var t=e.touches[0];startX=t.clientX;startY=t.clientY;startT=Date.now();startEl=e.target;tracking=true;
  },{passive:true});
  document.addEventListener('touchend',function(e){
    if(!tracking)return;tracking=false;
    if(document.body.classList.contains('em'))return;
    var sp=document.getElementById('spot'),lb=document.querySelector('.lbx');
    if((sp&&sp.classList.contains('on'))||(lb&&lb.classList.contains('on')))return;
    if(blocked(startEl))return;
    var t=e.changedTouches[0];var dx=t.clientX-startX,dy=t.clientY-startY,dt=Date.now()-startT;
    if(dt>700)return;
    if(Math.abs(dx)<70||Math.abs(dx)<Math.abs(dy)*1.8)return;
    var arr=sectionTabs();var ai=-1;
    for(var i=0;i<arr.length;i++){if(arr[i].classList.contains('active')){ai=i;break;}}
    if(ai<0)return;
    var ni=ai+(dx<0?1:-1);
    if(ni<0||ni>=arr.length)return;
    arr[ni].click();
  },{passive:true});
})();
