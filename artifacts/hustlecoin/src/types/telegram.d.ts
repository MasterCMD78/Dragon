export interface TelegramWebApp {
  initData: string;
  initDataUnsafe: any;
  ready: () => void;
  expand: () => void;
  openTelegramLink: (url: string) => void;
  openLink: (url: string) => void;
}

declare global {
  interface Window {
    Telegram?: {
      WebApp?: TelegramWebApp;
    }
  }
}
