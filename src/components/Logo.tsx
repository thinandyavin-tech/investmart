interface LogoProps {
  className?: string;
  size?: number;
}

export function Logo({ className = "", size = 24 }: LogoProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-label="InvestMart"
    >
      <path d="M3 12L12 3l9 9" />
      <path d="M5 10v11h5v-7h4v7h5V10" />
    </svg>
  );
}
