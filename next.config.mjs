/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Export estático (carpeta `out/`) para S3/CloudFront
  output: "export",
}

export default nextConfig
