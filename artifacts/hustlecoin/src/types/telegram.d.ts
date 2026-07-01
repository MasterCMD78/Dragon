export interface TelegramWebApp {
  initData: string;
  initDataUnsafe: any;
  ready: () => void;
  expand: () => void;
}

declare global {
  interface Window {
    Telegram?: {
      WebApp?: TelegramWebApp;
    }
  }
}
