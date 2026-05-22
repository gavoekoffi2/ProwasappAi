/** @type {import('next').NextConfig} */
module.exports = {
  reactStrictMode: true,
  // Standalone output is used by the Docker image to ship a slim runtime.
  // On Netlify the official @netlify/plugin-nextjs handles SSR itself and
  // doesn't want standalone, so we disable it there.
  ...(process.env.NETLIFY ? {} : { output: "standalone" }),
};
