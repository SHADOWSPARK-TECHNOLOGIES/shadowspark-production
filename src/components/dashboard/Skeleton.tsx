interface SkeletonProps {
  width?: string | number;
  height?: string | number;
  className?: string;
  rounded?: boolean;
}

export function Skeleton({ width, height = 16, className = '', rounded = true }: SkeletonProps) {
  return (
    <div
      className={`bg-zinc-800/50 animate-pulse ${rounded ? 'rounded-lg' : ''} ${className}`}
      style={{ width: typeof width === 'number' ? `${width}px` : width, height: typeof height === 'number' ? `${height}px` : height }}
      aria-hidden="true"
    />
  );
}
