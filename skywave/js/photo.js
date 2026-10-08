/* Arthur's photo. If img/arthur.jpg loads, it replaces the initial; if not, the initial stays. */
(function(){
  function run(){
    var figs=document.querySelectorAll('[data-photo]');
    for(var i=0;i<figs.length;i++)(function(fig){
      var img=fig.querySelector('img');if(!img)return;
      var probe=new Image();
      probe.onload=function(){img.src=probe.src;img.hidden=false;fig.classList.add('has-photo');};
      probe.onerror=function(){img.hidden=true;fig.classList.remove('has-photo');};
      probe.src=fig.getAttribute('data-photo');
    })(figs[i]);
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',run);else run();
})();
