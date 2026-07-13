/** @type {import('postcss-load-config').Config} */
const config = {
  plugins: {
    '@tailwindcss/postcss': {},
    /* Kept after the v4 migration: @tailwindcss/postcss only Lightning-processes
       files with Tailwind directives — plain *.module.css files pass through
       unprefixed without autoprefixer (Safari backdrop-filter et al.). */
    autoprefixer: {},
  },
};

export default config;
