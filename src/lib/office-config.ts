export const OFFICE_NAME = "Neurogs (PT Neurogs Inovasi Teknologi)";

/** Koordinat dari Google Maps Neurogs */
export const DEFAULT_OFFICE_LAT = -6.2906958;
export const DEFAULT_OFFICE_LNG = 106.8095851;
export const DEFAULT_OFFICE_RADIUS = 100;

export function getOfficeConfigFromEnv() {
  return {
    name: process.env.OFFICE_NAME ?? OFFICE_NAME,
    latitude: Number(process.env.OFFICE_LATITUDE ?? DEFAULT_OFFICE_LAT),
    longitude: Number(process.env.OFFICE_LONGITUDE ?? DEFAULT_OFFICE_LNG),
    radiusMeters: Number(process.env.OFFICE_RADIUS_METERS ?? DEFAULT_OFFICE_RADIUS),
  };
}
