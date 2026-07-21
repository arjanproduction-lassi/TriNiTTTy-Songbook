import type { DriveFileMemory, DriveFolderMemory, PersistedState } from "../types";
import { normalizePersistedState } from "./db";

const CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || "";
const API_KEY = import.meta.env.VITE_GOOGLE_API_KEY || "";
const APP_ID = import.meta.env.VITE_GOOGLE_APP_ID || inferGoogleAppId(CLIENT_ID);
const DRIVE_SCOPE = "https://www.googleapis.com/auth/drive.file";
const DRIVE_DISCOVERY = "https://www.googleapis.com/discovery/v1/apis/drive/v3/rest";

type GooglePickerDoc = {
  id?: string;
  name?: string;
  [key: string]: unknown;
};

type GooglePickerData = {
  action?: string;
  docs?: GooglePickerDoc[];
  [key: string]: unknown;
};

type GooglePickerBuilder = {
  addView: (view: unknown) => GooglePickerBuilder;
  setOAuthToken: (token: string) => GooglePickerBuilder;
  setDeveloperKey: (key: string) => GooglePickerBuilder;
  setAppId: (appId: string) => GooglePickerBuilder;
  setOrigin: (origin: string) => GooglePickerBuilder;
  setCallback: (callback: (data: GooglePickerData) => void) => GooglePickerBuilder;
  build: () => { setVisible: (visible: boolean) => void };
};

let tokenClient: { requestAccessToken: (options?: { prompt?: string }) => void } | null = null;
let accessToken = "";
let gapiReady: Promise<void> | null = null;
let gisReady: Promise<void> | null = null;

declare global {
  interface Window {
    gapi?: {
      load: (features: string, callback: () => void) => void;
      client: {
        init: (config: { apiKey: string; discoveryDocs: string[] }) => Promise<void>;
      };
    };
    google?: {
      accounts: {
        oauth2: {
          initTokenClient: (config: {
            client_id: string;
            scope: string;
            callback: (response: { access_token?: string; error?: string }) => void;
          }) => { requestAccessToken: (options?: { prompt?: string }) => void };
        };
      };
      picker: {
        Action: { PICKED: string };
        DocsView: new (viewId: string) => {
          setMimeTypes: (mimeTypes: string) => unknown;
          setIncludeFolders: (include: boolean) => unknown;
          setSelectFolderEnabled: (enabled: boolean) => unknown;
        };
        PickerBuilder: new () => GooglePickerBuilder;
        ViewId: { DOCS: string };
      };
    };
  }

  interface ImportMetaEnv {
    readonly VITE_GOOGLE_CLIENT_ID?: string;
    readonly VITE_GOOGLE_API_KEY?: string;
    readonly VITE_GOOGLE_APP_ID?: string;
  }

  interface ImportMeta {
    readonly env: ImportMetaEnv;
  }
}

export function isGoogleDriveConfigured() {
  return Boolean(CLIENT_ID && API_KEY);
}

export function isGoogleDriveAuthConfigured() {
  return Boolean(CLIENT_ID);
}

export function googleDriveConfigMessage() {
  if (isGoogleDriveConfigured()) return "";
  return "Google Drive nie je nakonfigurovaný. Doplň VITE_GOOGLE_CLIENT_ID a VITE_GOOGLE_API_KEY.";
}

export function googleDriveAuthConfigMessage() {
  if (isGoogleDriveAuthConfigured()) return "";
  return "Google Drive prihlásenie nie je nakonfigurované. Doplň VITE_GOOGLE_CLIENT_ID.";
}

export async function chooseDriveJsonFile(): Promise<DriveFileMemory> {
  await ensureGoogleDriveReady();
  const token = await requestAccessToken();

  return new Promise((resolve, reject) => {
    const picker = window.google?.picker;
    if (!picker) {
      reject(new Error("Google Picker sa nepodarilo načítať."));
      return;
    }

    const view = new picker.DocsView(picker.ViewId.DOCS);
    view.setMimeTypes("application/json");
    view.setIncludeFolders(false);
    view.setSelectFolderEnabled(false);

    const builder = new picker.PickerBuilder()
      .addView(view)
      .setOAuthToken(token)
      .setDeveloperKey(API_KEY)
      .setOrigin(window.location.origin)
      .setCallback((data: GooglePickerData) => {
        if (data.action !== picker.Action.PICKED) return;
        const doc = data.docs?.[0];
        const fileId = String(doc?.id || "").trim();
        const fileName = String(doc?.name || "trinittty-songbook.json").trim();
        if (!fileId) {
          reject(new Error("Drive súbor nemá file ID."));
          return;
        }
        resolve({ fileId, fileName, rememberedAt: new Date().toISOString() });
      });

    if (APP_ID) builder.setAppId(APP_ID);
    builder
      .build()
      .setVisible(true);
  });
}

