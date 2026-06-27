import 'dotenv/config';

export default {
  expo: {
    name: "Flairies",
    slug: "flairies-new",
    version: "1.0.0",
    orientation: "portrait",
    icon: "./assets/images/icon.png",
    scheme: "flairies",
    userInterfaceStyle: "automatic",
    newArchEnabled: true,
    splash: {
      image: "./assets/images/Logo.png",
      resizeMode: "contain",
      backgroundColor: "#ffffff",
    },
    ios: {
      supportsTablet: true,
    },
    android: {
      adaptiveIcon: {
        foregroundImage: "./assets/images/Logo.png",
        backgroundColor: "#E6F4FE",
      },
      edgeToEdgeEnabled: true,
      predictiveBackGestureEnabled: false,
      package: "com.anonymous.flairies",
      config: {
        googleMaps: {
          apiKey: process.env.GOOGLE_MAPS_API_KEY,
        },
      },
    },
    web: {
      bundler: "metro",
      output: "single",
      favicon: "./assets/images/favicon.png",
    },
    plugins: ["expo-font"],
    extra: {
      eas: {
        projectId: "9c67e8cc-e259-41cb-8fe4-6fc16389fcd0",
      },
    },
  },
};
