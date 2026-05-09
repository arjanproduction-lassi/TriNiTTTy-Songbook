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
  isChordLikeLine,
  renderTransposedAnchors,
  transposeChordLine,
  transposeSong,
} = require(path.join(__dirname, "..", "src", "lib", "chords.ts"));
const {
  parseImportText,
} = require(path.join(__dirname, "..", "src", "lib", "import.ts"));

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

assertEqual(
  "power chord repeat is chord-like",
  isChordLikeLine("/: E5   G5   D5   A5:/ 2x"),
  true,
);

assertEqual(
  "power chord repeat line transposes with markers",
  transposeChordLine("/: E5   G5   D5   A5:/ 2x", 1, "intl"),
  "/: F5   G#5   D#5   A#5:/ 2x",
);

const richChordLine = "Asus4 G/B Cadd9 Bm7 F#7 Cmaj7 G9 Dm7";
assertEqual("rich chord regression line stays chord-like", isChordLikeLine(richChordLine), true);
assertEqual(
  "rich chord regression line still transposes",
  transposeChordLine(richChordLine, 1, "intl"),
  "A#sus4 G#/C C#add9 Cm7 G7 C#maj7 G#9 D#m7",
);

const [importedRepeat] = parseImportText("/: E5   G5   D5   A5:/ 2x");
assertEqual("raw import keeps power chord repeat transposable", importedRepeat.type, "repeat");

const repeatedSong = {
  id: 1,
  title: "Repeat power chords",
  artist: "TriNiTTTy",
  bpm: 120,
  key: "E",
  duration: "0:00",
  capo: "-",
  lines: [{ type: "repeat", text: "/: E5   G5   D5   A5:/ 2x" }],
};
assertEqual(
  "repeat block transposes power chords after save/reopen",
  transposeSong(repeatedSong, 1, "intl").lines[0].text,
  "/: F5   G#5   D#5   A#5:/ 2x",
);

const pairSong = {
  id: 2,
  title: "Pair power chords",
  artist: "TriNiTTTy",
  bpm: 120,
  key: "E",
  duration: "0:00",
  capo: "-",
  lines: [{
    type: "pair",
    chords: "E5   G5   D5   A5",
    lyrics: "some lyric text",
    chordAnchors: parseChordAnchors("E5   G5   D5   A5"),
  }],
};
const transposedPair = transposeSong(pairSong, 1, "intl").lines[0];
assertEqual("pair block transposes power chord row", transposedPair.chords, "F5   G#5  D#5  A#5");
assertEqual("pair block keeps lyric row untouched", transposedPair.lyrics, "some lyric text");

assertEqual(
  "lyric with numbers is not chord-like",
  isChordLikeLine("Daj mi 5 minút a 2 slová"),
  false,
);

console.log(`Chord anchor fixtures passed: ${fixtures.length + 9}`);
