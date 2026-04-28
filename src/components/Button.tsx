import React from 'react';
import { Pressable, Text, StyleSheet } from 'react-native';
import { spacing } from '../theme/spacing';
import { useTheme } from '../hooks/useTheme'; 

type Props = {
  title: string;
  variant?: 'filled' | 'outline';
};

export const Button = ({ title, variant = 'filled' }: Props) => {
  const theme = useTheme();
  return (
    <Pressable
      style={[
        styles.base,
        variant === 'filled' ? styles.filled : styles.outline,
      ]}
    >
      <Text
        style={[
          styles.text,
          variant === 'outline' && { color: theme.colors.background },
        ]}
      >
        {title}
      </Text>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  base: {
    paddingVertical: spacing.md,
    borderRadius: 999, 
    alignItems: 'center',
  },
  filled: {
    backgroundColor: '#FFC727',
  },
  outline: {
    borderWidth: 1,
    borderColor: '#EEE',
  },
  text: {
    fontWeight: '600',
  },
});
