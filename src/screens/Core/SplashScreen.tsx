import React from 'react';
import LinearGradient from 'react-native-linear-gradient';
import {
  View,
  Text,
  ImageBackground,
  Image,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import {Typography} from '../../theme/typography';
import { useTheme } from '../../hooks/useTheme';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../navigation/RootNavigator';


export default function SplashScreen() {
  const theme = useTheme();
  const navigation = useNavigation<NavigationProp>();
  type NavigationProp = NativeStackNavigationProp<RootStackParamList,'Splash'>
  return (
    <View style={{ flex: 1 }}>
      {/* Ảnh nền */}
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
    padding: 24,
  },
  content: {
    marginTop: 120,
    alignItems: 'center',
  },
  logo: {
    width: 70,
    height: 70,
    marginBottom: 24,
    borderRadius:12
  },
  title: {
    ...Typography.H1,
    fontSize: 24,
    fontWeight: '700',
    textAlign: 'center',
    lineHeight: 30,
  },
  button: {
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 40,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#101010',
    lineHeight: 28,
  },
});
