// src/utils/googleMaps.ts
import { Loader } from "@googlemaps/js-api-loader";

export const googleMapsLoader = new Loader({
  apiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY,
  libraries: ["places", "geometry"],
  version: "weekly"
});
