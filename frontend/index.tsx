import { registerRootComponent } from 'expo';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { KeyboardProvider } from 'react-native-keyboard-controller';
import { useFonts } from 'expo-font';

import App from './App';
import { obtenerModuloNotificaciones } from './src/services/notificationsGateway';

const Notifications = obtenerModuloNotificaciones();
if (Notifications) {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
      shouldVibrate: true,
    }),
  });
}

function Root() {
  const [fontsLoaded] = useFonts({
    LaOriental: require('./assets/fonts/LaOriental-Bold.otf'),
  });

  if (!fontsLoaded) {
    return null;
  }

  return (
    <SafeAreaProvider>
      <KeyboardProvider>
        <App />
      </KeyboardProvider>
    </SafeAreaProvider>
  );
}

// registerRootComponent calls AppRegistry.registerComponent('main', () => App);
// It also ensures that whether you load the app in Expo Go or in a native build,
// the environment is set up appropriately
registerRootComponent(Root);
