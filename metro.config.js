const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const config = getDefaultConfig(__dirname);

const webStubs = {
  'react-native-maps': path.resolve(__dirname, 'web-stubs/react-native-maps.js'),
  'react-native-razorpay': path.resolve(__dirname, 'web-stubs/react-native-razorpay.js'),
  '@stripe/stripe-react-native': path.resolve(__dirname, 'web-stubs/stripe-react-native.js'),
};

const originalResolveRequest = config.resolver.resolveRequest;
config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (platform === 'web' && webStubs[moduleName]) {
    return { filePath: webStubs[moduleName], type: 'sourceFile' };
  }
  if (originalResolveRequest) {
    return originalResolveRequest(context, moduleName, platform);
  }
  return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;



