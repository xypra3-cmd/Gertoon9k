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
    associatedDomains: [`applinks:${DOMAIN}`],
    config: { usesNonExemptEncryption: false },
    infoPlist: {
      ITSAppUsesNonExemptEncryption: false,
      CFBundleDevelopmentRegion: 'mn',
      CFBundleLocalizations: ['mn', 'en'],
      NSCameraUsageDescription: 'Нэрийн хуудасны QR код уншихад камер ашиглана.',
      NSContactsUsageDescription: 'Уншсан нэрийн хуудсыг таны утасны contact-д хадгалахад ашиглана.',
      NSPhotoLibraryUsageDescription: 'Нэрийн хуудасны зураг сонгоход ашиглана.',
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
      ],
      NSPrivacyAccessedAPITypes: [
        { NSPrivacyAccessedAPIType: 'NSPrivacyAccessedAPICategoryUserDefaults', NSPrivacyAccessedAPITypeReasons: ['CA92.1'] },
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
    // Only what the app needs. Contacts are requested at "save" time only.
    permissions: ['android.permission.CAMERA', 'android.permission.READ_CONTACTS', 'android.permission.WRITE_CONTACTS'],
    blockedPermissions: [
      'android.permission.RECORD_AUDIO',
      'android.permission.READ_EXTERNAL_STORAGE',
      'android.permission.WRITE_EXTERNAL_STORAGE',
      'android.permission.READ_MEDIA_IMAGES',
      'android.permission.READ_MEDIA_VIDEO',
      'android.permission.SYSTEM_ALERT_WINDOW',
      'android.permission.WRITE_SETTINGS', // expo-brightness: we only change the app window brightness
      'android.permission.ACCESS_FINE_LOCATION',
      'android.permission.ACCESS_COARSE_LOCATION',
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
    ['expo-build-properties', { android: { minSdkVersion: 24 } }],
  ],
  experiments: { typedRoutes: false },
  extra: {
    eas: { projectId: process.env.EAS_PROJECT_ID },
  },
});
