// Learn more https://docs.expo.io/guides/customizing-metro
const { getDefaultConfig } = require('@expo/metro-config');

const defaultConfig = getDefaultConfig(__dirname);

defaultConfig.resolver = defaultConfig.resolver || {};
defaultConfig.resolver.sourceExts = defaultConfig.resolver.sourceExts || [];
if (!defaultConfig.resolver.sourceExts.includes('cjs')) {
	defaultConfig.resolver.sourceExts.push('cjs');
}

defaultConfig.resolver.extraNodeModules = {
	...(defaultConfig.resolver.extraNodeModules || {}),
	pino: require.resolve('pino/browser.js'),
};

defaultConfig.transformer = {
	...defaultConfig.transformer,
	getTransformOptions: async () => ({
		transform: {
			experimentalImportSupport: false,
			inlineRequires: true,
		},
	}),
};

module.exports = defaultConfig;