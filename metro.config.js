const { getDefaultConfig } = require('expo/metro-config')

const config = getDefaultConfig(__dirname)

// The PDF reader ships as a self-contained web document (reader.html + the pdf.js
// UMD build stored as .txt so Metro treats it as an asset instead of a module).
// readerAssets.ts copies these out to the document directory at first launch.
config.resolver.assetExts.push('html', 'txt')

module.exports = config