export async function chooseDriveFolder(): Promise<DriveFolderMemory> {
  await ensureGoogleDriveReady();
  const token = await requestAccessToken();

  return new Promise((resolve, reject) => {
    const picker = window.google?.picker;
    if (!picker) {
      reject(new Error("Google Picker sa nepodarilo načítať."));
      return;
    }

    const view = new picker.DocsView(picker.ViewId.DOCS);
    view.setMimeTypes("application/vnd.google-apps.folder");
    view.setIncludeFolders(true);
    view.setSelectFolderEnabled(true);

    const builder = new picker.PickerBuilder()
      .addView(view)
      .setOAuthToken(token)
      .setDeveloperKey(API_KEY)
      .setOrigin(window.location.origin)
      .setCallback((data: GooglePickerData) => {
        if (data.action !== picker.Action.PICKED) return;
        const doc = data.docs?.[0];
        const folderId = String(doc?.id || "").trim();
        const folderName = String(doc?.name || "DATABASE").trim();
        if (!folderId) {
          reject(new Error("Drive priečinok nemá folder ID."));
          return;
        }
        resolve({ folderId, folderName, rememberedAt: new Date().toISOString() });
      });

    if (APP_ID) builder.setAppId(APP_ID);
    builder
      .build()
      .setVisible(true);
  });
}

export async function loadBackupFromDrive(fileId: string): Promise<PersistedState> {
  await ensureGoogleDriveAccessReady();
  let response = await fetchDriveMedia(fileId);
  if (response.status === 401) {
    accessToken = "";
    response = await fetchDriveMedia(fileId);
  }
  return readDriveJsonResponse(response);
}

async function fetchDriveMedia(fileId: string) {
  const token = await requestAccessToken();
  return fetch(`https://www.googleapis.com/drive/v3/files/${encodeURIComponent(fileId)}?alt=media`, {
    headers: { Authorization: `Bearer ${token}` },
  });
}

async function readDriveJsonResponse(response: Response): Promise<PersistedState> {
  if (response.status === 401) throw new Error("Drive prístup vypršal. Prihlás sa znova.");
  if (response.status === 403) throw new Error("Drive súbor nie je povolený pre túto appku alebo účet.");
  if (response.status === 404) throw new Error("Drive súbor sa nenašiel. Vyber oficiálny DB súbor znova.");
  if (!response.ok) throw new Error("Drive load zlyhal.");
  return normalizePersistedState(await response.json());
}

export async function saveBackupToDrive(fileId: string, state: PersistedState) {
  await ensureGoogleDriveAccessReady();
  const token = await requestAccessToken();
  const response = await fetch(`https://www.googleapis.com/upload/drive/v3/files/${encodeURIComponent(fileId)}?uploadType=media`, {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json;charset=utf-8",
    },
    body: JSON.stringify({ ...state, savedAt: new Date().toISOString() }, null, 2),
  });
  if (!response.ok) throw new Error("Drive save zlyhal.");
}

async function ensureGoogleDriveReady() {
  if (!isGoogleDriveConfigured()) throw new Error(googleDriveConfigMessage());
  await Promise.all([loadGis(), loadGapi()]);
}

async function ensureGoogleDriveAccessReady() {
  if (!isGoogleDriveAuthConfigured()) throw new Error(googleDriveAuthConfigMessage());
  await loadGis();
}

function loadGis() {
  if (window.google?.accounts?.oauth2) return Promise.resolve();
  if (gisReady) return gisReady;
  gisReady = loadScript("https://accounts.google.com/gsi/client");
  return gisReady;
}

async function loadGapi() {
  if (window.gapi?.client && window.google?.picker) return;
  if (!gapiReady) {
    gapiReady = loadScript("https://apis.google.com/js/api.js").then(() => new Promise<void>((resolve) => {
      window.gapi?.load("client:picker", resolve);
    })).then(() => window.gapi?.client.init({ apiKey: API_KEY, discoveryDocs: [DRIVE_DISCOVERY] }));
  }
  await gapiReady;
}

function loadScript(src: string) {
  return new Promise<void>((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(`script[src="${src}"]`);
    if (existing) {
      if (existing.dataset.loaded === "true") resolve();
      else existing.addEventListener("load", () => resolve(), { once: true });
      return;
    }

    const script = document.createElement("script");
    script.src = src;
    script.async = true;
    script.onload = () => {
      script.dataset.loaded = "true";
      resolve();
    };
    script.onerror = () => reject(new Error(`Nepodarilo sa načítať ${src}.`));
    document.head.appendChild(script);
  });
}

function inferGoogleAppId(clientId: string) {
  const match = clientId.match(/^(\d+)-/);
  return match?.[1] || "";
}

function requestAccessToken() {
  if (accessToken) return Promise.resolve(accessToken);
  if (!window.google?.accounts?.oauth2) return Promise.reject(new Error("Google Identity Services nie sú načítané."));

  return new Promise<string>((resolve, reject) => {
    tokenClient = window.google!.accounts.oauth2.initTokenClient({
      client_id: CLIENT_ID,
      scope: DRIVE_SCOPE,
      callback: (response) => {
        if (response.error || !response.access_token) {
          reject(new Error(response.error || "Google prihlásenie zlyhalo."));
          return;
        }
        accessToken = response.access_token;
        resolve(accessToken);
      },
    });
    tokenClient.requestAccessToken({ prompt: "consent" });
  });
}
