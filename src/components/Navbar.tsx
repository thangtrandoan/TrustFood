import React from 'react';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/RootNavigator';
import TopBar from './TopBar';


export const Navbar = () => {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const handleAvatarPress = () => {
    navigation.navigate('Profile');
  };

  const handleMessagePress = () => {
    navigation.navigate('Messages');
  };

  return (
    <TopBar
      title="Bản tin"
      showLeftAvatar
      onPressLeft={handleAvatarPress}
      rightIcon="chatbubble-ellipses-outline"
      onPressRight={handleMessagePress}
    />
  );
};