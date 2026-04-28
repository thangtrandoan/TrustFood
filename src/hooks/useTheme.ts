import { useColorScheme } from 'react-native';
import { themes } from '../theme';

export function useTheme() {
  const scheme = useColorScheme();
  return scheme === 'dark' ? themes.dark : themes.light;
}
