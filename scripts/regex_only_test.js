
const wrappedText = "LINE ONE
LINE TWO";
try {
  const text = wrappedText.replace(/'/g, "’").replace(/:/g, "\:").replace(/\(?!n)/g, "\\\\").split("
").join(" ");
  console.log("OK:", text);
} catch (e) {
  console.log("ERROR:", e.message);
}
