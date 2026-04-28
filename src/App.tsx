import React from 'react';
import { DefaultTheme, NavigationContainer } from '@react-navigation/native';
import RootNavigator from './navigation/RootNavigator';
import ErrorBoundary from './components/ErrorBoundary';
import { AuthProvider } from './context/AuthContext';
import { configureGoogleSignIn } from './services/firebase';
import { GOOGLE_WEB_CLIENT_ID } from './config/api';

const appNavigationTheme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    background: '#181210',
  },
};

export default function App() {
  React.useEffect(() => {
    if (
      GOOGLE_WEB_CLIENT_ID &&
      GOOGLE_WEB_CLIENT_ID !== 'YOUR_WEB_CLIENT_ID.apps.googleusercontent.com'
    ) {
      configureGoogleSignIn(GOOGLE_WEB_CLIENT_ID);
    }
  }, []);

  return (
    <ErrorBoundary>
      <AuthProvider>
        <NavigationContainer theme={appNavigationTheme}>
          <RootNavigator />
        </NavigationContainer>
      </AuthProvider>
    </ErrorBoundary>
  );
}
