module.exports = function (api) {
  api.cache(true);
  return {
    presets: [["babel-preset-expo", { unstable_transformImportMeta: true }]],
    plugins: [
      // Other plugins first (e.g., for NativeWind, module-resolver)...
      'react-native-worklets-core/plugin',  // Or 'react-native-worklets/plugin' if using the full package
      'react-native-reanimated/plugin',     // Must be last
    ],
  };
};