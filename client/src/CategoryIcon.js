import React from 'react';

// Hand-authored line icons for the category cards. All share one 24x24 grid
// and use `currentColor`, so they inherit the card's text/accent colour and
// adapt to light and dark mode automatically (accent-blue when selected).
const PATHS = {
  General: (
    <>
      <rect x="4" y="4" width="16" height="16" rx="3" />
      <circle cx="8.5" cy="8.5" r="1.15" fill="currentColor" stroke="none" />
      <circle cx="15.5" cy="8.5" r="1.15" fill="currentColor" stroke="none" />
      <circle cx="12" cy="12" r="1.15" fill="currentColor" stroke="none" />
      <circle cx="8.5" cy="15.5" r="1.15" fill="currentColor" stroke="none" />
      <circle cx="15.5" cy="15.5" r="1.15" fill="currentColor" stroke="none" />
    </>
  ),
  Shakespeare: (
    <>
      {/* quill feather */}
      <path d="M18 4 C 11 6, 7 12, 6 19 L 8.5 16.5 C 10 12, 13 8.5, 18 6.5 Z" />
      <path d="M15 7 L 9 15" />
      <path d="M6 19 L 4 21" />
    </>
  ),
  Science: (
    <>
      {/* conical flask */}
      <path d="M9 3 L15 3" />
      <path d="M10 3 L10 9 L5 18 C 4.3 19.3, 5.2 20.5, 7 20.5 L17 20.5 C 18.8 20.5, 19.7 19.3, 19 18 L14 9 L14 3" />
      <path d="M7.6 15 L16.4 15" />
    </>
  ),
  Animals: (
    <>
      {/* paw print */}
      <ellipse cx="12" cy="16" rx="4.2" ry="3.3" fill="currentColor" stroke="none" />
      <ellipse cx="6.8" cy="10.6" rx="1.5" ry="2" fill="currentColor" stroke="none" />
      <ellipse cx="10.2" cy="8.4" rx="1.5" ry="2.1" fill="currentColor" stroke="none" />
      <ellipse cx="13.8" cy="8.4" rx="1.5" ry="2.1" fill="currentColor" stroke="none" />
      <ellipse cx="17.2" cy="10.6" rx="1.5" ry="2" fill="currentColor" stroke="none" />
    </>
  ),
  Geography: (
    <>
      {/* globe */}
      <circle cx="12" cy="12" r="8.5" />
      <ellipse cx="12" cy="12" rx="3.6" ry="8.5" />
      <path d="M3.5 12 L20.5 12" />
    </>
  ),
  Movies: (
    <>
      {/* clapperboard */}
      <rect x="4" y="8.5" width="16" height="11" rx="1.2" />
      <path d="M4 8.5 L4 5.4 L20 6.7 L20 8.5" />
      <path d="M7 5.6 L9 8.5" />
      <path d="M11 5.9 L13 8.5" />
      <path d="M15 6.2 L17 8.5" />
    </>
  ),
  'Pop Music': (
    <>
      {/* eighth note */}
      <ellipse cx="8" cy="17" rx="2.6" ry="2.1" fill="currentColor" stroke="none" />
      <path d="M10.5 17 L10.5 5.5" />
      <path d="M10.5 5.5 C 14 5.5, 16 7.5, 15.5 11" />
    </>
  ),
  Christmas: (
    <>
      {/* tiered tree */}
      <path d="M12 3 L8.5 9 L10.5 9 L7 14 L9.5 14 L5.5 19 L18.5 19 L14.5 14 L17 14 L13.5 9 L15.5 9 Z" />
      <path d="M12 19 L12 21.4" />
    </>
  ),
  'Friends TV Show': (
    <>
      {/* coffee cup + steam */}
      <path d="M6 9 L17 9 L16 19 C 16 20, 15.2 20.5, 14 20.5 L9 20.5 C 7.8 20.5, 7 20, 7 19 Z" />
      <path d="M16.4 11 C 19.4 11, 19.4 16, 16 16" />
      <path d="M9.5 6.5 C 10.5 5.5, 9.5 4.5, 10 3.5" />
      <path d="M13 6.5 C 14 5.5, 13 4.5, 13.5 3.5" />
    </>
  ),
  'The Bible': (
    <>
      {/* open book + small cross */}
      <path d="M12 7 C 9.5 5.3, 6 5, 4 6 L4 18 C 6 17, 9.5 17.3, 12 19" />
      <path d="M12 7 C 14.5 5.3, 18 5, 20 6 L20 18 C 18 17, 14.5 17.3, 12 19" />
      <path d="M12 7 L12 19" />
      <path d="M12 2.3 L12 4.7" />
      <path d="M10.85 3.5 L13.15 3.5" />
    </>
  ),
  'US Politics': (
    <>
      {/* capitol dome */}
      <path d="M12 3.2 L12 4.8" />
      <path d="M7.5 10 Q12 4.8 16.5 10" />
      <path d="M6 10 L18 10" />
      <path d="M7.2 10 L7.2 17" />
      <path d="M10.4 10 L10.4 17" />
      <path d="M13.6 10 L13.6 17" />
      <path d="M16.8 10 L16.8 17" />
      <path d="M5 17 L19 17 L18 20 L6 20 Z" />
    </>
  ),
  'UK Politics': (
    <>
      {/* clock tower */}
      <path d="M9 8 L12 3.5 L15 8" />
      <path d="M9.5 8 L9.5 20" />
      <path d="M14.5 8 L14.5 20" />
      <path d="M9.5 8 L14.5 8" />
      <circle cx="12" cy="12" r="2" />
      <path d="M12 12 L12 10.8" />
      <path d="M12 12 L13 12.4" />
      <path d="M8 20 L16 20" />
    </>
  ),
  Custom: (
    <>
      {/* pencil */}
      <path d="M16 5.5 L18.5 8 L9 17.5 L6.5 15 Z" />
      <path d="M6.5 15 L5 19 L9 17.5" />
      <path d="M14 7.5 L16.5 10" />
    </>
  ),
  CustomList: (
    <>
      {/* word list */}
      <rect x="5" y="3" width="14" height="18" rx="2" />
      <circle cx="8.3" cy="8" r="0.7" fill="currentColor" stroke="none" />
      <circle cx="8.3" cy="12" r="0.7" fill="currentColor" stroke="none" />
      <circle cx="8.3" cy="16" r="0.7" fill="currentColor" stroke="none" />
      <path d="M10.6 8 L16 8" />
      <path d="M10.6 12 L16 12" />
      <path d="M10.6 16 L14 16" />
    </>
  ),
};

export default function CategoryIcon({ name }) {
  return (
    <svg
      className="cat-icon-svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {PATHS[name] || PATHS.General}
    </svg>
  );
}
