export const nextFullstackFiles = {
  "app/globals.css": `@tailwind base;
@tailwind components;
@tailwind utilities;

html,
body {
  padding: 0;
  margin: 0;
  font-family: -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, Oxygen,
    Ubuntu, Cantarell, Fira Sans, Droid Sans, Helvetica Neue, sans-serif;
}

a {
  color: inherit;
  text-decoration: none;
}

* {
  box-sizing: border-box;
}`,

  "postcss.config.js": `module.exports = {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
}`,

  "package.json": `{
  "name": "next-fullstack-app",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "next lint"
  },
  "dependencies": {
    "next": "14.0.4",
    "react": "^18",
    "react-dom": "^18",
    "@next/font": "14.0.4",
    "tailwindcss": "^3.3.0",
    "autoprefixer": "^10.0.1",
    "postcss": "^8"
  },
  "devDependencies": {
    "typescript": "^5",
    "@types/node": "^20",
    "@types/react": "^18",
    "@types/react-dom": "^18",
    "eslint": "^8",
    "eslint-config-next": "14.0.4"
  }
}`,

  "next.config.js": `/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    appDir: true,
  },
}

module.exports = nextConfig`,

  "tailwind.config.js": `/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'gradient-conic':
          'conic-gradient(from 180deg at 50% 50%, var(--tw-gradient-stops))',
      },
    },
  },
  plugins: [],
}`,

  "app/layout.tsx": `import './globals.css'
import { Inter } from 'next/font/google'

const inter = Inter({ subsets: ['latin'] })

export const metadata = {
  title: 'Next.js Full Stack App',
  description: 'A full-stack Next.js application with API routes',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={inter.className}>{children}</body>
    </html>
  )
}`,

  "app/page.tsx": `import Image from 'next/image'
import Link from 'next/link'

export default function Home() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-cyan-50">
      <div className="container mx-auto px-4 py-16">
        <div className="text-center max-w-4xl mx-auto">
          <h1 className="text-5xl font-bold text-gray-900 mb-6">
            🚀 Next.js Full Stack
          </h1>
          <p className="text-xl text-gray-600 mb-8">
            A complete full-stack application with Next.js 14, TypeScript, and Tailwind CSS
          </p>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mt-12">
            <div className="bg-white rounded-lg shadow-lg p-6 hover:shadow-xl transition-shadow">
              <h3 className="text-xl font-semibold text-gray-900 mb-3">⚡ Server Components</h3>
              <p className="text-gray-600 mb-4">
                Built with the new App Router and React Server Components
              </p>
              <Link href="/dashboard" className="text-blue-600 hover:text-blue-800 font-medium">
                View Dashboard →
              </Link>
            </div>
            
            <div className="bg-white rounded-lg shadow-lg p-6 hover:shadow-xl transition-shadow">
              <h3 className="text-xl font-semibold text-gray-900 mb-3">🗄️ API Routes</h3>
              <p className="text-gray-600 mb-4">
                Full-stack functionality with built-in API endpoints
              </p>
              <Link href="/api/hello" className="text-blue-600 hover:text-blue-800 font-medium">
                Test API →
              </Link>
            </div>
            
            <div className="bg-white rounded-lg shadow-lg p-6 hover:shadow-xl transition-shadow">
              <h3 className="text-xl font-semibold text-gray-900 mb-3">🎨 Tailwind CSS</h3>
              <p className="text-gray-600 mb-4">
                Beautiful, responsive design with utility-first CSS
              </p>
              <span className="text-blue-600 font-medium">Styled & Ready</span>
            </div>
          </div>
          
          <div className="mt-16 bg-gray-50 rounded-xl p-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">🛠 Quick Start</h2>
            <div className="text-left max-w-2xl mx-auto">
              <pre className="bg-gray-900 text-green-400 p-4 rounded-lg overflow-x-auto">
{\`# Install dependencies
npm install

# Start development server  
npm run dev

# Build for production
npm run build\`}
              </pre>
            </div>
          </div>
        </div>
      </div>
    </main>
  )
}`,

  "app/dashboard/page.tsx": `export default function Dashboard() {
  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="container mx-auto px-4">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Dashboard</h1>
        
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Welcome</h2>
            <p className="text-gray-600">This is your dashboard page built with Server Components.</p>
          </div>
          
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Statistics</h2>
            <div className="text-3xl font-bold text-blue-600">42</div>
            <p className="text-gray-500">Active users</p>
          </div>
          
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Quick Actions</h2>
            <button className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700">
              New Item
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}`,

  "app/api/hello/route.ts": `export async function GET(request: Request) {
  return Response.json({ 
    message: 'Hello from Next.js API!',
    timestamp: new Date().toISOString(),
    success: true
  })
}

export async function POST(request: Request) {
  const body = await request.json()
  
  return Response.json({ 
    message: 'Data received successfully!',
    data: body,
    timestamp: new Date().toISOString()
  })
}`,

  "styles/globals.css": `@tailwind base;
@tailwind components;
@tailwind utilities;

:root {
  --foreground-rgb: 0, 0, 0;
  --background-start-rgb: 214, 219, 220;
  --background-end-rgb: 255, 255, 255;
}

@media (prefers-color-scheme: dark) {
  :root {
    --foreground-rgb: 255, 255, 255;
    --background-start-rgb: 0, 0, 0;
    --background-end-rgb: 0, 0, 0;
  }
}

body {
  color: rgb(var(--foreground-rgb));
}`,

  "tsconfig.json": `{
  "compilerOptions": {
    "target": "es5",
    "lib": ["dom", "dom.iterable", "es6"],
    "allowJs": true,
    "skipLibCheck": true,
    "strict": true,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "preserve",
    "incremental": true,
    "plugins": [
      {
        "name": "next"
      }
    ],
    "paths": {
      "@/*": ["./*"]
    }
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
  "exclude": ["node_modules"]
}`,

  "README.md": `# Next.js Full Stack App

A complete full-stack application built with Next.js 14, TypeScript, and Tailwind CSS.

## 🚀 Features

- **Next.js 14** with App Router
- **React Server Components**
- **TypeScript** for type safety
- **Tailwind CSS** for styling
- **API Routes** for backend functionality

## 📁 Project Structure

\`\`\`
app/
├── layout.tsx          # Root layout
├── page.tsx            # Home page
├── dashboard/
│   └── page.tsx        # Dashboard page
└── api/
    └── hello/
        └── route.ts    # API endpoint
\`\`\`

## 🛠 Getting Started

\`\`\`bash
# Install dependencies
npm install

# Run development server
npm run dev

# Build for production
npm run build
\`\`\`

Visit [http://localhost:3000](http://localhost:3000) to see your app!

## 📡 API Routes

- \`GET /api/hello\` - Test endpoint
- \`POST /api/hello\` - Echo endpoint

Happy coding! 🎉`
};