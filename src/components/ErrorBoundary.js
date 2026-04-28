import React from 'react';
import { View, Text } from 'react-native';

class ErrorBoundary extends React.Component {
  state = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  render() {
    if (this.state.hasError) {
      return (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <Text>App bị lỗi JS, sửa code rồi reload lại nhé!</Text>
        </View>
      );
    }
    return this.props.children;
  }
}

export default ErrorBoundary;
