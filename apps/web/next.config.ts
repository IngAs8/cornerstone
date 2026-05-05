import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

const nextConfig: NextConfig = {
  // Allow imports from workspace packages
  transpilePackages: [
    "@cornerstone/core",
    "@cornerstone/db",
    "@cornerstone/types",
  ],
  // typedRoutes is disabled until all dashboard sub-routes have page.tsx files.
  // Re-enable once the sidebar destinations are implemented.
};

export default withNextIntl(nextConfig);
