
import React from 'react';

interface AuditTabProps {
  title: string;
  isActive: boolean;
  onClick: () => void;
  className?: string;
}

const AuditTab: React.FC<AuditTabProps> = ({ title, isActive, onClick, className }) => {
  return (
    <button
      onClick={onClick}
      className={`
        flex items-center justify-center p-4 rounded-lg shadow-md
        text-center font-semibold text-lg
        transition-all duration-300 ease-in-out
        ${isActive ? 'bg-blue-600 text-white scale-105' : 'bg-white text-gray-800 hover:bg-gray-50 hover:shadow-lg'}
        ${className || ''}
      `}
    >
      {title}
    </button>
  );
};

export default AuditTab;
