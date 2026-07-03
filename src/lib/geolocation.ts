export interface GeoLocationData {
  latitude: number;
  longitude: number;
  accuracy: number;
  address: string;
}

export function formatLatitude(lat: number): string {
  return `${Math.abs(lat).toFixed(4)}° ${lat >= 0 ? "N" : "S"}`;
}

export function formatLongitude(lng: number): string {
  return `${Math.abs(lng).toFixed(4)}° ${lng >= 0 ? "E" : "W"}`;
}

async function reverseGeocode(lat: number, lng: number): Promise<string> {
  const res = await fetch(
    `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&accept-language=id`,
    { headers: { "Accept-Language": "id" } }
  );
  if (!res.ok) throw new Error("Gagal mengambil alamat");
  const data = await res.json();
  return (data.display_name as string) || `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
}

export function getCurrentLocation(): Promise<GeoLocationData> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error("Perangkat tidak mendukung GPS"));
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude, accuracy } = pos.coords;
        let address = `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`;
        try {
          address = await reverseGeocode(latitude, longitude);
        } catch {
          // fallback ke koordinat
        }
        resolve({ latitude, longitude, accuracy, address });
      },
      (err) => {
        const messages: Record<number, string> = {
          1: "Izin lokasi ditolak. Aktifkan GPS di pengaturan browser.",
          2: "Lokasi tidak tersedia. Pastikan GPS aktif.",
          3: "Waktu habis saat mengambil lokasi. Coba lagi.",
        };
        reject(new Error(messages[err.code] ?? "Gagal mengambil lokasi"));
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
    );
  });
}
