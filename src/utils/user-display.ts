export function getDisplayFirstName(name: string | null | undefined): string | null {
  if (!name?.trim()) return null;
  const first = name.trim().split(/\s+/)[0];
  if (!first) return null;
  return first.charAt(0).toUpperCase() + first.slice(1).toLowerCase();
}

function personalizeLine(firstName: string, line: string): string {
  if (/^Você\b/.test(line)) {
    return line.replace(/^Você\b/, `${firstName}, você`);
  }
  if (/Olá!/.test(line)) {
    return line.replace(/\bOlá!/, `Olá, ${firstName}!`);
  }
  if (/^Olá\b/.test(line)) {
    return line.replace(/^Olá\b/, `Olá, ${firstName}`);
  }
  return line;
}

export function personalizeMessage(
  name: string | null | undefined,
  text: string
): string {
  const firstName = getDisplayFirstName(name);
  if (!firstName) return text;

  const lines = text.split("\n");
  lines[0] = personalizeLine(firstName, lines[0]);
  return lines.join("\n");
}
