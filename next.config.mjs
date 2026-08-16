/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverActions: {
      // MOP uploads (PDF/DOCX) can be a few MB — raise the default 1MB
      // server action body limit to accommodate them.
      bodySizeLimit: "25mb",
    },
  },
};

export default nextConfig;
