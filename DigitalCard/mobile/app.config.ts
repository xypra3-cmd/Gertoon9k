import type { ExpoConfig, ConfigContext } from 'expo/config';

// Public domain that serves /c/<slug> (App Links / Universal Links). Set in EAS env per profile.
const DOMAIN = process.env.EXPO_PUBLIC_DOMAIN ?? 'digitalcard.mn';

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: 'Digital Card',
  slug: 'digitalcard',
  scheme: 'digitalcard',
  version: '1.0.0',
  orientation: 'portrait',
  icon: './assets/icon.png',
  userInterfaceStyle: 'automatic',
  ios: {
    bundleIdentifier: 'mn.digitalcard.app',
    supportsTablet: true,
    // webcredentials: passkeys shared with the website (same rp_id)
    associatedDomains: [`applinks:${DOMAIN}`, `webcredentials:${DOMAIN}`],
    // App Group: the home/lock-screen widget (targets/widget) reads the card from shared storage
    entitlements: { 'com.apple.security.application-groups': ['group.mn.digitalcard.app'] },
    appleTeamId: process.env.APPLE_TEAM_ID || undefined,
    config: { usesNonExemptEncryption: false },
    infoPlist: {
      ITSAppUsesNonExemptEncryption: false,
      CFBundleDevelopmentRegion: 'mn',
      CFBundleLocalizations: ['mn', 'en'],
      NSCameraUsageDescription: 'Нэрийн хуудасны QR код уншихад камер ашиглана.',
      NSContactsUsageDescription: 'Уншсан нэрийн хуудсыг таны утасны contact-д хадгалахад ашиглана.',
      NSPhotoLibraryUsageDescription: 'Нэрийн хуудасны зураг сонгоход ашиглана.',
      NSSupportsLiveActivities: true,
    },
    // Privacy manifest (App Store requirement): data collected + required-reason APIs.
    privacyManifests: {
      NSPrivacyTracking: false,
      NSPrivacyTrackingDomains: [],
      NSPrivacyCollectedDataTypes: [
        { NSPrivacyCollectedDataType: 'NSPrivacyCollectedDataTypeName', NSPrivacyCollectedDataTypeLinked: true, NSPrivacyCollectedDataTypeTracking: false, NSPrivacyCollectedDataTypePurposes: ['NSPrivacyCollectedDataTypePurposeAppFunctionality'] },
        { NSPrivacyCollectedDataType: 'NSPrivacyCollectedDataTypeEmailAddress', NSPrivacyCollectedDataTypeLinked: true, NSPrivacyCollectedDataTypeTracking: false, NSPrivacyCollectedDataTypePurposes: ['NSPrivacyCollectedDataTypePurposeAppFunctionality'] },
        { NSPrivacyCollectedDataType: 'NSPrivacyCollectedDataTypePhoneNumber', NSPrivacyCollectedDataTypeLinked: true, NSPrivacyCollectedDataTypeTracking: false, NSPrivacyCollectedDataTypePurposes: ['NSPrivacyCollectedDataTypePurposeAppFunctionality'] },
        { NSPrivacyCollectedDataType: 'NSPrivacyCollectedDataTypeContacts', NSPrivacyCollectedDataTypeLinked: true, NSPrivacyCollectedDataTypeTracking: false, NSPrivacyCollectedDataTypePurposes: ['NSPrivacyCollectedDataTypePurposeAppFunctionality'] },
        { NSPrivacyCollectedDataType: 'NSPrivacyCollectedDataTypePhotosorVideos', NSPrivacyCollectedDataTypeLinked: true, NSPrivacyCollectedDataTypeTracking: false, NSPrivacyCollectedDataTypePurposes: ['NSPrivacyCollectedDataTypePurposeAppFunctionality'] },
        // «Bump» exchange: ≈1 km area while the button is held, kept 10 minutes
        { NSPrivacyCollectedDataType: 'NSPrivacyCollectedDataTypeCoarseLocation', NSPrivacyCollectedDataTypeLinked: false, NSPrivacyCollectedDataTypeTracking: false, NSPrivacyCollectedDataTypePurposes: ['NSPrivacyCollectedDataTypePurposeAppFunctionality'] },
        // Contact notes and follow-ups (CRM)
        { NSPrivacyCollectedDataType: 'NSPrivacyCollectedDataTypeOtherUserContent', NSPrivacyCollectedDataTypeLinked: true, NSPrivacyCollectedDataTypeTracking: false, NSPrivacyCollectedDataTypePurposes: ['NSPrivacyCollectedDataTypePurposeAppFunctionality'] },
      ],
      NSPrivacyAccessedAPITypes: [
        // CA92.1: app's own defaults; 1C8F.1: App Group shared with the home-screen widget
        { NSPrivacyAccessedAPIType: 'NSPrivacyAccessedAPICategoryUserDefaults', NSPrivacyAccessedAPITypeReasons: ['CA92.1', '1C8F.1'] },
        { NSPrivacyAccessedAPIType: 'NSPrivacyAccessedAPICategoryFileTimestamp', NSPrivacyAccessedAPITypeReasons: ['C617.1'] },
        { NSPrivacyAccessedAPIType: 'NSPrivacyAccessedAPICategorySystemBootTime', NSPrivacyAccessedAPITypeReasons: ['35F9.1'] },
        { NSPrivacyAccessedAPIType: 'NSPrivacyAccessedAPICategoryDiskSpace', NSPrivacyAccessedAPITypeReasons: ['E174.1'] },
      ],
    },
  },
  locales: { mn: './locales/mn.json', en: './locales/en.json' },
  android: {
    package: 'mn.digitalcard.app',
    adaptiveIcon: { foregroundImage: './assets/android-icon-foreground.png', backgroundImage: './assets/android-icon-background.png', monochromeImage: './assets/android-icon-monochrome.png', backgroundColor: '#2557E6' },
    // Only what the app needs. Contacts are requested at "save" time only; approximate location only
    // when the user opens «Ойртуулж солилцох» (precise location stays blocked).
    permissions: ['android.permission.CAMERA', 'android.permission.READ_CONTACTS', 'android.permission.WRITE_CONTACTS', 'android.permission.ACCESS_COARSE_LOCATION'],
    // Contacts cache and session must not be copied into cloud/device-transfer backups.
    allowBackup: false,
    blockedPermissions: [
      'android.permission.RECORD_AUDIO',
      'android.permission.READ_EXTERNAL_STORAGE',
      'android.permission.WRITE_EXTERNAL_STORAGE',
      'android.permission.READ_MEDIA_IMAGES',
      'android.permission.READ_MEDIA_VIDEO',
      'android.permission.SYSTEM_ALERT_WINDOW',
      'android.permission.WRITE_SETTINGS', // expo-brightness: we only change the app window brightness
      'android.permission.ACCESS_FINE_LOCATION',
      'android.permission.ACCESS_BACKGROUND_LOCATION',
    ],
    intentFilters: [
      {
        action: 'VIEW',
        autoVerify: true,
        data: [{ scheme: 'https', host: DOMAIN, pathPrefix: '/c/' }],
        category: ['BROWSABLE', 'DEFAULT'],
      },
    ],
  },
  plugins: [
    'expo-router',
    'expo-secure-store',
    'expo-localization',
    ['expo-camera', { cameraPermission: 'Нэрийн хуудасны QR код уншихад камер ашиглана.', recordAudioAndroid: false, microphonePermission: false }],
    ['expo-contacts', { contactsPermission: 'Уншсан нэрийн хуудсыг таны утасны contact-д хадгалахад ашиглана.' }],
    ['expo-image-picker', { photosPermission: 'Нэрийн хуудасны зураг сонгоход ашиглана.', cameraPermission: 'Нэрийн хуудасны QR код уншихад камер ашиглана.', microphonePermission: false }],
    ['expo-notifications', { color: '#2557E6' }],
    ['expo-location', { locationWhenInUsePermission: 'Утас ойртуулж карт солилцоход ойролцоо бүсийг (≈1 км) тодорхойлно. Нарийн байршил хадгалагдахгүй.', locationAlwaysAndWhenInUsePermission: false, locationAlwaysPermission: false, isIosBackgroundLocationEnabled: false, isAndroidBackgroundLocationEnabled: false }],
    ['expo-sensors', { motionPermission: 'Утсаа нөгөө утсанд тулгасныг мэдрэхэд ашиглана.' }],
    // NFC: write the card link to a sticker/card, read tags (iOS: TAG reader session entitlement)
    ['react-native-nfc-manager', { nfcPermission: 'Нэрийн хуудсаа NFC наалт/картанд бичих, NFC-ээр карт уншихад ашиглана.' }],
    // iOS widget extension from targets/widget (WidgetKit + Event-mode Live Activity, Swift)
    '@bacons/apple-targets',
    // Android home-screen widget rendered from widgets/CardQrWidget.tsx
    [
      'react-native-android-widget',
      {
        widgets: [
          {
            name: 'CardQr',
            label: 'Миний QR',
            description: 'Нэрийн хуудасны QR нүүр дэлгэц дээр',
            minWidth: '110dp',
            minHeight: '110dp',
            targetCellWidth: 2,
            targetCellHeight: 2,
            maxResizeWidth: '320dp',
            maxResizeHeight: '200dp',
            resizeMode: 'horizontal|vertical',
            previewImage: './assets/widget-preview.png',
            updatePeriodMillis: 0,
          },
        ],
      },
    ],
    ['expo-build-properties', { android: { minSdkVersion: 24 } }],
  ],
  // React Compiler: automatic memoization at build time (Babel, stable 1.0).
  experiments: { typedRoutes: false, reactCompiler: true },
  extra: {
    eas: { projectId: process.env.EAS_PROJECT_ID },
  },
});
