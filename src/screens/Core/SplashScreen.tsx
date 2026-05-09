import React from 'react';
import LinearGradient from 'react-native-linear-gradient';
import {
  View,
  Text,
  ImageBackground,
  Image,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import { Typography } from '../../theme/typography';
import { useTheme } from '../../hooks/useTheme';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../navigation/RootNavigator';

const { width, height } = Dimensions.get('window');
const guidelineBaseWidth = 375;

// scale function
const scale = (size: number) => (width / guidelineBaseWidth) * size;

type NavigationProp = NativeStackNavigationProp<RootStackParamList, 'Splash'>;

export default function SplashScreen() {
  const theme = useTheme();
  const navigation = useNavigation<NavigationProp>();

  return (
    <View style={{ flex: 1 }}>
      <ImageBackground
        source={require('../../assets/images/Background_1.jpg')}
        resizeMode="cover"
        style={StyleSheet.absoluteFill}
      />

      <LinearGradient
        colors={['hsla(59, 100%, 50%, 0.4)', 'rgba(0, 0, 0, 0.3)']}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
        style={StyleSheet.absoluteFill}
      />

      <View style={styles.container}>
        <View style={styles.content}>
          <Image
            source={require('../../assets/icons/Logo.png')}
            style={styles.logo}
          />

          <Text style={[styles.title, { color: theme.colors.background }]}>
            Cộng đồng đam mê{"\n"}ẩm thực uy tín, sành điệu.
          </Text>
        </View>

        <TouchableOpacity
          style={[
            styles.button,
            { backgroundColor: theme.colors.primary },
          ]}
          onPress={() => navigation.navigate('AuthIntro')}
        >
          <Text style={styles.buttonText}>
            Bắt đầu khám phá
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'space-between',
    paddingHorizontal: scale(20),
    paddingVertical: scale(24),
  },

  content: {
    marginTop: height * 0.15, // responsive theo chiều cao
    alignItems: 'center',
  },

  logo: {
    width: scale(70),
    height: scale(70),
    marginBottom: scale(20),
    borderRadius: scale(12),
  },

  title: {
    ...Typography.H1,
    fontSize: scale(22),
    fontWeight: '700',
    textAlign: 'center',
    lineHeight: scale(28),
    paddingHorizontal: scale(10),
  },

  button: {
    height: scale(56),
    borderRadius: scale(28),
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: scale(30),
  },

  buttonText: {
    fontSize: scale(16),
    fontWeight: '500',
    color: '#101010',
    lineHeight: scale(24),
  },
});