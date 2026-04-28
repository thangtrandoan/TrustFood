import React from 'react';
import { Text, TextProps } from 'react-native';
import { Typography } from '../theme/typography';

type Variant =
  | 'H1'
  | 'H2'
  | 'H3'
  | 'H4'
  | 'H5'
  | 'H6'
  | 'H7'
  | 'P1_Regular'
  | 'P1_Medium'
  | 'P2_Regular'
  | 'P2_Medium'
  | 'P3_Regular'
  | 'P3_Medium'
  | 'P4_Regular'
  | 'P4_Medium';

interface AppTextProps extends TextProps {
  variant?: Variant;
}

export function AppText({
  variant = 'P1_Regular',
  style,
  children,
  ...props
}: AppTextProps) {
  return (
    <Text {...props} style={[Typography[variant], style]}>
      {children}
    </Text>
  );
}
