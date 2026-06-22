import type { Song } from "../types";
import { DEFAULT_DRAFT, DEFAULT_IMPORT_TEXT } from "./defaultImport";
import { makeSong, parseImportText } from "../lib/import";

export const INITIAL_SONGS: Song[] = [
  makeSong(DEFAULT_DRAFT, parseImportText(DEFAULT_IMPORT_TEXT), 1),
];
