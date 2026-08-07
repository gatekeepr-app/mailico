export function getAvatarHue(name: string | null | undefined = "") {
  return [...(name ?? "").trim()].reduce(
    (sum, char) => sum + char.charCodeAt(0),
    0,
  ) % 360;
}

export function getInitials(name: string | null | undefined = "") {
  const words = (name ?? "").trim().split(/\s+/).filter(Boolean);

  if (!words.length) return "?";

  return words
    .slice(0, 2)
    .map((word) => word[0])
    .join("")
    .toUpperCase();
}

export function getAvatarGradient(name: string | null | undefined = "") {
  const hue = getAvatarHue(name);
  return `linear-gradient(135deg, hsl(${hue}, 68%, 60%), hsl(${(hue + 28) % 360}, 68%, 54%))`;
}
