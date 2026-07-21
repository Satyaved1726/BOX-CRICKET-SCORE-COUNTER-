import React from 'react';

interface Props {
  className?: string;
}

export const ShimmerSkeleton: React.FC<Props> = ({ className = 'h-4 w-full rounded-lg' }) => {
  return (
    <div className={`animate-shimmer ${className}`} />
  );
};

export const MatchCardSkeleton: React.FC = () => {
  return (
    <div className="bg-[#111827] border border-gray-800 rounded-[20px] p-4 space-y-3 shadow-md">
      <div className="flex justify-between items-center">
        <ShimmerSkeleton className="h-3 w-24 rounded-full" />
        <ShimmerSkeleton className="h-3 w-16 rounded-full" />
      </div>
      <div className="space-y-2">
        <ShimmerSkeleton className="h-5 w-3/4 rounded-lg" />
        <ShimmerSkeleton className="h-4 w-1/2 rounded-lg" />
      </div>
      <div className="flex justify-between pt-2 border-t border-gray-800">
        <ShimmerSkeleton className="h-3 w-20 rounded-full" />
        <ShimmerSkeleton className="h-3 w-20 rounded-full" />
      </div>
    </div>
  );
};
