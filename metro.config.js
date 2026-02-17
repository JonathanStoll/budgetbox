const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// "react-native" must come first so @firebase/auth resolves to its RN bundle
// (which registers the auth component). "browser" and "default" are needed as
// fallbacks for packages that don't have a react-native condition.
config.resolver.unstable_conditionNames = [
  'react-native',
  'browser',
  'require',
  'import',
  'default',
];

config.resolver.unstable_conditionsByPlatform = {
  ios: ['react-native'],
  android: ['react-native'],
};

module.exports = config;
