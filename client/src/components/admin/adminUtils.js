import { API_URL } from "../../config";
export const API = `${API_URL}/api/admin`;

export const STATUSES = [
  "Submitted",
  "Under Review",
  "Assigned",
  "In Progress",
  "Resolved",
  "Closed",
];

export const PRIORITIES = ["Low", "Medium", "High", "Urgent"];

export const OPEN_STATUSES = STATUSES.slice(0, 4);

export const isOpen = (complaint) =>
  OPEN_STATUSES.includes(complaint.status);

export const slug = (value = "") =>
  value.toLowerCase().replace(/[^a-z0-9]+/g, "-");

export const formatDate = (date) =>
  date
    ? new Date(date).toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      })
    : "—";

export const formatDateTime = (date) =>
  date
    ? new Date(date).toLocaleString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    : "—";

export const timeAgo = (date) => {
  if (!date) {
    return "—";
  }

  const seconds = Math.floor((Date.now() - new Date(date)) / 1000);

  const units = [
    ["year", 31536000],
    ["month", 2592000],
    ["day", 86400],
    ["hour", 3600],
    ["minute", 60],
  ];

  for (const [unit, size] of units) {
    const value = Math.floor(seconds / size);

    if (value >= 1) {
      return `${value} ${unit}${value > 1 ? "s" : ""} ago`;
    }
  }

  return "just now";
};

export const initials = (name = "") =>
  name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("") || "?";
