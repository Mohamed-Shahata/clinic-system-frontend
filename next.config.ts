import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./src/lib/i18n/request.ts");

export default withNextIntl({
  reactStrictMode: true,
  experimental: {
    staleTimes: {
      dynamic: 30,
      static: 180,
    },
  },
  serverExternalPackages: [],
  // Allow up to 11MB uploads (10MB file + multipart overhead)
  api: {
    bodyParser: {
      sizeLimit: "11mb",
    },
    responseLimit: "11mb",
  },
});
