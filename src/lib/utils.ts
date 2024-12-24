import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function generateRandomOTP(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

const monthNames = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

const dayNames = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

export function isDateGreaterThanToday(dateString: string): boolean {
  const inputDate = new Date(dateString);
  const today = new Date();
  return inputDate > today;
}

export function isDateEqualToToday(dateString: string): boolean {
  const inputDate = new Date(dateString);
  const today = new Date();
  const formattedToday = today.toISOString().split("T");
  return inputDate.toISOString().split("T") <= formattedToday;
}

export function getDateDifference(inputDate: string): {
  MM: string;
  DD: string;
} {
  const currentDate = new Date();
  const targetDate = new Date(inputDate);

  // Ensure the input date is valid
  if (isNaN(targetDate.getTime())) {
    throw new Error("Invalid date format. Use 'yyyy-mm-dd'.");
  }

  // Check if the input date is in the future
  const isFuture = targetDate > currentDate;

  let monthsDiff = targetDate.getMonth() - currentDate.getMonth();
  let daysDiff = targetDate.getDate() - currentDate.getDate();

  if (isFuture) {
    // Adjust the values for future dates
    if (daysDiff < 0) {
      monthsDiff--;
      const lastMonth = new Date(
        targetDate.getFullYear(),
        targetDate.getMonth(),
        0,
      );
      daysDiff += lastMonth.getDate();
    }

    if (monthsDiff < 0) {
      monthsDiff += 12;
    }
  } else {
    monthsDiff = currentDate.getMonth() - targetDate.getMonth();
    daysDiff = currentDate.getDate() - targetDate.getDate();

    if (daysDiff < 0) {
      monthsDiff--;
      const lastMonth = new Date(
        currentDate.getFullYear(),
        currentDate.getMonth(),
        0,
      );
      daysDiff += lastMonth.getDate();
    }

    if (monthsDiff < 0) {
      monthsDiff += 12;
    }
  }

  // Format MM and DD as two-digit strings
  const MM = Math.abs(monthsDiff).toString().padStart(2, "0");
  const DD = Math.abs(daysDiff).toString().padStart(2, "0");

  return { MM, DD };
}

export function getTotalDaysDifference(inputDate: string): { DD: string } {
  const currentDate = new Date();
  const targetDate = new Date(inputDate);

  // Ensure the input date is valid
  if (isNaN(targetDate.getTime())) {
    throw new Error("Invalid date format. Use 'yyyy-mm-dd'.");
  }

  // Calculate the difference in time (in milliseconds)
  const timeDifference = targetDate.getTime() - currentDate.getTime();

  // Convert the time difference to days (1 day = 24 * 60 * 60 * 1000 milliseconds)
  const totalDays = Math.ceil(timeDifference / (1000 * 60 * 60 * 24));

  // Ensure the DD is formatted as a two-digit string
  const DD = Math.abs(totalDays).toString().padStart(2, "0");

  return { DD };
}

export function formatDate(inputDate: string): string {
  const targetDate = new Date(inputDate);
  const day = targetDate.getDate();
  const month = monthNames[targetDate.getMonth()];
  const weekday = dayNames[targetDate.getDay()];
  return `${day} ${month}, ${weekday}`;
}

export function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function numberToText(num: number): string {
  const numbers = [
    "Zero",
    "One",
    "Two",
    "Three",
    "Four",
    "Five",
    "Six",
    "Seven",
    "Eight",
    "Nine",
    "Ten",
  ];

  if (num >= 0 && num <= 10) {
    return numbers[num];
  }
  return num.toString();
}
