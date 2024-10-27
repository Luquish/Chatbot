/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  async headers() {
    return [
      {
        source: '/chat',
        headers: [
          {
            key: 'Access-Control-Allow-Origin',
            value: '*', // En producción, cambia esto a la URL de tu extensión
          },
        ],
      },
    ];
  },
};

module.exports = nextConfig;
