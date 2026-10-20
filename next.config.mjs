/** @type {import('next').NextConfig} */
const nextConfig = {
  // The portal moved to portal.myutee.co.uk. Kits already printed carry QR
  // codes for the .com address, and old emails link to it, so the old host
  // sends every path to the new one permanently.
  async redirects() {
    return [
      {
        source: "/:path*",
        has: [{ type: "host", value: "portal.myutee.com" }],
        destination: "https://portal.myutee.co.uk/:path*",
        permanent: true,
      },
    ];
  },
  // The patient report PDF is rendered on the server with the brand fonts
  // and logo read from disk. Vercel only ships files it can trace through
  // imports, so name them for the routes that render the report.
  outputFileTracingIncludes: {
    "/clinic/case/[kitId]/report": ["./design-system/fonts/**", "./public/logo-*.png"],
    "/clinic/case/[kitId]/report/preview": ["./design-system/fonts/**", "./public/logo-*.png"],
    "/clinic/case/[kitId]": ["./design-system/fonts/**", "./public/logo-*.png"],
    "/portal/tracker/passport": ["./design-system/fonts/**", "./public/logo-*.png"],
  },
};

export default nextConfig;
