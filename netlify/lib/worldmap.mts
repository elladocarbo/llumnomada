// Geometry of public/mapa-mon.svg: a Natural Earth projection of the world (Antarctica cropped),
// drawn in a 1000 × 446 box. The constants below are the ones the map was generated with, so a
// latitude/longitude lands on the same spot as in the drawing.
export const MAP_W = 1000;
export const MAP_H = 446;
const K = 182.78964407016804;
const TX = 500;
const TY = 259.9982544540716;

export interface Point {
  x: number;
  y: number;
}

export function projectLatLon(lat: number, lon: number): Point {
  const lambda = (lon * Math.PI) / 180;
  const phi = (lat * Math.PI) / 180;
  const p2 = phi * phi;
  const p4 = p2 * p2;
  const rx = lambda * (0.8707 - 0.131979 * p2 + p4 * (-0.013791 + p4 * (0.003971 * p2 - 0.001529 * p4)));
  const ry = phi * (1.007226 + p2 * (0.015085 + p4 * (-0.044475 + 0.028874 * p2 - 0.005916 * p4)));
  return { x: TX + K * rx, y: TY - K * ry };
}

export interface MapView {
  x: number;
  y: number;
  w: number;
  h: number;
}

/** The part of the world to show so that every point fits with some margin: as tight as
 *  possible (never narrower than ~15% of the world), centred on the points, kept inside the map. */
export function mapView(points: Point[], aspect: number): MapView {
  const xs = points.map((p) => p.x);
  const ys = points.map((p) => p.y);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);

  let w = Math.max((maxX - minX) * 1.5, (maxY - minY) * aspect * 1.5, 150);
  let h = w / aspect;
  if (w > MAP_W) {
    w = MAP_W;
    h = w / aspect;
  }
  if (h > MAP_H) {
    h = MAP_H;
    w = h * aspect;
  }
  const x = Math.min(Math.max((minX + maxX) / 2 - w / 2, 0), MAP_W - w);
  const y = Math.min(Math.max((minY + maxY) / 2 - h / 2, 0), MAP_H - h);
  return { x, y, w, h };
}
