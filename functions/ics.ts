import events from "../serve/data/events.json" assert { type: "json" };

async function sha1Hex(input: string) {
  const data = new TextEncoder().encode(input);
  const hash = await crypto.subtle.digest("SHA-1", data);
  const bytes = new Uint8Array(hash);
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function kstYMD(dateStr: string) {
  const d = new Date(dateStr);
  // convert to KST by adding 9 hours
  const kst = new Date(d.getTime() + 9 * 3600 * 1000);
  return {
    year: kst.getUTCFullYear(),
    month: kst.getUTCMonth() + 1,
    day: kst.getUTCDate(),
  };
}

function pad(n: number) {
  return String(n).padStart(2, "0");
}

async function generateIcs(schedules: Array<any>) {
  let result =
    "BEGIN:VCALENDAR\n" +
    "VERSION:2.0\n" +
    "TIMEZONE-ID:Asia/Seoul\n" +
    "X-WR-TIMEZONE:Asia/Seoul\n" +
    "X-WR-CALNAME:중앙대학교 학사일정\n" +
    "X-WR-CALDESC:calendar.puang.network에서 제공하는 중앙대학교 학사일정\n" +
    "CALSCALE:GREGORIAN\n" +
    "PRODID:adamgibbons/ics\n" +
    "METHOD:PUBLISH\n" +
    "X-PUBLISHED-TTL:PT1H\n" +
    "BEGIN:VTIMEZONE\n" +
    "TZID:Asia/Seoul\n" +
    "TZURL:http://tzurl.org/zoneinfo-outlook/Asia/Seoul\n" +
    "X-LIC-LOCATION:Asia/Seoul\n" +
    "BEGIN:STANDARD\n" +
    "TZOFFSETFROM:+0900\n" +
    "TZOFFSETTO:+0900\n" +
    "TZNAME:KST\n" +
    "DTSTART:19700101T000000\n" +
    "END:STANDARD\n" +
    "END:VTIMEZONE\n";

  const creationTimestamp = new Date()
    .toISOString()
    .replace(/[-:]/g, "")
    .replace(/\.\d+Z$/, "Z");

  for (const sched of schedules) {
    const start = kstYMD(
      sched.StartDate || sched.startDate || sched.start || ""
    );
    const end = kstYMD(sched.EndDate || sched.endDate || sched.end || "");

    let vEventEndData = "";
    if (
      !(
        start.year === end.year &&
        start.month === end.month &&
        start.day === end.day
      )
    ) {
      vEventEndData = `DTEND;TZID=Asia/Seoul;VALUE=DATE:${String(
        end.year
      )}${pad(end.month)}${pad(end.day)}\n`;
    }

    const uidBase = `${start.year}_${start.month}_${start.day}${end.year}_${
      end.month
    }_${end.day}_${sched.Title || sched.title || ""}`;
    const uidHash = await sha1Hex(uidBase);
    const uid = `${uidHash}@calendar.puang.network`;

    result +=
      `BEGIN:VEVENT\n` +
      `UID:${uid}\n` +
      `SUMMARY:${(sched.Title || sched.title || "").replace(/\n/g, " ")}\n` +
      `DTSTAMP:${creationTimestamp}\n` +
      `DTSTART;TZID=Asia/Seoul;VALUE=DATE:${String(start.year)}${pad(
        start.month
      )}${pad(start.day)}\n` +
      vEventEndData +
      `END:VEVENT\n`;
  }

  result += "END:VCALENDAR";
  return result;
}

export default async function (request: Request) {
  const url = new URL(request.url);
  const from = url.searchParams.get("from");
  const to = url.searchParams.get("to");

  let schedules = events as any[];

  if (from || to) {
    const fromY = from ? parseInt(from, 10) : -Infinity;
    const toY = to ? parseInt(to, 10) : Infinity;
    schedules = schedules.filter((s) => {
      const sY = kstYMD(s.StartDate || s.startDate || s.start || "").year;
      const eY = kstYMD(s.EndDate || s.endDate || s.end || "").year;
      return sY >= fromY && eY <= toY;
    });
  }

  const ics = await generateIcs(schedules);

  return new Response(ics, {
    status: 200,
    headers: {
      "Content-Type": "text/calendar",
    },
  });
}
