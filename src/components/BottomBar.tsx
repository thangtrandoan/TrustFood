import React from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';
import Ionicons from "@react-native-vector-icons/ionicons";
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/RootNavigator';

type BottomBarItem = 'feed' | 'social' | 'map' | 'profile';

type BottomBarProps = {
  activeItem?: BottomBarItem;
};

export default function BottomBar({ activeItem }: BottomBarProps) {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  const openCamera = () => {
    navigation.navigate('Camera');
  };

  const openDiscover = () => {
    navigation.navigate('Discover');
  };

  const openMap = () => {
    navigation.navigate('Map');
  };

  const openSocial = () => {
    navigation.navigate('Friends');
  };

  const openProfile = () => {
    navigation.navigate('Profile');
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity onPress={openDiscover}>
        <Ionicons name="home-outline" size={30} color={activeItem === 'feed' ? '#FFD400' : '#fff'} />
      </TouchableOpacity>
      <TouchableOpacity onPress={openSocial}>
        <Ionicons name="people-outline" size={30} color={activeItem === 'social' ? '#FFD400' : '#fff'} />
      </TouchableOpacity>
      <TouchableOpacity style={styles.captureWrapper} onPress={openCamera}>
        <View style={styles.captureBtn} />
      </TouchableOpacity>
      <TouchableOpacity onPress={openMap}>
        <Ionicons name="map-outline" size={30} color={activeItem === 'map' ? '#FFD400' : '#fff'} />
      </TouchableOpacity>
      <TouchableOpacity onPress={openProfile}>
        <Ionicons name="person-circle-outline" size={32} color={activeItem === 'profile' ? '#FFD400' : '#fff'} />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingVertical: 10,
    backgroundColor: '#181818',
    borderTopWidth: 1,
    borderTopColor: '#222',
  },
    captureWrapper: {
    borderWidth: 3,
    borderColor: "#FFD400",
    borderRadius: 50,
    padding: 5,
  },
  captureBtn: {
    width: 40,
    height: 40,
    borderRadius: 40,
    backgroundColor: "#fff",
  },
});
