import { useEffect, useState } from 'react';

const useMediaQuery = (query: string) => {
  // console.log(`query = ${query}`);
  const mediaMatch = window.matchMedia(query);
  const [matches, setMatches] = useState(mediaMatch.matches);
  // console.log(`matches = ${matches}`);

  useEffect(() => {
    const handler = (e: MediaQueryListEvent) => setMatches(e.matches);
    mediaMatch.addEventListener('change', handler);
    return () => mediaMatch.removeEventListener('change', handler);
  }, [mediaMatch]);
  return matches;
};

export default useMediaQuery;
