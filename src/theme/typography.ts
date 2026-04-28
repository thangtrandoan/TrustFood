import { TextStyle } from 'react-native';

const fontFamily = {
  regular: 'Inter-Regular',
  medium: 'Inter-Medium',
  bold: 'Inter-Bold',
};

export const Typography = {
  H1: {
    fontFamily: fontFamily.bold,
    fontSize: 32,
    lineHeight: 40,
  } as TextStyle,

  H2: {
    fontFamily: fontFamily.bold,
    fontSize: 28,
    lineHeight: 36,
  } as TextStyle,

  H3: {
    fontFamily: fontFamily.bold,
    fontSize: 24,
    lineHeight: 32,
  } as TextStyle,

  H4: {
    fontFamily: fontFamily.bold,
    fontSize: 20,
    lineHeight: 28,
  } as TextStyle,

  H5: {
    fontFamily: fontFamily.medium,
    fontSize: 18,
    lineHeight: 26,
  } as TextStyle,

  H6: {
    fontFamily: fontFamily.medium,
    fontSize: 16,
    lineHeight: 24,
  } as TextStyle,

  H7: {
    fontFamily: fontFamily.medium,
    fontSize: 14,
    lineHeight: 20,
  } as TextStyle,

  P1_Regular: {
    fontFamily: fontFamily.regular,
    fontSize: 16,
    lineHeight: 24,
  } as TextStyle,

  P1_Medium: {
    fontFamily: fontFamily.medium,
    fontSize: 16,
    lineHeight: 24,
  } as TextStyle,

  P2_Regular: {
    fontFamily: fontFamily.regular,
    fontSize: 14,
    lineHeight: 22,
  } as TextStyle,

  P2_Medium: {
    fontFamily: fontFamily.medium,
    fontSize: 14,
    lineHeight: 22,
  } as TextStyle,

  P3_Regular: {
    fontFamily: fontFamily.regular,
    fontSize: 13,
    lineHeight: 20,
  } as TextStyle,

  P3_Medium: {
    fontFamily: fontFamily.medium,
    fontSize: 13,
    lineHeight: 20,
  } as TextStyle,

  P4_Regular: {
    fontFamily: fontFamily.regular,
    fontSize: 12,
    lineHeight: 18,
  } as TextStyle,

  P4_Medium: {
    fontFamily: fontFamily.medium,
    fontSize: 12,
    lineHeight: 18,
  } as TextStyle,
};
