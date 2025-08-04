// debug.js
const logContainer = document.getElementById("debug-log");

export function debugLog(...args) {
  if (!logContainer) return;
  const msg = args.map(a => (typeof a === "object" ? JSON.stringify(a) : a)).join(" ");
  const line = document.createElement("div");
  line.textContent = msg;
  logContainer.appendChild(line);
  logContainer.scrollTop = logContainer.scrollHeight;
}
