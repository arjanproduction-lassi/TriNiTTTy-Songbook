const PASS_TOKENS = new Set(["-", "/", "|", "||", "/:", ":/", "x", "2x", "4x", "8x"]);
const ROOT_REGEX = /^([A-H])([#b]?)([^/\s]*)(?:\/([A-H])([#b]?))?$/;

const NOTESETS = {
  intlSharp: ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"],
  intlFlat: ["C", "Db", "D", "Eb", "E", "F", "Gb", "G", "Ab", "A", "Bb", "B"],
  deSharp: ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "H"],
  deFlat: ["C", "Db", "D", "Eb", "E", "F", "Gb", "G", "Ab", "A", "B", "H"],
};

function parseRootToSemitone(root, source = "intl") {
  const letter = root[0];
  const accidental = root.slice(1);
  if (letter === "H") return accidental === "b" ? 10 : accidental === "#" ? 0 : 11;
  if (letter === "B") {
    if (accidental === "b") return 10;
    if (accidental === "#") return 0;
    return source === "de" ? 10 : 11;
  }
  const naturals = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9 };
  const base = naturals[letter];
  if (base === undefined) return null;
  if (accidental === "#") return (base + 1) % 12;
  if (accidental === "b") return (base + 11) % 12;
  return base;
}

function formatSemitone(semitone, notation, preferFlat = false) {
  const i = ((semitone % 12) + 12) % 12;
  const set = notation === "de"
    ? preferFlat ? NOTESETS.deFlat : NOTESETS.deSharp
    : preferFlat ? NOTESETS.intlFlat : NOTESETS.intlSharp;
  return set[i];
}

function transposeRoot(root, steps, notation, preferFlat = false) {
  const semitone = parseRootToSemitone(root, "intl");
  return semitone === null ? root : formatSemitone(semitone + steps, notation, preferFlat);
}

function transposeChordToken(token, steps, notation) {
  if (PASS_TOKENS.has(token)) return token;
  const m = token.match(ROOT_REGEX);
  if (!m) return token;

  const [, rootL, rootA = "", suffix = "", bassL, bassA = ""] = m;
  const root = `${rootL}${rootA}`;
  const bass = bassL ? `${bassL}${bassA}` : "";
  const preferFlat = rootA === "b" || bassA === "b" || /(^|\/)(Bb|Eb|Ab|Db|Gb)/.test(token);
  const nextRoot = transposeRoot(root, steps, notation, preferFlat);
  const nextBass = bass ? transposeRoot(bass, steps, notation, preferFlat) : "";

  return `${nextRoot}${suffix}${nextBass ? `/${nextBass}` : ""}`;
}

function transposeChordLine(text, steps, notation) {
  return (text.match(/[^\s]+|\s+/g) || [])
    .map((token) => (/^\s+$/.test(token) ? token : transposeChordToken(token, steps, notation)))
    .join("");
}

const fixtures = [
  { name: "simple standalone row", kind: "chords", input: "B   G#m   E   F#", steps: 1 },
  { name: "dense slash-chord row", kind: "chords", input: "B/D# C#m7 G#m", steps: 1 },
  { name: "repeat with chords", kind: "repeat", input: "/: B/D# C#m7 G#m :/ 2x", steps: 1 },
  { name: "short-to-long row", kind: "chords", input: "B   E   A", steps: 2 },
];

function tokenColumns(line) {
  return Array.from(line.matchAll(/\S+/g)).map((match) => ({ token: match[0], col: match.index }));
}

let practicalFailures = 0;
for (const fixture of fixtures) {
  const output = transposeChordLine(fixture.input, fixture.steps, "intl");
  const before = tokenColumns(fixture.input);
  const after = tokenColumns(output);
  const drift = before.map((item, index) => ({
    from: item.token,
    to: after[index]?.token ?? "",
    beforeCol: item.col,
    afterCol: after[index]?.col ?? -1,
    delta: (after[index]?.col ?? -1) - item.col,
  }));
  const moved = drift.some((item) => item.delta !== 0);
  if (moved && fixture.kind === "repeat") practicalFailures += 1;
  console.log(`\n${moved ? "FAIL" : "PASS"} ${fixture.name}`);
  console.log(`input : ${fixture.input}`);
  console.log(`output: ${output}`);
  console.table(drift);
}

console.log(`\nSummary: ${practicalFailures ? "FAIL" : "PASS"} for repeat-row RC1 audit; standalone chord-row drift is recorded separately for classification.`);
