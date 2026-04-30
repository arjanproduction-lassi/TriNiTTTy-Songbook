const fs = require("node:fs");
const path = require("node:path");
const ts = require("typescript");

require.extensions[".ts"] = (module, filename) => {
  const source = fs.readFileSync(filename, "utf8");
  const compiled = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
      esModuleInterop: true,
    },
  }).outputText;
  module._compile(compiled, filename);
};

function assertEqual(name, actual, expected) {
  if (actual !== expected) {
    throw new Error(`${name}\nexpected: ${JSON.stringify(expected)}\nactual:   ${JSON.stringify(actual)}`);
  }
}

const {
  parseChordAnchors,
  renderChordAnchors,
} = require(path.join(__dirname, "..", "src", "lib", "chordAnchors.ts"));
const {
  renderTransposedAnchors,
} = require(path.join(__dirname, "..", "src", "lib", "chords.ts"));

const fixtures = [
  {
    name: "B / E keeps slash token and spacing",
    line: "B   /   E",
    steps: 1,
    expectedAnchors: [
      { chord: "B", col: 0 },
      { chord: "/", col: 4 },
      { chord: "E", col: 8 },
    ],
    expectedTransposed: "C   /   F",
  },
  {
    name: "D/F# / G keeps slash-chord anchor intent",
    line: "D/F#   /   G",
    steps: 2,
    expectedAnchors: [
      { chord: "D/F#", col: 0 },
      { chord: "/", col: 7 },
      { chord: "G", col: 11 },
    ],
    expectedTransposed: "E/G#   /   A",
  },
  {
    name: "B/D# C#m7 G#m keeps anchors when shorter tokens would drift left",
    line: "B/D# C#m7 G#m",
    steps: 1,
    expectedAnchors: [
      { chord: "B/D#", col: 0 },
      { chord: "C#m7", col: 5 },
      { chord: "G#m", col: 10 },
    ],
    expectedTransposed: "C/E  Dm7  Am",
  },
  {
    name: "mixed short/long tokens keep at least one gap",
    line: "B C#m7 G#m B/D#",
    steps: -1,
    expectedAnchors: [
      { chord: "B", col: 0 },
      { chord: "C#m7", col: 2 },
      { chord: "G#m", col: 7 },
      { chord: "B/D#", col: 11 },
    ],
    expectedTransposed: "A# Cm7 Gm  A#/D",
  },
];

for (const fixture of fixtures) {
  const anchors = parseChordAnchors(fixture.line).map(({ chord, col }) => ({ chord, col }));
  assertEqual(`${fixture.name}: parse`, JSON.stringify(anchors), JSON.stringify(fixture.expectedAnchors));
  assertEqual(`${fixture.name}: render identity`, renderChordAnchors(parseChordAnchors(fixture.line)), fixture.line);
  assertEqual(`${fixture.name}: render transposed`, renderTransposedAnchors(parseChordAnchors(fixture.line), fixture.steps, "intl"), fixture.expectedTransposed);
}

console.log(`Chord anchor fixtures passed: ${fixtures.length}`);
