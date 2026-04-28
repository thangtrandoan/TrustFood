import React from 'react';
import { Platform, StatusBar, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Ionicons from '@react-native-vector-icons/ionicons';

type IconName = React.ComponentProps<typeof Ionicons>['name'];

type TopBarProps = {
  title: string;
  onPressLeft?: () => void;
  onPressRight?: () => void;
  leftIcon?: IconName;
  rightIcon?: IconName;
  showLeftAvatar?: boolean;
  showRight?: boolean;
  rightNode?: React.ReactNode;
};

export default function TopBar({
  title,
  onPressLeft,
  onPressRight,
  leftIcon,
  rightIcon,
  showLeftAvatar = false,
  showRight = true,
  rightNode,
}: TopBarProps) {
  const topInset = Platform.OS === 'android' ? (StatusBar.currentHeight ?? 0) + 8 : 36;

  const renderLeft = () => {
    if (showLeftAvatar) {
      return (
        <TouchableOpacity style={styles.sideButton} onPress={onPressLeft} activeOpacity={0.8}>
          <View style={styles.avatarPlaceholder} />
        </TouchableOpacity>
      );
    }

    if (leftIcon && onPressLeft) {
      return (
        <TouchableOpacity style={styles.sideButton} onPress={onPressLeft} activeOpacity={0.8}>
          <Ionicons name={leftIcon} size={22} color="#fff" />
        </TouchableOpacity>
      );
    }

    return <View style={styles.sideButton} />;
  };

  const renderRight = () => {
    if (!showRight) {
      return <View style={styles.sideButton} />;
    }

    if (rightNode) {
      return <View style={styles.rightCustomWrap}>{rightNode}</View>;
    }

    if (rightIcon && onPressRight) {
      return (
        <TouchableOpacity style={styles.sideButton} onPress={onPressRight} activeOpacity={0.8}>
          <Ionicons name={rightIcon} size={22} color="#fff" />
        </TouchableOpacity>
      );
    }

    return <View style={styles.sideButton} />;
  };

  return (
    <View style={[styles.container, { paddingTop: topInset }]}> 
      {renderLeft()}
      <Text style={styles.title} numberOfLines={1}>{title}</Text>
      {renderRight()}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 10,
    backgroundColor: '#181818',
    borderBottomWidth: 1,
    borderBottomColor: '#222',
  },
  sideButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarPlaceholder: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#888',
  },
  rightCustomWrap: {
    minWidth: 40,
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  title: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '700',
    flex: 1,
    textAlign: 'center',
    marginHorizontal: 8,
  },
});
