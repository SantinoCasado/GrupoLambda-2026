import { registerRootComponent } from 'expo';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useFonts } from 'expo-font';

import App from './App';

function Root() {
  const [fontsLoaded] = useFonts({
    LaOriental: require('./assets/fonts/LaOriental-Bold.otf'),
  });

  if (!fontsLoaded) {
    return null;
  }

  return (
    <SafeAreaProvider>
      <App />
    </SafeAreaProvider>
  );
}

// registerRootComponent calls AppRegistry.registerComponent('main', () => App);
// It also ensures that whether you load the app in Expo Go or in a native build,
// the environment is set up appropriately
registerRootComponent(Root);
