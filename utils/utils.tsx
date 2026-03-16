export const extractNumber = (input: string): number => {
  const match = input.match(/#(\d+)\s/);

  if (match && match[1]) {
    const parsed = parseInt(match[1], 10);
    return isNaN(parsed) ? 999 : parsed;
  }

  return 999;
};