import type { CapacitorConfig } from "@capacitor/cli";
const config: CapacitorConfig = {
  appId: "com.closeros.app",
  appName: "Closer OS",
  webDir: "out",
  server: { url: "http://178.105.181.38:6002", cleartext: true, androidScheme: "https", allowNavigation: ["178.105.181.38","meet.google.com","*.meet.google.com","*.zoom.us","*.zoom.com"] },
  plugins: { SplashScreen: { launchShowDuration: 0 } },
};
export default config;
