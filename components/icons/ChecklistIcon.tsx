import React from 'react';

const ChecklistIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    {...props}
  >
    <path d="M15 6l-1 1-1-1" />
    <path d="M15 12l-1 1-1-1" />
    <path d="M15 18l-1 1-1-1" />
    <path d="M8 6h5" />
    <path d="M8 12h5" />
    <path d="M8 18h5" />
    <path d="M4 6h1" />
    <path d="M4 12h1" />
    <path d="M4 18h1" />
  </svg>
);

export default ChecklistIcon;