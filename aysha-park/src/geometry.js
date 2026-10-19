// One outline drives both the painted island and its walking boundary.
const START = [270, 470];
const CURVES = [
  [410, 240, 750, 170, 1020, 220],
  [1330, 140, 1690, 330, 1760, 520],
  [1990, 770, 1770, 1130, 1580, 1280],
  [1280, 1480, 810, 1400, 620, 1340],
  [300, 1330, 120, 1150, 190, 870],
  [110, 690, 170, 540, 270, 470],
];

export function traceIsland(context, offset = 0) {
  context.beginPath();
  context.moveTo(START[0], START[1] + offset);
  for (const [a, b, c, d, x, y] of CURVES) {
    context.bezierCurveTo(a, b + offset, c, d + offset, x, y + offset);
  }
  context.closePath();
}

const outline = [START];
let previous = START;
for (const [a, b, c, d, x, y] of CURVES) {
  for (let step = 1; step <= 24; step++) {
    const t = step / 24, u = 1 - t;
    outline.push([
      u ** 3 * previous[0] + 3 * u ** 2 * t * a + 3 * u * t ** 2 * c + t ** 3 * x,
      u ** 3 * previous[1] + 3 * u ** 2 * t * b + 3 * u * t ** 2 * d + t ** 3 * y,
    ]);
  }
  previous = [x, y];
}

export function isOnIsland(x, y, margin = 14) {
  let inside = false;
  for (let i = 0, j = outline.length - 1; i < outline.length; j = i++) {
    const [ax, ay] = outline[j], [bx, by] = outline[i];
    if ((ay > y) !== (by > y) && x < (bx - ax) * (y - ay) / (by - ay) + ax) inside = !inside;
    const vx = bx - ax, vy = by - ay, lengthSquared = vx * vx + vy * vy;
    const t = lengthSquared ? Math.max(0, Math.min(1, ((x - ax) * vx + (y - ay) * vy) / lengthSquared)) : 0;
    if ((x - ax - t * vx) ** 2 + (y - ay - t * vy) ** 2 < margin ** 2) return false;
  }
  return inside;
}

export function cameraZoom(width, height, touch = false) {
  const desktopBlend = touch ? 0 : Math.max(0, Math.min(1, (width - 600) / 500));
  const visibleWidth = 740 + desktopBlend * 640;
  const visibleHeight = 510 + desktopBlend * 110;
  return Math.max(.48, Math.min(touch ? .86 : 1.15, width / visibleWidth, height / visibleHeight));
}
