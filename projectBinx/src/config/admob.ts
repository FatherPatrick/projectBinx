import {Platform} from 'react-native';
import {TestIds} from 'react-native-google-mobile-ads';

const productionNativeAdUnitIds = {
  ios: 'ca-app-pub-xxxxxxxxxxxxxxxx/ios-native-id',
  android: 'ca-app-pub-7982832313549251/5181294315',
};

const productionBannerAdUnitIds = {
  ios: 'ca-app-pub-xxxxxxxxxxxxxxxx/ios-banner-id',
  android: 'ca-app-pub-xxxxxxxxxxxxxxxx/android-banner-id',
};

export const nativeAdUnitId = __DEV__
  ? TestIds.GAM_NATIVE
  : Platform.select(productionNativeAdUnitIds) ?? TestIds.GAM_NATIVE;

export const bannerAdUnitId = __DEV__
  ? TestIds.BANNER
  : Platform.select(productionBannerAdUnitIds) ?? TestIds.BANNER;
