import React, { useState, useEffect } from 'react';
import { projectId, publicAnonKey } from '@/utils/supabase/info';

export default function ConnectivityTestPage() {
  const [healthStatus, setHealthStatus] = useState<'loading' | 'ok' | 'error'>('loading');
  const [healthData, setHealthData] = useState<any>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const functionName = 'make-server-d7930c7f'; // Based on your code matches
  const functionUrl = `https://${projectId}.supabase.co/functions/v1/${functionName}/health`;

  const runTest = async () => {
    setHealthStatus('loading');
    setErrorMessage(null);
    setHealthData(null);
    
    try {
      console.log(`Testing connection to: ${functionUrl}`);
      const response = await fetch(functionUrl, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${publicAnonKey}`,
          'Content-Type': 'application/json'
        }
      });
      
      console.log(`Response status: ${response.status}`);
      
      if (!response.ok) {
        throw new Error(`Server responded with status: ${response.status} ${response.statusText}`);
      }
      
      const data = await response.json();
      console.log('Response data:', data);
      
      setHealthData(data);
      setHealthStatus('ok');
    } catch (error) {
      console.error('Connection test failed:', error);
      setHealthStatus('error');
      setErrorMessage(String(error));
    }
  };

  useEffect(() => {
    runTest();
  }, []);

  return (
    <div className="p-8 max-w-2xl mx-auto bg-white rounded-lg shadow-md mt-10">
      <h1 className="text-2xl font-bold mb-4">Server Connectivity Diagnostic</h1>
      
      <div className="mb-6 p-4 bg-gray-50 rounded border border-gray-200">
        <h2 className="text-lg font-semibold mb-2">Configuration</h2>
        <div className="space-y-2 text-sm text-gray-700">
          <div className="flex justify-between">
            <span className="font-medium">Project ID:</span>
            <span className="font-mono">{projectId}</span>
          </div>
          <div className="flex justify-between">
            <span className="font-medium">Function Name:</span>
            <span className="font-mono">{functionName}</span>
          </div>
          <div className="flex justify-between">
            <span className="font-medium">Target URL:</span>
            <span className="font-mono break-all">{functionUrl}</span>
          </div>
        </div>
      </div>

      <div className="mb-6">
        <h2 className="text-lg font-semibold mb-2">Test Result</h2>
        
        {healthStatus === 'loading' && (
          <div className="p-4 bg-blue-50 text-blue-800 rounded flex items-center">
            <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-blue-800" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            Testing connection...
          </div>
        )}
        
        {healthStatus === 'ok' && (
          <div className="p-4 bg-green-50 text-green-800 rounded border border-green-200">
            <div className="flex items-center mb-2">
              <svg className="w-6 h-6 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path></svg>
              <span className="font-bold">Connection Successful!</span>
            </div>
            <pre className="text-xs bg-white p-2 rounded border border-green-100 mt-2 overflow-auto">
              {JSON.stringify(healthData, null, 2)}
            </pre>
            <p className="mt-2 text-sm">
              Your frontend can successfully communicate with the deployed backend function.
            </p>
          </div>
        )}
        
        {healthStatus === 'error' && (
          <div className="p-4 bg-red-50 text-red-800 rounded border border-red-200">
            <div className="flex items-center mb-2">
              <svg className="w-6 h-6 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
              <span className="font-bold">Connection Failed</span>
            </div>
            <p className="text-sm font-mono mb-2">{errorMessage}</p>
            <div className="text-sm mt-3 space-y-2">
              <p className="font-semibold">Possible causes:</p>
              <ul className="list-disc list-inside pl-2">
                <li>The deployment failed or hasn't finished yet.</li>
                <li>The <strong>SUPABASE_SERVICE_ROLE_KEY</strong> secret is missing.</li>
                <li>The function name in the URL doesn't match the deployed function.</li>
                <li>CORS issues (check browser console).</li>
              </ul>
            </div>
          </div>
        )}
      </div>

      <button
        onClick={runTest}
        className="w-full py-2 px-4 bg-gray-800 hover:bg-gray-700 text-white rounded transition-colors"
      >
        Run Test Again
      </button>
    </div>
  );
}