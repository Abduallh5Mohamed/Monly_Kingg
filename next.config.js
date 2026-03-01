/** @type {import('next').NextConfig} */
const nextConfig = {
  // Performance optimizations
  reactStrictMode: false,
  poweredByHeader: false,
  compress: true,

  // Production optimizations
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production' ? {
      exclude: ['error', 'warn'],
    } : false,
  },

  // Reduce bundle size via tree-shaking
  modularizeImports: {
    'lucide-react': {
      transform: 'lucide-react/dist/esm/icons/{{kebabCase member}}',
    },
  },

  // Experimental perf features
  experimental: {
    optimizePackageImports: ['@radix-ui/react-icons', 'lucide-react'],
    scrollRestoration: true,
  },

  // HTTP Agent Options for better connection handling
  httpAgentOptions: {
    keepAlive: true,
  },

  // Server runtime config for timeouts
  serverRuntimeConfig: {
    proxyTimeout: 60000, // 60 seconds
  },

  // Note: API proxy rewrites removed — server-integrated.js handles API routes
  // directly via Express middleware before the Next.js handler.
  // The old rewrite (source: '/api/:path*' → 'http://localhost:5000/api/:path*')
  // caused infinite loops when unmatched API paths fell through to Next.js.

  // Allow cross-origin requests from local network in dev
  allowedDevOrigins: ['192.168.1.4'],

  async redirects() {
    return [
      {
        source: '/user-chats',
        destination: '/user/chat',
        permanent: true,
      },
    ];
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: {
    unoptimized: true, // Disable Next.js image optimization for integrated server
    formats: ['image/avif', 'image/webp'],
    minimumCacheTTL: 60 * 60 * 24 * 30, // 30 days
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'placehold.co',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'picsum.photos',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'upload.wikimedia.org',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'www.clipartmax.com',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'api.dicebear.com',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: '*.googleusercontent.com',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: '*.googleapis.com',
        port: '',
        pathname: '/**',
      },
    ],
  },
  // Headers for caching static assets only (dynamic routes handled by performanceMiddleware)
  async headers() {
    return [
      {
        source: '/assets/:path*',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=31536000, immutable' },
        ],
      },
      {
        source: '/_next/static/:path*',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=31536000, immutable' },
        ],
      },
      {
        source: '/(.*)',
        headers: [
          { key: 'Origin-Agent-Cluster', value: '?1' },
        ],
      },
    ];
  },
};

export default nextConfig;