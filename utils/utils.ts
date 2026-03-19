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

export const formatXML = (xml: string, indentText = '  ') => { // '  ' is 2 spaces
  let formatted = '';
  let pad = 0;

  // 1. Strip all existing newlines and whitespace between tags to start with a clean slate
  const cleanXml = xml.replace(/(>)\s*(<)/g, '$1\n$2');

  // 2. Loop through every single tag/line
  cleanXml.split('\n').forEach((node) => {
    let indentDelta = 0;

    if (node.match(/.+<\/\w[^>]*>$/)) {
      // Node contains text (e.g., <tag>Text</tag>) -> No change to padding
      indentDelta = 0;
    } else if (node.match(/^<\/\w/)) {
      // Closing tag (e.g., </Folder>) -> Decrease padding BEFORE adding the line
      if (pad > 0) pad -= 1;
    } else if (node.match(/^<\w[^>]*[^\/]>.*$/)) {
      // Opening tag (e.g., <Folder>) -> Increase padding AFTER adding the line
      indentDelta = 1;
    } else {
      // Self-closing tag or <?xml ... ?> -> No change to padding
      indentDelta = 0;
    }

    // Apply the spaces and append the node
    formatted += indentText.repeat(pad) + node + '\n';
    pad += indentDelta;
  });

  return formatted.trim();
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