const { getDateParts, DEFAULT_BUSINESS_TIME_ZONE } = require("../src/lib/timezone");

function assert(condition, message) {
  if (!condition) {
    console.error(`✗ ${message}`);
    process.exitCode = 1;
  }
}

const target = new Date("2025-12-30T17:35:00.000Z");
const parts = getDateParts(target, DEFAULT_BUSINESS_TIME_ZONE);

assert(parts.dateKey === "2025-12-30", `expected date key 2025-12-30, got ${parts.dateKey}`);
assert(parts.dayOfWeek === 2, `expected Tuesday (2), got ${parts.dayOfWeek}`);
assert(parts.minutes === 9 * 60 + 35, `expected 575 minutes, got ${parts.minutes}`);

if (process.exitCode !== 1) {
  console.log("✓ Timezone helper smoke test passed");
}
