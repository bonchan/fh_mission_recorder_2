export const getProjectMissionsStorageKey = (orgId: string, projectId: string) => {
  return `${orgId}__${projectId}__missions`;
};

export const extractNumber = (input: string): number => {
  const match = input.match(/#(\d+)\s/);

  if (match && match[1]) {
    const parsed = parseInt(match[1], 10);
    return isNaN(parsed) ? 999 : parsed;
  }

  return 999;
};

export const removeEmptyLines = (str: string) => {
  return str
    .split(/\r?\n/)
    .map(line => line.trimEnd())
    .filter(line => line.trim().length > 0)
    .join('\n');
};

export const normalizeHeading360 = (heading: number): number => {
  return ((heading % 360) + 360) % 360;
};

export const getFocalLengthFromZoom = (
  zoomFactor: number,
  baseFovDeg: number = 84,
  sensorDiagonal: number = 43.3
): number => {
  // 1. Convert Base FOV degrees to Radians
  const baseRad: number = baseFovDeg * (Math.PI / 180);

  // 2. Calculate the New FOV in Radians based on the zoom factor
  // Formula: 2 * atan( tan(base_rad / 2) / zoom )
  const newFovRad: number = 2 * Math.atan(Math.tan(baseRad / 2) / zoomFactor);

  // 3. Calculate Focal Length from the resulting FOV
  // Formula: sensor_diagonal / (2 * tan(fov_rad / 2))
  const focalLength: number = sensorDiagonal / (2 * Math.tan(newFovRad / 2));

  return Math.round(focalLength);
};