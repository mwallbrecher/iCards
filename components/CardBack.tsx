type CardBackProps = {
  size?: "sm" | "md" | "lg";
};

const sizeClasses = {
  sm: "h-16 w-11",
  md: "h-24 w-16",
  lg: "h-28 w-20",
} as const;

export function CardBack({ size = "md" }: CardBackProps) {
  return (
    <div
      className={[
        "shrink-0 rounded-md border border-blue-950/40 bg-blue-700 shadow-sm",
        "bg-[repeating-linear-gradient(45deg,rgba(255,255,255,0.18)_0_6px,transparent_6px_12px)]",
        sizeClasses[size],
      ].join(" ")}
      aria-hidden="true"
    />
  );
}
