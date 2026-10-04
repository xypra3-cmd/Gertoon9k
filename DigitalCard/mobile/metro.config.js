// Lets the app import ../packages/shared (TypeScript source) and keeps a single copy of
// react / zod from mobile/node_modules.
const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const projectRoot = __dirname;
const sharedRoot = path.resolve(projectRoot, '../packages/shared');

const config = getDefaultConfig(projectRoot);
config.watchFolders = [sharedRoot];
config.resolver.nodeModulesPaths = [path.resolve(projectRoot, 'node_modules')];
config.resolver.extraNodeModules = {
  '@digitalcard/shared': path.join(sharedRoot, 'src'),
};
module.exports = config;
