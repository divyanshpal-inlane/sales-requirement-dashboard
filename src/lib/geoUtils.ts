/**
 * Calculate distance between two GPS coordinates using Haversine formula
 * @returns distance in kilometers
 */
export function haversineDistance(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
): number {
  const R = 6371; // Earth's radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Calculate total distance along a series of GPS points
 * @returns total distance in kilometers
 */
export function calculateTotalDistance(
  points: Array<{ latitude: number; longitude: number }>,
): number {
  if (points.length < 2) return 0;
  let total = 0;
  for (let i = 1; i < points.length; i++) {
    total += haversineDistance(
      points[i - 1].latitude,
      points[i - 1].longitude,
      points[i].latitude,
      points[i].longitude,
    );
  }
  return total;
}

/**
 * Calculate duration between first and last tracking points
 * @returns duration in minutes
 */
export function calculateDuration(
  points: Array<{ captured_at: string }>,
): number {
  if (points.length < 2) return 0;
  const first = new Date(points[0].captured_at).getTime();
  const last = new Date(points[points.length - 1].captured_at).getTime();
  return (last - first) / (1000 * 60);
}
