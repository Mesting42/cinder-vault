// One stroke vocabulary for combat actions. Shapes remain legible at 24px.
const paths={
  roll:'M4 15h5m-3 4h5M15 4l4 3-3 4-4-2 3-5ZM13 10l-3 4 5 2 3 5m-3-5 4-4 3 1',
  shooter:'M4 15h10v5H8v-5m-4 0v-4h12v4h-2m2-4h4m-4-4 2-4m2 6 3-1M11 6l-2-3',
  mage:'M12 2v20M3.3 7l17.4 10M3.3 17 20.7 7M9 4l3 3 3-3M9 20l3-3 3 3M4 10l4-1-1-4M20 14l-4 1 1 4M4 14l4 1-1 4M20 10l-4-1 1-4',
  warrior:'m5 19 3-3m1 3-4-4M8 16l9-12 4-1-1 4-12 9Zm7-10 3 3M3 9l4 1m-4 3h3m12 4 3 1m-3 3 2-2',
  pulse:'M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8M6 5a9 9 0 0 0 0 14M18 5a9 9 0 0 1 0 14M12 2v3m0 14v3M2 12h3m14 0h3',
  turret:'M6 11h10v5H6zM16 12h6M9 16l-4 6m8-6 4 6M10 11V6h4v5M12 3V1',
  time:'M12 3a9 9 0 1 0 9 9M12 7v6l4 2M17 3v6m4-6v6',
  heal:'M10 3h4v4l4 4v9H6v-9l4-4V3Zm0 2h4M9 15h6m-3-3v6',
  interact:'M8 13V5a1.5 1.5 0 0 1 3 0v7-9a1.5 1.5 0 0 1 3 0v9-7a1.5 1.5 0 0 1 3 0v8-5a1.5 1.5 0 0 1 3 0v7l-4 7H9L3 14a2 2 0 0 1 3-2l2 3',
  reload:'M4 8V4h4M4 8a9 9 0 0 1 16 0M9 11h6v9H9zM9 14h6M20 12v5h-4m4 0a9 9 0 0 1-14 4',
  mana:'M12 3 6 10l6 10 6-10-6-7Zm-6 7h12M3 8V4h4m-4 4a10 10 0 0 1 17-2M21 16v4h-4m4-4a10 10 0 0 1-17 2',
  switch:'M3 5h13l-3-3m3 3-3 3M21 19H8l3-3m-3 3 3 3M4 11h6v3H6v3H4v-6Zm10-1 3-2 3 2v5h-6v-5Z',
  blank:'M12 7a5 5 0 1 0 0 10 5 5 0 0 0 0-10M12 10v4m0 2v.1M12 2v2m0 16v2M2 12h2m16 0h2M5 5l1.5 1.5M17.5 17.5 19 19M5 19l1.5-1.5M17.5 6.5 19 5',
  map:'M3 5l6-2 6 2 6-2v16l-6 2-6-2-6 2V5Zm6-2v16m6-14v16',
  build:'M8 3 3 6l2 6 3-1v10h8V11l3 1 2-6-5-3a4 4 0 0 1-8 0ZM8 15h8',
  health:'M9 3h6v6h6v6h-6v6H9v-6H3V9h6V3Z',
  shield:'M12 2 21 6v6c0 5-9 10-9 10S3 17 3 12V6l9-4Z',
  coins:'M12 2 22 12 12 22 2 12 12 2Zm0 5 5 5-5 5-5-5 5-5Z',
  keys:'M15 3a6 6 0 1 0 0 12 6 6 0 0 0 0-12M10.8 13.2 3 21m0-5 3 3m9-12h.01',
};
export const hudIcon=name=>`<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="${paths[name]||paths.pulse}"/></svg>`;
