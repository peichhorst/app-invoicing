const getTimeZoneOffsetMinutes = (timeZone, date) => {
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone,
    timeZoneName: "shortOffset",
  });
  const tzPart = formatter.formatToParts(date).find((part) => part.type === "timeZoneName");
  if (!tzPart || !tzPart.value) return 0;
  const match = tzPart.value.match(/GMT([+-]\d{1,2})(?::?(\\d{2}))?/);
  if (!match) return 0;
  const hours = Number(match[1]);
  const minutes = Number(match[2] ?? "0");
  const result = hours * 60 + (hours >= 0 ? minutes : -minutes);
  return result;
};

const toHostIsoString = (dateKey, hhmm, timeZone) => {
  const [year, month, day] = dateKey.split("-").map(Number);
  const [hour, minute] = hhmm.split(":").map(Number);
  const candidates = new Date(Date.UTC(year, month - 1, day, hour, minute));
  const offsetMinutes = getTimeZoneOffsetMinutes(timeZone, candidates);
  const utcMillis = candidates.getTime() - offsetMinutes * 60 * 1000;
  return new Date(utcMillis).toISOString();
};

console.log(toHostIsoString("2025-12-30", "16:00", "America/Los_Angeles"));
