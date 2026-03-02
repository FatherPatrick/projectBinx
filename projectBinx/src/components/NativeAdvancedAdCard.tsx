import React, {useEffect, useRef, useState} from 'react';
import {ActivityIndicator, StyleSheet, Text, View} from 'react-native';
import {BannerAd, BannerAdSize} from 'react-native-google-mobile-ads';
import {bannerAdUnitId} from '../config/admob';
import theme from '../styles/theme';

type AdLoadState = 'loading' | 'loaded' | 'failed';

const NativeAdvancedAdCard = () => {
  const [loadState, setLoadState] = useState<AdLoadState>('loading');
  const finishedRef = useRef(false);

  const log = (message: string, payload?: unknown) => {
    if (!__DEV__) {
      return;
    }

    if (payload !== undefined) {
      console.log(`[AdMob][Banner] ${message}`, payload);
      return;
    }

    console.log(`[AdMob][Banner] ${message}`);
  };

  useEffect(() => {
    log('load started', {unitId: bannerAdUnitId});

    const timeoutId = setTimeout(() => {
      if (finishedRef.current) {
        return;
      }

      finishedRef.current = true;
      setLoadState('failed');
      log('load timed out after 15000ms');
    }, 15000);

    return () => {
      finishedRef.current = true;
      clearTimeout(timeoutId);
      log('component unmount');
    };
  }, []);

  if (loadState === 'failed') {
    return (
      <View style={styles.card}>
        <Text style={styles.sponsoredText}>Sponsored</Text>
        <View style={styles.failedContainer}>
          <Text style={styles.failedText}>Ad unavailable right now.</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.card}>
      <Text style={styles.sponsoredText}>Sponsored</Text>
      <View style={styles.bannerContainer}>
        <BannerAd
          unitId={bannerAdUnitId}
          size={BannerAdSize.MEDIUM_RECTANGLE}
          onAdLoaded={() => {
            if (finishedRef.current) {
              return;
            }

            finishedRef.current = true;
            setLoadState('loaded');
            log('load succeeded');
          }}
          onAdFailedToLoad={error => {
            if (finishedRef.current) {
              return;
            }

            finishedRef.current = true;
            setLoadState('failed');
            log('load failed', error);
          }}
        />

        {loadState === 'loading' ? (
          <View style={styles.loadingOverlay}>
            <ActivityIndicator size="small" color={theme.colors.primary} />
          </View>
        ) : null}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    width: '100%',
    padding: theme.spacing.lg,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  sponsoredText: {
    color: theme.colors.textMuted,
    fontSize: theme.fontSize.sm,
    fontWeight: '600',
    marginBottom: theme.spacing.sm,
  },
  failedContainer: {
    minHeight: 250,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: theme.colors.borderMuted,
    borderRadius: theme.radius.sm,
  },
  failedText: {
    color: theme.colors.textMuted,
    fontSize: theme.fontSize.sm,
    fontWeight: '600',
  },
  bannerContainer: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 250,
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default NativeAdvancedAdCard;
