/**
 * Frontend Performance Optimization Guide
 * 
 * This file contains tips and utilities for optimizing React components
 */

// Type definitions
type AnyFunction = (...args: any[]) => any;

// 1. Use React.memo for expensive components
// Example:
// export const ExpensiveComponent = React.memo(({ data }) => {
//   return <div>{/* Complex rendering */}</div>;
// });

// 2. Use useMemo for expensive calculations
// Example:
// const sortedData = useMemo(() => {
//   return data.sort((a, b) => a.value - b.value);
// }, [data]);

// 3. Use useCallback for event handlers
// Example:
// const handleClick = useCallback(() => {
//   console.log('clicked');
// }, []);

// 4. Lazy load components
// Example:
// const HeavyComponent = lazy(() => import('./HeavyComponent'));

// 5. Optimize images
// Use Next.js Image component with proper sizing
// <Image src="/path" width={800} height={600} alt="" loading="lazy" />

// 6. Debounce search inputs
export const debounce = <T extends AnyFunction>(
  func: T,
  wait: number
): ((...args: Parameters<T>) => void) => {
  let timeout: ReturnType<typeof setTimeout> | null = null;
  
  return function executedFunction(...args: Parameters<T>): void {
    const later = () => {
      timeout = null;
      func(...args);
    };
    
    if (timeout) clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
};

// 7. Throttle scroll/resize events
export const throttle = <T extends AnyFunction>(
  func: T,
  limit: number
): ((...args: Parameters<T>) => void) => {
  let inThrottle = false;
  
  return function executedFunction(...args: Parameters<T>): void {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => {
        inThrottle = false;
      }, limit);
    }
  };
};

// 8. Virtual scrolling for long lists
// Use libraries like react-window or react-virtualized

// 9. Code splitting
// Split routes using Next.js dynamic imports
// const DynamicComponent = dynamic(() => import('../components/Component'))

// 10. Optimize bundle size
// - Tree shaking (automatic with Next.js)
// - Remove unused dependencies
// - Use bundle analyzer: npm run build && npx @next/bundle-analyzer

export default {
  debounce,
  throttle
};
