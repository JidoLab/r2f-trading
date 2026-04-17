
const server = require("/opt/r2f-renderer/server.js");
// Just requiring the module would fail if regex is broken at parse time
console.log("Server module loaded");

// Simulate the text escape that was crashing
const wrappedText = "LINE ONE
LINE TWO";
try {
  const text = wrappedText.replace(/'/g, "’").replace(/:/g, "\:").replace(/\(?!n)/g, "\\\\").split("
").join(" ");
  console.log("Text escape OK:", text);
} catch (e) {
  console.log("Text escape FAIL:", e.message);
}
