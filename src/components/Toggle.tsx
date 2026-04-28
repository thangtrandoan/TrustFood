import React from 'react';
import {  View, StyleSheet } from 'react-native';

type Props = {
  checked: boolean;
  type?: 'checkbox' | 'radio' | 'switch';
};  

export const Toggle = ({ checked, type = 'checkbox' }: Props) => {
  return (
      <View
        style={[
          styles.base,
          type === 'radio' && styles.radio,
          type === 'switch' && styles.switch,
          checked && styles.active,
          !checked && styles.unactive,
        ]}
      />
  );
};

const styles = StyleSheet.create({
  base: {
    width: 20,
    height: 20,
    borderRadius: 6,
    borderWidth: 2,
  },
  radio: {
    borderRadius: 999,
  },
  switch: {
    width: 36,
    borderRadius: 999,
  },
  active: {
    backgroundColor: '#FFC726',
    borderColor: '#FFC726',
  },
  unactive:{
    backgroundColor: 'transparent',
    borderColor: '#666',
  }
});
