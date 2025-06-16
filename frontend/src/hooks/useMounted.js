import { useRef, useEffect, useCallback } from "react";

export function useMounted() {
  const mountedRef = useRef(false);

  useEffect(() => {
    mountedRef.current = true; // Set to true when component mounts
    return () => {
      mountedRef.current = false; // Set to false when component unmounts
    };
  }, []);

  // Return a stable function that checks if component is mounted
  return useCallback(() => mountedRef.current, []);
}
