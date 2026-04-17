const { generateAss } = require("./do-caption-ass.js");

const testCaptions = [
  {
    text: "I BLEW 3 ACCOUNTS",
    start: 0.5,
    end: 2.3,
    isHook: true,
    words: [
      { word: "I", start: 0.5, end: 0.7, style: "normal" },
      { word: "BLEW", start: 0.7, end: 1.1, style: "warning" },
      { word: "3", start: 1.1, end: 1.4, style: "number" },
      { word: "ACCOUNTS", start: 1.4, end: 2.3, style: "money" },
    ],
  },
  {
    text: "THEN ONE THING CHANGED",
    start: 2.3,
    end: 3.8,
    isHook: false,
    words: [
      { word: "THEN", start: 2.3, end: 2.6, style: "normal" },
      { word: "ONE", start: 2.6, end: 2.9, style: "number" },
      { word: "THING", start: 2.9, end: 3.2, style: "highlight" },
      { word: "CHANGED", start: 3.2, end: 3.8, style: "normal" },
    ],
  },
];

const output = generateAss(testCaptions);
console.log(output);
