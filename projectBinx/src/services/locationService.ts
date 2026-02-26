import Geolocation, {
  GeoError,
  GeoOptions,
  GeoPosition,
} from 'react-native-geolocation-service';
import {Platform} from 'react-native';
import {
  check,
  openSettings,
  PERMISSIONS,
  PermissionStatus,
  request,
  RESULTS,
} from 'react-native-permissions';

export interface LocationCoordinates {
  latitude: number;
  longitude: number;
  accuracy?: number;
}

export interface LocationFetchOptions {
  enableHighAccuracy?: boolean;
  timeout?: number;
  maximumAge?: number;
  distanceFilter?: number;
  forceRequestLocation?: boolean;
  showLocationDialog?: boolean;
}

const DEFAULT_LOCATION_OPTIONS: GeoOptions = {
  enableHighAccuracy: true,
  timeout: 15000,
  maximumAge: 10000,
  distanceFilter: 0,
  forceRequestLocation: true,
  showLocationDialog: true,
};

const getLocationPermission = () => {
  if (Platform.OS === 'ios') {
    return PERMISSIONS.IOS.LOCATION_WHEN_IN_USE;
  }

  return PERMISSIONS.ANDROID.ACCESS_FINE_LOCATION;
};

const toGeoOptions = (options?: LocationFetchOptions): GeoOptions => ({
  ...DEFAULT_LOCATION_OPTIONS,
  ...options,
});

const toLocationCoordinates = ({coords}: GeoPosition): LocationCoordinates => ({
  latitude: coords.latitude,
  longitude: coords.longitude,
  accuracy: coords.accuracy,
});

const toLocationError = (error: GeoError) => {
  if (error.code === 1) {
    return new Error('Location permission denied.');
  }

  if (error.code === 2) {
    return new Error('Unable to determine your location.');
  }

  if (error.code === 3) {
    return new Error('Location request timed out.');
  }

  return new Error(error.message || 'Failed to get current location.');
};

const LocationService = {
  checkPermission: async (): Promise<PermissionStatus> => {
    const permission = getLocationPermission();
    return check(permission);
  },

  requestPermission: async (): Promise<PermissionStatus> => {
    const permission = getLocationPermission();
    const currentStatus = await check(permission);

    if (currentStatus === RESULTS.GRANTED) {
      return currentStatus;
    }

    return request(permission);
  },

  hasPermission: async (): Promise<boolean> => {
    const status = await LocationService.checkPermission();

    return status === RESULTS.GRANTED || status === RESULTS.LIMITED;
  },

  openAppSettings: async (): Promise<void> => {
    await openSettings();
  },

  getCurrentPosition: async (
    options?: LocationFetchOptions,
  ): Promise<LocationCoordinates> =>
    new Promise((resolve, reject) => {
      Geolocation.getCurrentPosition(
        position => {
          resolve(toLocationCoordinates(position));
        },
        error => {
          reject(toLocationError(error));
        },
        toGeoOptions(options),
      );
    }),

  getCurrentPositionWithPermission: async (
    options?: LocationFetchOptions,
  ): Promise<LocationCoordinates> => {
    const permissionStatus = await LocationService.requestPermission();

    if (
      permissionStatus !== RESULTS.GRANTED &&
      permissionStatus !== RESULTS.LIMITED
    ) {
      throw new Error('Location permission is required.');
    }

    return LocationService.getCurrentPosition(options);
  },
};

export default LocationService;
