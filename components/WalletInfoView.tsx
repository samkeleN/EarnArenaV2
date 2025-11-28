import React from 'react';
import {Image, StyleSheet, StyleProp, ViewStyle} from 'react-native';
import {useWalletInfo} from '@reown/appkit-react-native';
import {FlexView, Text} from '@reown/appkit-ui-react-native';

interface Props {
  style?: StyleProp<ViewStyle>;
}

export function WalletInfoView({style}: Props) {
  const {walletInfo} = useWalletInfo();
  return walletInfo ? (
    <FlexView style={[style, styles.container]}>
      <Text>{walletInfo.name}</Text>
      {walletInfo?.icons?.[0] && (
        <Image style={styles.logo} source={{uri: walletInfo?.icons?.[0]}} />
      )}
    </FlexView>
  ) : null;
}

const styles = StyleSheet.create({
  logo: {
    width: 20,
    height: 20,
    borderRadius: 5,
  },
  container: {
    alignItems: 'flex-end',
    marginLeft: 'auto',
  },
});
