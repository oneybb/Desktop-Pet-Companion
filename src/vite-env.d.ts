/// <reference types="vite/client" />

interface Window {
  desktopPet?: {
    isDesktopApp: boolean;
    close: () => void;
  };
}

declare module "*.png" {
  const src: string;
  export default src;
}

declare module "*.jpg" {
  const src: string;
  export default src;
}

declare module "*.svg" {
  const src: string;
  export default src;
}
