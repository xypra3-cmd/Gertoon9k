/** iOS home-screen + lock-screen widget: the user's card QR (WidgetKit, SwiftUI). */
/** @type {import('@bacons/apple-targets/app.plugin').ConfigFunction} */
module.exports = (config) => ({
  type: 'widget',
  name: 'CardWidget',
  displayName: 'Digital Card',
  bundleIdentifier: '.widget',
  deploymentTarget: '17.0',
  colors: {
    $widgetBackground: '#2557E6',
    $accent: '#FFFFFF',
  },
  entitlements: {
    'com.apple.security.application-groups': config.ios.entitlements['com.apple.security.application-groups'],
  },
});
