import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { DevLauncherScreen, SplashScreen } from '../screens/Core';
import {
  AuthIntroScreen,
  LoginScreen,
  RegisterScreen,
  ForgotPasswordScreen,
  CreatePasswordScreen,
  SetNameScreen,
} from '../screens/Auth';
import { CameraScreen, CameraPostScreen } from '../screens/Camera';
import { DiscoverScreen } from '../screens/Discover';
import { MapScreen } from '../screens/Map';
import { NotificationsScreen } from '../screens/Notifications';
import { ChatConversationScreen, MessagesScreen } from '../screens/Messages';
import {
  ProfileScreen,
  ProfileReviewsScreen,
  PersonalInfoScreen,
  ChangePasswordScreen,
  FriendsScreen,
} from '../screens/Profile';
import {
  TermsOfUseScreen,
  HelpCenterScreen,
  ShareAppScreen,
} from '../screens/Settings';
import { useAuth } from '../context/AuthContext';
import { DEV_BYPASS_AUTH, DEV_ENTRY_SCREEN } from '../config/api';
const Stack = createNativeStackNavigator<RootStackParamList>();

export type RootStackParamList = {
  DevLauncher: undefined;
  Splash: undefined;
  AuthIntro: undefined;
  Login: undefined;
  Register: undefined;

  ForgotPassword: undefined;
  CreatePassword: { email: string; otp: string };
  SetName: { email: string; password: string; otp: string };
  Camera: undefined;
  Discover: undefined;
  Messages: undefined;
  ChatConversation: { userId: string; name: string; avatar?: string; conversationId?: string };
  Map: undefined;
  Notifications: undefined;
  Preview: { imageUri: string };
  Send: { imageUri: string };
  FoodReview: undefined;
  Profile: { userId?: string } | undefined;
  ProfileReviews: { userId?: string } | undefined;
  PersonalInfo: undefined;
  TermsOfUse: undefined;
  HelpCenter: undefined;
  ShareApp: undefined;
  ChangePassword: undefined;
  Friends: undefined;
};

export default function RootNavigator() {
  const { status } = useAuth();
  const isDevBypass = __DEV__ && DEV_BYPASS_AUTH;
  const isAuthenticated = status === 'authenticated' || isDevBypass;

  const initialRoute: keyof RootStackParamList = isDevBypass
    ? DEV_ENTRY_SCREEN
    : isAuthenticated
      ? 'Discover'
      : 'Splash';

  return (
    <Stack.Navigator
      initialRouteName={initialRoute}
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: '#181210' },
        animation: 'none',
      }}
    >
      {!isAuthenticated ? (
        <>
          <Stack.Screen name="DevLauncher" component={DevLauncherScreen} />
          <Stack.Screen name="Splash" component={SplashScreen} />
          <Stack.Screen name="AuthIntro" component={AuthIntroScreen} />
          <Stack.Screen name="Login" component={LoginScreen} />
          <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
          <Stack.Screen name="Register" component={RegisterScreen} />
          <Stack.Screen name="CreatePassword" component={CreatePasswordScreen} />
          <Stack.Screen name="SetName" component={SetNameScreen} />
        </>
      ) : (
        <>
          {isDevBypass ? <Stack.Screen name="DevLauncher" component={DevLauncherScreen} /> : null}
          {isDevBypass ? <Stack.Screen name="Splash" component={SplashScreen} /> : null}
          {isDevBypass ? <Stack.Screen name="AuthIntro" component={AuthIntroScreen} /> : null}
          {isDevBypass ? <Stack.Screen name="Login" component={LoginScreen} /> : null}
          {isDevBypass ? <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} /> : null}
          {isDevBypass ? <Stack.Screen name="Register" component={RegisterScreen} /> : null}
          {isDevBypass ? <Stack.Screen name="CreatePassword" component={CreatePasswordScreen} /> : null}
          {isDevBypass ? <Stack.Screen name="SetName" component={SetNameScreen} /> : null}
          <Stack.Screen name="Camera" component={CameraScreen} />
          <Stack.Screen name="Discover" component={DiscoverScreen} />
          <Stack.Screen name="Messages" component={MessagesScreen} />
          <Stack.Screen name="ChatConversation" component={ChatConversationScreen} />
          <Stack.Screen name="Map" component={MapScreen} />
          <Stack.Screen name="Notifications" component={NotificationsScreen} />
          <Stack.Screen name="Send" component={CameraPostScreen} />
          <Stack.Screen name="Profile" component={ProfileScreen} />
          <Stack.Screen name="ProfileReviews" component={ProfileReviewsScreen} />
          <Stack.Screen name="PersonalInfo" component={PersonalInfoScreen} />
          <Stack.Screen name="TermsOfUse" component={TermsOfUseScreen} />
          <Stack.Screen name="HelpCenter" component={HelpCenterScreen} />
          <Stack.Screen name="ShareApp" component={ShareAppScreen} />
          <Stack.Screen name="ChangePassword" component={ChangePasswordScreen} />
          <Stack.Screen name="Friends" component={FriendsScreen} />
        </>
      )}
    </Stack.Navigator>
  );
}
