const KEY = "forge-shift-v1";
function emptySave() {
  return { version: 1, stars: {}, hints: {}, dailyDay: "", dailyStars: 0, bench: null, sound: true };
}
function loadSave() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return emptySave();
    const parsed = JSON.parse(raw);
    if (parsed.version !== 1) return emptySave();
    return { ...emptySave(), ...parsed, stars: parsed.stars ?? {}, hints: parsed.hints ?? {} };
  } catch {
    return emptySave();
  }
}
function writeSave(data) {
  localStorage.setItem(KEY, JSON.stringify(data));
}
export {
  emptySave,
  loadSave,
  writeSave
};
