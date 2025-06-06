import { format } from "date-fns";

export function isTimeUnavailable(
  unavailability: any[] | null | undefined,
  day: Date,
  hour: number,
  minute: number,
): boolean {
  if (
    !unavailability ||
    !Array.isArray(unavailability) ||
    unavailability.length === 0
  ) {
    return false;
  }

  const currentTime = new Date(day);
  currentTime.setHours(hour, minute);
  const dayOfWeek = format(day, "EEEE").toLowerCase();
  const formattedDate = format(day, "yyyy-MM-dd");

  return unavailability.some((u) => {
    if (u.booked_date && u.all_day) {
      return formattedDate === u.booked_date;
    }

    if (
      u.booked_date &&
      u.booked_start_time &&
      u.booked_end_time &&
      !u.all_day
    ) {
      const unavailableStart = new Date(
        `${u.booked_date}T${u.booked_start_time}`,
      );
      const unavailableEnd = new Date(
        `${u.booked_date}T${u.booked_end_time}`,
      );
      return (
        formattedDate === u.booked_date &&
        currentTime >= unavailableStart &&
        currentTime < unavailableEnd
      );
    }

    if (u.day_of_week && u.all_day) {
      return u.day_of_week === dayOfWeek;
    }

    if (
      u.day_of_week &&
      u.booked_start_time &&
      u.booked_end_time &&
      !u.all_day
    ) {
      if (u.day_of_week === dayOfWeek) {
        const [startHour, startMinute] = u.booked_start_time
          .split(":")
          .map(Number);
        const [endHour, endMinute] = u.booked_end_time.split(":").map(Number);

        const unavailableStart = new Date(day);
        unavailableStart.setHours(startHour, startMinute);
        const unavailableEnd = new Date(day);
        unavailableEnd.setHours(endHour, endMinute);

        return (
          currentTime >= unavailableStart && currentTime < unavailableEnd
        );
      }
    }

    if (u.start_date && u.end_date && u.range_all_day) {
      const rangeStart = new Date(u.start_date);
      const rangeEnd = new Date(u.end_date);
      rangeEnd.setHours(23, 59, 59);
      return currentTime >= rangeStart && currentTime <= rangeEnd;
    }

    if (
      u.start_date &&
      u.end_date &&
      !u.range_all_day &&
      u.range_start_time &&
      u.range_end_time
    ) {
      const rangeStart = new Date(u.start_date);
      const rangeEnd = new Date(u.end_date);
      rangeEnd.setHours(23, 59, 59);

      if (currentTime >= rangeStart && currentTime <= rangeEnd) {
        const [startHour, startMinute] = u.range_start_time
          .split(":")
          .map(Number);
        const [endHour, endMinute] = u.range_end_time.split(":").map(Number);

        const todayStart = new Date(day);
        todayStart.setHours(startHour, startMinute);

        const todayEnd = new Date(day);
        todayEnd.setHours(endHour, endMinute);

        return currentTime >= todayStart && currentTime < todayEnd;
      }
    }

    if (
      u.start_date &&
      u.end_date &&
      !u.range_all_day &&
      !u.range_start_time
    ) {
      const rangeStart = new Date(u.start_date);
      const rangeEnd = new Date(u.end_date);
      rangeEnd.setHours(23, 59, 59);
      return currentTime >= rangeStart && currentTime <= rangeEnd;
    }

    return false;
  });
}
