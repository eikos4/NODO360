import type { SVGProps } from 'react';

type Props = SVGProps<SVGSVGElement> & { size?: number };

export function HelmetIcon({ size = 24, ...props }: Props) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      <path d="M10 3h4v3h-4z" />
      <path d="M5 13c0-4 3.1-7 7-7s7 3 7 7" />
      <path d="M3 15c2.4-1.6 15.6-1.6 18 0" />
      <path d="M4 17c.8 1.5 2.6 2.4 8 2.4s7.2-.9 8-2.4" />
      <path d="M10 10h4v3.4c0 .5-.5 1.1-2 2.1-1.5-1-2-1.6-2-2.1z" />
    </svg>
  );
}
