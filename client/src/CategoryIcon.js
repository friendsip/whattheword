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
  History: (
    <>
      {/* classical temple */}
      <path d="M4.5 9 L12 3.8 L19.5 9 Z" />
      <path d="M6.5 9 L6.5 17" />
      <path d="M10.2 9 L10.2 17" />
      <path d="M13.8 9 L13.8 17" />
      <path d="M17.5 9 L17.5 17" />
      <path d="M4.5 17 L19.5 17" />
      <path d="M5.5 20 L18.5 20" />
    </>
  ),
  Space: (
    <>
      {/* rocket */}
      <path d="M12 3 C 15 5.8, 15.4 10.8, 13.6 14.5 L10.4 14.5 C 8.6 10.8, 9 5.8, 12 3 Z" />
      <circle cx="12" cy="8.6" r="1.6" />
      <path d="M10.4 12.5 L7.4 16.6 L10 15.8" />
      <path d="M13.6 12.5 L16.6 16.6 L14 15.8" />
      <path d="M12 17 L12 20.5" />
    </>
  ),
  'Books & Stories': (
    <>
      {/* open book */}
      <path d="M12 6.5 C 9.5 4.8, 6 4.5, 4 5.5 L4 18 C 6 17, 9.5 17.3, 12 19" />
      <path d="M12 6.5 C 14.5 4.8, 18 4.5, 20 5.5 L20 18 C 18 17, 14.5 17.3, 12 19" />
      <path d="M12 6.5 L12 19" />
    </>
  ),
  'Sport & Games': (
    <>
      {/* football */}
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 8.4 L15.1 10.6 L13.9 14.2 L10.1 14.2 L8.9 10.6 Z" fill="currentColor" stroke="none" />
      <path d="M12 8.4 L12 4.5" />
      <path d="M15.1 10.6 L18.8 9.4" />
      <path d="M13.9 14.2 L16.2 17.6" />
      <path d="M10.1 14.2 L7.8 17.6" />
      <path d="M8.9 10.6 L5.2 9.4" />
    </>
  ),
  Food: (
    <>
      {/* apple */}
      <path d="M12 8 C 8.5 5.5, 5 8, 5.8 12.2 C 6.5 16.3, 9.2 19.8, 12 18.8 C 14.8 19.8, 17.5 16.3, 18.2 12.2 C 19 8, 15.5 5.5, 12 8 Z" />
      <path d="M12 7.6 C 12 5.6, 13 4.4, 14.8 3.8" />
      <path d="M13.2 5.4 C 15 4.6, 16.6 5.4, 16.8 6.8 C 15 7.6, 13.4 6.8, 13.2 5.4 Z" />
    </>
  ),
  Music: (
    <>
      {/* eighth note */}
      <ellipse cx="8" cy="17" rx="2.6" ry="2.1" fill="currentColor" stroke="none" />
      <path d="M10.5 17 L10.5 5.5" />
      <path d="M10.5 5.5 C 14 5.5, 16 7.5, 15.5 11" />
    </>
  ),
  'Nature & Outdoors': (
    <>
      {/* tree */}
      <path d="M12 3.5 C 7.2 3.5, 5.2 7.8, 7.6 10.8 C 5.6 12.8, 7 15.8, 10 15.8 L 14 15.8 C 17 15.8, 18.4 12.8, 16.4 10.8 C 18.8 7.8, 16.8 3.5, 12 3.5 Z" />
      <path d="M12 15.8 L12 21" />
      <path d="M12 13 L9.6 10.6" />
    </>
  ),
  Christmas: (
    <>
      {/* tiered tree */}
      <path d="M12 3 L8.5 9 L10.5 9 L7 14 L9.5 14 L5.5 19 L18.5 19 L14.5 14 L17 14 L13.5 9 L15.5 9 Z" />
      <path d="M12 19 L12 21.4" />
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
