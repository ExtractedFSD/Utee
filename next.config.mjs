/** @type {import('next').NextConfig} */
const nextConfig = {
  // The patient report PDF is rendered on the server with the brand fonts
  // and logo read from disk. Vercel only ships files it can trace through
  // imports, so name them for the routes that render the report.
  outputFileTracingIncludes: {
    "/clinic/case/[kitId]/report": ["./design-system/fonts/**", "./public/logo-*.png"],
    "/clinic/case/[kitId]/report/preview": ["./design-system/fonts/**", "./public/logo-*.png"],
    "/clinic/case/[kitId]": ["./design-system/fonts/**", "./public/logo-*.png"],
  },
};

export default nextConfig;
