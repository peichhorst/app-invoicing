'use client';

import { signIn, getCsrfToken, getProviders } from "next-auth/react";
import GoogleIcon from "@mui/icons-material/Google";
import { useEffect, useState } from 'react';

interface Provider {
  id: string;
  name: string;
  type: string;
  signinUrl: string;
  callbackUrl: string;
}

export default function LoginPage() {
  const [debugInfo, setDebugInfo] = useState<any>({});
  const [providers, setProviders] = useState<Record<string, Provider> | null>(null);

  useEffect(() => {
    // Gather debug information
    const gatherDebugInfo = async () => {
      try {
        const csrfToken = await getCsrfToken();
        const availableProviders = await getProviders();
        
        setDebugInfo({
          timestamp: new Date().toISOString(),
          userAgent: navigator.userAgent,
          href: window.location.href,
          origin: window.location.origin,
          pathname: window.location.pathname,
          hasLocalStorage: typeof Storage !== 'undefined',
          localStorageKeys: typeof Storage !== 'undefined' ? Object.keys(localStorage) : [],
          hasSessionStorage: typeof Storage !== 'undefined',
          sessionStorageKeys: typeof Storage !== 'undefined' ? Object.keys(sessionStorage) : [],
        });
        
        setProviders(availableProviders);
      } catch (error) {
        console.error('Error gathering debug info:', error);
        setDebugInfo({
          error: error instanceof Error ? error.message : String(error),
          timestamp: new Date().toISOString()
        });
      }
    };

    gatherDebugInfo();
  }, []);

  const handleLocalSignIn = async () => {
    try {
      const result = await signIn('credentials', {
        redirect: true,
        callbackUrl: '/',
      });
      console.log('Sign in result:', result);
    } catch (error) {
      console.error('Sign in error:', error);
    }
  };

  return (
    <>
      <div className="flex flex-col items-center justify-center min-h-screen bg-white dark:bg-zinc-950">
        <h1 className="text-2xl font-bold mb-6 text-zinc-900 dark:text-zinc-100">Sign in to ClientWave</h1>
        
        {/* Google Sign In Button */}
        <button
          className="flex items-center gap-2 px-6 py-3 bg-blue-600 dark:bg-blue-700 text-white rounded-lg shadow hover:bg-blue-700 dark:hover:bg-blue-800 mb-4"
          onClick={() => signIn("google")}
        >
          <GoogleIcon /> Sign in with Google
        </button>

        {/* Local Sign In Form */}
        <div className="w-full max-w-md p-6 bg-gray-50 dark:bg-zinc-800 rounded-lg shadow-inner mb-4">
          <h2 className="text-lg font-semibold mb-4 text-center text-zinc-800 dark:text-zinc-200">Or sign in locally</h2>
          <form onSubmit={async (e) => {
            e.preventDefault();
            const formData = new FormData(e.target as HTMLFormElement);
            const email = formData.get('email') as string;
            const password = formData.get('password') as string;

            try {
              const response = await fetch('/api/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password })
              });

              if (response.ok) {
                // Successful login - redirect to callback URL or default
                const urlParams = new URLSearchParams(window.location.search);
                const callbackUrl = urlParams.get('callbackUrl') || '/';
                window.location.href = callbackUrl;
              } else {
                const errorData = await response.text();
                console.error('Login failed:', errorData);
                alert(`Login failed: ${errorData}`);
              }
            } catch (error) {
              console.error('Login error:', error);
              alert('An error occurred during login. Please try again.');
            }
          }}>
            <div className="mb-4">
              <label htmlFor="email" className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                Email
              </label>
              <input
                type="email"
                id="email"
                name="email"
                className="w-full px-3 py-2 border border-gray-300 dark:border-zinc-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-zinc-700 dark:text-white"
                placeholder="your@email.com"
                required
              />
            </div>
            <div className="mb-4">
              <label htmlFor="password" className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                Password
              </label>
              <input
                type="password"
                id="password"
                name="password"
                className="w-full px-3 py-2 border border-gray-300 dark:border-zinc-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-zinc-700 dark:text-white"
                placeholder="Password"
                required
              />
            </div>
            <button
              type="submit"
              className="w-full px-4 py-2 bg-green-600 dark:bg-green-700 text-white rounded-md shadow hover:bg-green-700 dark:hover:bg-green-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
            >
              Sign in with Credentials
            </button>
          </form>
        </div>

        {/* Debug Section */}
        <details className="w-full max-w-md p-4 bg-gray-100 dark:bg-zinc-800 rounded-lg">
          <summary className="cursor-pointer text-sm font-medium text-gray-700 dark:text-gray-300">
            🔧 Debug Information (Click to expand)
          </summary>
          <div className="mt-2 text-xs space-y-2 overflow-auto max-h-60">
            <div><strong>Timestamp:</strong> {debugInfo.timestamp}</div>
            <div><strong>User Agent:</strong> {debugInfo.userAgent}</div>
            <div><strong>Location:</strong> {debugInfo.href}</div>
            <div><strong>Origin:</strong> {debugInfo.origin}</div>
            <div><strong>Pathname:</strong> {debugInfo.pathname}</div>
            <div><strong>Local Storage Available:</strong> {String(debugInfo.hasLocalStorage)}</div>
            {debugInfo.localStorageKeys && (
              <div><strong>Local Storage Keys:</strong> {JSON.stringify(debugInfo.localStorageKeys)}</div>
            )}
            <div><strong>Session Storage Available:</strong> {String(debugInfo.hasSessionStorage)}</div>
            {debugInfo.sessionStorageKeys && (
              <div><strong>Session Storage Keys:</strong> {JSON.stringify(debugInfo.sessionStorageKeys)}</div>
            )}
            
            {providers && (
              <div className="mt-2">
                <strong>Available Providers:</strong>
                <ul className="ml-2 mt-1">
                  {Object.entries(providers).map(([id, provider]) => (
                    <li key={id}>
                      <span className="font-mono">{id}</span>: {provider.name} ({provider.type})
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {debugInfo.error && (
              <div className="mt-2 p-2 bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-200">
                <strong>Error:</strong> {debugInfo.error}
              </div>
            )}
          </div>
        </details>
      </div>
    </>
  );
}
