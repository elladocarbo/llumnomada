import { type Point } from './worldmap.mts';

/** A street-level map of one city, drawn in a W × H box. When every place of a relat falls inside one
 *  of these, the route map at the top of the relat uses it instead of the world map. */
export interface CityMap {
  id: string;
  /** Path of the SVG under /public. */
  file: string;
  west: number;
  east: number;
  south: number;
  north: number;
  /** Latitude the horizontal scale is taken at (so 1° of longitude is drawn shorter than 1° of latitude). */
  lat0: number;
  w: number;
  credit: string;
}

const OSM_CREDIT = 'Mapa: © col·laboradors d’OpenStreetMap';

// public/mapa-berlin.svg is generated with exactly these numbers (water, parks and main roads from OpenStreetMap).
const BERLIN: CityMap = { id: 'berlin', file: '/mapa-berlin.svg', west: 13.3, east: 13.5, south: 52.46, north: 52.57, lat0: 52.52, w: 1000, credit: OSM_CREDIT };

export const CITY_MAPS: CityMap[] = [BERLIN];

/** Height of the drawing, in the same units as its width. */
export function cityHeight(c: CityMap): number {
  return Math.round(((c.north - c.south) * c.w) / ((c.east - c.west) * Math.cos((c.lat0 * Math.PI) / 180)));
}

export function projectCity(c: CityMap, lat: number, lon: number): Point {
  const cos = Math.cos((c.lat0 * Math.PI) / 180);
  const scale = c.w / ((c.east - c.west) * cos);
  return { x: (lon - c.west) * cos * scale, y: (c.north - lat) * scale };
}

/** The city map that contains every given position, if there is one. */
export function cityMapFor(positions: { lat: number; lon: number }[]): CityMap | undefined {
  if (!positions.length) return undefined;
  return CITY_MAPS.find((c) => positions.every((p) => p.lat >= c.south && p.lat <= c.north && p.lon >= c.west && p.lon <= c.east));
}
