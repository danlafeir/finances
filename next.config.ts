import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  experimental: {
    // Default Server Action body limit is 1MB, which would silently reject any
    // uploaded insurance policy PDF/photo over that. 20MB gives headroom above
    // the 15MB app-level cap in src/lib/insurance/documents.ts for multipart framing.
    serverActions: {
      bodySizeLimit: "20mb",
    },
  },
};

export default nextConfig;
