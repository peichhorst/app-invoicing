export type GoogleAccountsWindow = {
  accounts?: {
    id?: {
      initialize: (opts: {
        client_id: string;
        callback: (response: { credential: string }) => void;
        ux_mode?: 'popup' | 'redirect';
      }) => void;
      renderButton: (
        container: HTMLElement | null,
        options: { theme: string; size: string; width?: string },
      ) => void;
      prompt: () => void;
      cancel: () => void;
    };
  };
};

export type GoogleMapsWindow = {
  maps?: {
    places: {
      Autocomplete: new (input: HTMLInputElement, opts?: any) => any;
    };
    Geocoder: new () => any;
    GeocoderStatus: any;
  };
};

export {};

declare global {
  interface Window {
    google?: GoogleAccountsWindow & GoogleMapsWindow;
  }
}
