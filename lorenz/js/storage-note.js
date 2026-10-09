/* Storage notice: shown until dismissed. The dismissal itself is saved in localStorage. No cookies. */
(function(){
  var KEY='dexm:storage-note-dismissed';
  try{if(localStorage.getItem(KEY))return;}catch(e){}
  var s=document.currentScript,href=(s&&s.getAttribute('data-cookies'))||'/cookies/';
  function show(){
    var bar=document.createElement('div');bar.className='storage-note';bar.setAttribute('role','region');bar.setAttribute('aria-label','Storage notice');
    bar.innerHTML='<p>This site uses browser storage only to save game progress and settings. No cookies, and visits are only counted in aggregate. <a href="'+href+'">Cookies and storage</a></p><button type="button">OK</button>';
    bar.querySelector('button').addEventListener('click',function(){try{localStorage.setItem(KEY,'1');}catch(e){}bar.remove();});
    document.body.appendChild(bar);
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',show);else show();
})();
