import React from 'react';

interface SkeletonProps {
  className?: string;
  style?: React.CSSProperties;
}

export const Skeleton: React.FC<SkeletonProps> = ({ className = '', style }) => (
  <div
    className={`animate-pulse bg-white/10 rounded ${className}`}
    style={style}
  />
);

export const SkeletonText: React.FC<{ lines?: number; className?: string }> = ({ 
  lines = 1, 
  className = '' 
}) => (
  <div className={`space-y-2 ${className}`}>
    {Array.from({ length: lines }).map((_, i) => (
      <Skeleton
        key={i}
        className="h-4"
        style={{ width: i === lines - 1 && lines > 1 ? '75%' : '100%' }}
      />
    ))}
  </div>
);

export const SkeletonCircle: React.FC<{ size?: number; className?: string }> = ({ 
  size = 32, 
  className = '' 
}) => (
  <Skeleton
    className={`rounded-full ${className}`}
    style={{ width: size, height: size }}
  />
);

interface SkeletonListProps {
  count?: number;
  className?: string;
  itemClassName?: string;
}

export const SkeletonList: React.FC<SkeletonListProps> = ({ 
  count = 3, 
  className = '',
  itemClassName = ''
}) => (
  <div className={`space-y-3 ${className}`}>
    {Array.from({ length: count }).map((_, i) => (
      <div key={i} className={`flex items-center gap-3 ${itemClassName}`}>
        <SkeletonCircle size={24} />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-3 w-3/4" />
          <Skeleton className="h-2 w-1/2" />
        </div>
      </div>
    ))}
  </div>
);

export const SkeletonCard: React.FC<{ className?: string }> = ({ className = '' }) => (
  <div className={`p-4 rounded-lg border border-white/5 bg-white/5 ${className}`}>
    <div className="flex items-start gap-3">
      <SkeletonCircle size={40} />
      <div className="flex-1 space-y-2">
        <Skeleton className="h-4 w-1/3" />
        <Skeleton className="h-3 w-full" />
        <Skeleton className="h-3 w-4/5" />
      </div>
    </div>
  </div>
);

export const SkeletonMessage: React.FC<{ isUser?: boolean }> = ({ isUser = false }) => (
  <div className={`flex gap-3 ${isUser ? 'flex-row-reverse' : ''}`}>
    <SkeletonCircle size={32} />
    <div className={`flex-1 max-w-[80%] space-y-2 ${isUser ? 'items-end' : ''}`}>
      <Skeleton className="h-4 w-24" />
      <div className="space-y-1.5">
        <Skeleton className="h-3 w-full" />
        <Skeleton className="h-3 w-5/6" />
        <Skeleton className="h-3 w-2/3" />
      </div>
    </div>
  </div>
);

export const SkeletonFileTree: React.FC<{ depth?: number; count?: number }> = ({ 
  depth = 2, 
  count = 5 
}) => (
  <div className="space-y-1">
    {Array.from({ length: count }).map((_, i) => (
      <div 
        key={i} 
        className="flex items-center gap-2 py-1.5"
        style={{ paddingLeft: `${(i % depth) * 16}px` }}
      >
        <Skeleton className="w-4 h-4" />
        <Skeleton 
          className="h-3" 
          style={{ width: `${60 + Math.random() * 40}%` }} 
        />
      </div>
    ))}
  </div>
);

export const SkeletonDiff: React.FC<{ lines?: number }> = ({ lines = 6 }) => (
  <div className="space-y-0.5 font-mono text-sm">
    {Array.from({ length: lines }).map((_, i) => (
      <div key={i} className="flex">
        <Skeleton className="w-8 h-5 rounded-none" />
        <Skeleton 
          className="h-5 rounded-none ml-2" 
          style={{ width: `${30 + Math.random() * 60}%` }} 
        />
      </div>
    ))}
  </div>
);

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({ 
  size = 'md', 
  className = '' 
}) => {
  const sizeClasses = {
    sm: 'w-4 h-4 border-2',
    md: 'w-6 h-6 border-2',
    lg: 'w-8 h-8 border-3'
  };
  
  return (
    <div 
      className={`${sizeClasses[size]} border-white/20 border-t-white rounded-full animate-spin ${className}`}
    />
  );
};

interface LoadingOverlayProps {
  message?: string;
  className?: string;
}

export const LoadingOverlay: React.FC<LoadingOverlayProps> = ({ 
  message, 
  className = '' 
}) => (
  <div className={`flex flex-col items-center justify-center gap-3 p-8 ${className}`}>
    <LoadingSpinner size="lg" />
    {message && (
      <span className="text-sm text-white/40">{message}</span>
    )}
  </div>
);

export default Skeleton;
