// App entry: Expo Router + (Android) the home-screen widget's headless task.
import 'expo-router/entry';
import { Platform, TurboModuleRegistry } from 'react-native';

if (Platform.OS === 'android' && TurboModuleRegistry.get('AndroidWidget')) {
  void Promise.all([import('react-native-android-widget'), import('./widgets/task-handler')]).then(([lib, h]) => lib.registerWidgetTaskHandler(h.widgetTaskHandler));
}
