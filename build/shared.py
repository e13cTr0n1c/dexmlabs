"""Bits shared by every page: the theme script that runs before paint, and the header points chip and theme toggle.
Used by gen.py (generated pages) and chrome.py (the game pages)."""
import hashlib, base64
# Theme: this inline script is the first script on every page, so the right theme is set before anything paints.
# Pages with a Content-Security-Policy allow it by its hash (THEME_HASH).
THEME_SCRIPT="(function(){var d=document.documentElement,t;try{t=localStorage.getItem('dexm:theme')}catch(e){}if(t!=='light'&&t!=='dark')t=window.matchMedia&&matchMedia('(prefers-color-scheme: light)').matches?'light':'dark';d.setAttribute('data-theme',t)})();"
THEME_HASH="'sha256-"+base64.b64encode(hashlib.sha256(THEME_SCRIPT.encode()).digest()).decode()+"'"
COIN='<svg viewBox="0 0 16 16" aria-hidden="true"><circle class="c" cx="8" cy="8" r="6.5"/><path d="M8 5v6M6 7h4"/></svg>'
MOON='<svg class="moon" viewBox="0 0 16 16" aria-hidden="true"><path d="M13.5 9.6A5.8 5.8 0 1 1 6.4 2.5a4.6 4.6 0 0 0 7.1 7.1z"/></svg>'
SUN='<svg class="sun" viewBox="0 0 16 16" aria-hidden="true"><circle cx="8" cy="8" r="3"/><path d="M8 1v2M8 13v2M1 8h2M13 8h2M3 3l1.4 1.4M11.6 11.6 13 13M3 13l1.4-1.4M11.6 4.4 13 3"/></svg>'
def tools(r):
  """The points chip and the theme toggle, for the header of every page."""
  return f'<div class="dexm-tools"><button type="button" class="dexm-chip" data-points-chip data-points-page="{r}points/" aria-haspopup="dialog">{COIN}<span class="dexm-sr">Points </span><span data-points-balance></span></button><button type="button" class="dexm-theme" data-theme-toggle aria-label="Switch theme">{MOON}{SUN}</button></div>'
def shared_head(r):
  return f'<link rel="stylesheet" href="{r}assets/dexm-ui.css"><script src="{r}assets/points.js" defer></script><script src="{r}assets/theme.js" defer></script>'
