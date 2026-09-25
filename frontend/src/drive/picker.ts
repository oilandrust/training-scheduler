const PICKER_MIME_TYPES = [
  'application/vnd.google-apps.document',
  'application/pdf',
].join(',');

export type PickerConfig = {
  apiKey: string;
  appId: string;
  clientId: string;
};

export type PickedDriveFile = {
  id: string;
  name?: string;
  mimeType?: string;
};

type DocsView = {
  setIncludeFolders: (include: boolean) => DocsView;
  setSelectFolderEnabled: (enabled: boolean) => DocsView;
  setMimeTypes: (mimeTypes: string) => DocsView;
};

type PickerBuilder = {
  addView: (view: DocsView) => PickerBuilder;
  setOAuthToken: (token: string) => PickerBuilder;
  setDeveloperKey: (key: string) => PickerBuilder;
  setAppId: (appId: string) => PickerBuilder;
  setTitle: (title: string) => PickerBuilder;
  setCallback: (
    callback: (data: { action: string; docs?: PickedDriveFile[] }) => void,
  ) => PickerBuilder;
  build: () => { setVisible: (visible: boolean) => void };
};

type PickerApi = {
  PickerBuilder: new () => PickerBuilder;
  DocsView: new () => DocsView;
  Action: { PICKED: string; CANCEL: string };
};

declare global {
  interface Window {
    gapi?: {
      load: (api: string, callback: () => void) => void;
    };
  }
}

let pickerApiReady: Promise<void> | null = null;

function loadScript(src: string, datasetKey: string): Promise<void> {
  const existing = document.querySelector<HTMLScriptElement>(`script[data-${datasetKey}]`);
  if (existing) {
    return existing.dataset.loaded === '1'
      ? Promise.resolve()
      : new Promise((resolve, reject) => {
          existing.addEventListener('load', () => resolve());
          existing.addEventListener('error', () => reject(new Error(`Failed to load ${src}`)));
        });
  }
  return new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = src;
    script.async = true;
    script.dataset[datasetKey] = '1';
    script.onload = () => {
      script.dataset.loaded = '1';
      resolve();
    };
    script.onerror = () => reject(new Error(`Failed to load ${src}`));
    document.head.appendChild(script);
  });
}

function getPickerApi(): PickerApi {
  const picker = (window as Window & { google?: { picker?: PickerApi } }).google?.picker;
  if (!picker) throw new Error('Google Picker API is unavailable');
  return picker;
}

export async function loadGooglePickerApi(): Promise<void> {
  if ((window as Window & { google?: { picker?: PickerApi } }).google?.picker) return;
  if (pickerApiReady) return pickerApiReady;
  pickerApiReady = (async () => {
    await loadScript('https://apis.google.com/js/api.js', 'gapi');
    if (!window.gapi) throw new Error('Google API script failed to initialize');
    await new Promise<void>((resolve, reject) => {
      try {
        window.gapi!.load('picker', () => resolve());
      } catch (err) {
        reject(err instanceof Error ? err : new Error('Could not load Google Picker'));
      }
    });
    getPickerApi();
  })();
  return pickerApiReady;
}

export async function openDrivePicker(options: {
  accessToken: string;
  config: PickerConfig;
  title?: string;
}): Promise<PickedDriveFile | null> {
  await loadGooglePickerApi();
  const pickerApi = getPickerApi();

  const view = new pickerApi.DocsView()
    .setIncludeFolders(true)
    .setSelectFolderEnabled(false)
    .setMimeTypes(PICKER_MIME_TYPES);

  return new Promise((resolve, reject) => {
    try {
      const picker = new pickerApi.PickerBuilder()
        .addView(view)
        .setOAuthToken(options.accessToken)
        .setDeveloperKey(options.config.apiKey)
        .setAppId(options.config.appId)
        .setTitle(options.title ?? 'Select a Google Doc or PDF')
        .setCallback((data) => {
          if (data.action === pickerApi.Action.CANCEL) {
            resolve(null);
            return;
          }
          if (data.action === pickerApi.Action.PICKED) {
            const doc = data.docs?.[0];
            if (!doc?.id) {
              reject(new Error('Google Picker did not return a file'));
              return;
            }
            resolve(doc);
          }
        })
        .build();
      picker.setVisible(true);
    } catch (err) {
      reject(err instanceof Error ? err : new Error('Could not open Google Picker'));
    }
  });
}
