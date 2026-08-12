import type { NextConfig } from 'next';
import { resolve } from 'node:path';
import { config } from 'dotenv';

config({ path: resolve(__dirname, '../../.env') });

const nextConfig: NextConfig = {
  poweredByHeader: false,
  output: 'standalone',
};

export default nextConfig;
