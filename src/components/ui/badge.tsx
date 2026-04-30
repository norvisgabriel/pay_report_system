import { cn, STATUS_COLORS, STATUS_LABELS } from "@/lib/utils";

interface BadgeProps {
  status: string;
  className?: string;
}

export function StatusBadge({ status, className }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium",
        STATUS_COLORS[status] ?? "bg-gray-100 text-gray-800",
        className
      )}
    >
      {STATUS_LABELS[status] ?? status}
    </span>
  );
}

interface ChipProps {
  children: React.ReactNode;
  color?: "blue" | "green" | "red" | "yellow" | "gray";
  className?: string;
}

const chipColors = {
  blue: "bg-blue-100 text-blue-800",
  green: "bg-green-100 text-green-800",
  red: "bg-red-100 text-red-800",
  yellow: "bg-yellow-100 text-yellow-800",
  gray: "bg-gray-100 text-gray-700",
};

export function Chip({ children, color = "gray", className }: ChipProps) {
  return (
    <span className={cn("inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium", chipColors[color], className)}>
      {children}
    </span>
  );
}
