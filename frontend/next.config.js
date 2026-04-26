/** @type {import('next').NextConfig} */
const isStaticExport = process.env.STATIC_EXPORT === "true";

module.exports = {
  reactStrictMode: true,
  output: isStaticExport ? "export" : "standalone",
};
