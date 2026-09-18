import React from 'react';

interface GoogleFilesLogoProps {
  size?: number;
  className?: string;
}

export const GoogleFilesLogo: React.FC<GoogleFilesLogoProps> = ({ size = 28, className = '' }) => {
  return (
    <div 
      style={{ width: size, height: size }}
      className={`relative flex items-center justify-center shrink-0 select-none ${className}`}
      title="Files by Akash Kumar"
    >
      <svg
        width={size}
        height={size}
        viewBox="0 0 48 48"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-full h-full drop-shadow-xs"
      >
        {/* Google Files Iconic Folded Document/Folder with 4 Google Colors */}
        {/* Base Folder Outline / Body */}
        <rect x="6" y="8" width="36" height="32" rx="6" fill="#F1F3F4" />
        
        {/* Blue flap (Top-left & body) */}
        <path
          d="M6 14C6 10.6863 8.68629 8 12 8H26L20 22H6V14Z"
          fill="#4285F4"
        />
        
        {/* Red flap (Top-right corner fold) */}
        <path
          d="M26 8H36C39.3137 8 42 10.6863 42 14V22H20L26 8Z"
          fill="#EA4335"
        />
        
        {/* Yellow flap (Bottom-left) */}
        <path
          d="M6 22H24L20 40H12C8.68629 40 6 37.3137 6 34V22Z"
          fill="#FBBC05"
        />
        
        {/* Green flap (Bottom-right) */}
        <path
          d="M24 22H42V34C42 37.3137 39.3137 40 36 40H20L24 22Z"
          fill="#34A853"
        />

        {/* Inner subtle fold shadow line */}
        <path
          d="M20 22L26 8L20 22L24 22L20 40"
          stroke="#FFFFFF"
          strokeWidth="1.2"
          strokeLinecap="round"
          strokeLinejoin="round"
          opacity="0.85"
        />
      </svg>
    </div>
  );
};
