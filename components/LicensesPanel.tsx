"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { getAuthToken } from "@/lib/auth";

interface LicenseKeys {
  // Embedding Models
  openaiEmbedding: string;

  // Parsers
  upstageParser: string;
  llamaParser: string;
  azureParserKey: string;
  azureParserEndpoint: string;
  googleParserServiceAccountEmail: string;
  googleParserPrivateKey: string;
  googleParserProjectId: string;
  googleParserLocation: string;
  googleParserProcessorId: string;

  // Vector Database
  supabaseUrl: string;
  supabaseKey: string;
}

type TestStatus = 'idle' | 'testing' | 'success' | 'error';

interface TestResults {
  openai: { status: TestStatus; message?: string };
  upstage: { status: TestStatus; message?: string };
  llama: { status: TestStatus; message?: string };
  azure: { status: TestStatus; message?: string };
  google: { status: TestStatus; message?: string };
  supabase: { status: TestStatus; message?: string };
}

export default function LicensesPanel() {
  const [keys, setKeys] = useState<LicenseKeys>({
    openaiEmbedding: "",
    upstageParser: "",
    llamaParser: "",
    azureParserKey: "",
    azureParserEndpoint: "",
    googleParserServiceAccountEmail: "",
    googleParserPrivateKey: "",
    googleParserProjectId: "",
    googleParserLocation: "",
    googleParserProcessorId: "",
    supabaseUrl: "",
    supabaseKey: "",
  });

  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<"embedding" | "parser" | "database">("embedding");
  const [testResults, setTestResults] = useState<TestResults>({
    openai: { status: 'idle' },
    upstage: { status: 'idle' },
    llama: { status: 'idle' },
    azure: { status: 'idle' },
    google: { status: 'idle' },
    supabase: { status: 'idle' },
  });

  // Load keys from backend on mount
  useEffect(() => {
    const fetchKeys = async () => {
      try {
        const token = getAuthToken();
        if (!token) {
          console.log('No auth token found');
          return;
        }

        const response = await fetch('/api/keys', {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });
        if (response.ok) {
          const data = await response.json();
          setKeys(prev => ({ ...prev, ...data }));
        } else if (response.status === 401) {
          console.log('User not authenticated');
        }
      } catch (error) {
        console.error('Failed to load API keys:', error);
      }
    };
    fetchKeys();
  }, []);

  const handleChange = (key: keyof LicenseKeys, value: string) => {
    setKeys((prev) => ({
      ...prev,
      [key]: value,
    }));
    setSaved(false);
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      const token = getAuthToken();
      if (!token) {
        alert('Please login first');
        setLoading(false);
        return;
      }

      const response = await fetch('/api/keys', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(keys),
      });

      if (response.ok) {
        setSaved(true);
        setTimeout(() => setSaved(false), 3000);
      } else {
        alert('Failed to save API keys');
      }
    } catch (error) {
      console.error('Failed to save API keys:', error);
      alert('Failed to save API keys');
    } finally {
      setLoading(false);
    }
  };

  const handleReset = async () => {
    if (!confirm('Are you sure you want to reset all API keys?')) {
      return;
    }

    setLoading(true);
    try {
      const token = getAuthToken();
      if (!token) {
        alert('Please login first');
        setLoading(false);
        return;
      }

      // Delete all keys by setting them to empty strings
      const emptyKeys = {
        openaiEmbedding: "",
        upstageParser: "",
        llamaParser: "",
        azureParserKey: "",
        azureParserEndpoint: "",
        googleParserServiceAccountEmail: "",
        googleParserPrivateKey: "",
        googleParserProjectId: "",
        googleParserLocation: "",
        googleParserProcessorId: "",
        supabaseUrl: "",
        supabaseKey: "",
      };

      const response = await fetch('/api/keys', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(emptyKeys),
      });

      if (response.ok) {
        setKeys(emptyKeys);
      } else {
        alert('Failed to reset API keys');
      }
    } catch (error) {
      console.error('Failed to reset API keys:', error);
      alert('Failed to reset API keys');
    } finally {
      setLoading(false);
    }
  };

  const handleTestConnection = async (service: keyof TestResults) => {
    setTestResults(prev => ({
      ...prev,
      [service]: { status: 'testing', message: undefined },
    }));

    try {
      const token = getAuthToken();
      if (!token) {
        setTestResults(prev => ({
          ...prev,
          [service]: { status: 'error', message: 'Please login first' },
        }));
        return;
      }

      const response = await fetch('/api/test-connection', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ service }),
      });

      const data = await response.json();

      if (data.success) {
        setTestResults(prev => ({
          ...prev,
          [service]: { status: 'success', message: data.message },
        }));
        setTimeout(() => {
          setTestResults(prev => ({
            ...prev,
            [service]: { status: 'idle' },
          }));
        }, 5000);
      } else {
        setTestResults(prev => ({
          ...prev,
          [service]: { status: 'error', message: data.error },
        }));
      }
    } catch (error) {
      setTestResults(prev => ({
        ...prev,
        [service]: { status: 'error', message: error instanceof Error ? error.message : 'Connection test failed' },
      }));
    }
  };

  return (
    <div className="h-full flex flex-col">
      <div className="flex-1 overflow-y-auto">
        {/* Header */}
        <div className="py-8 px-6 bg-surface sticky top-0 z-10">
          <div className="max-w-5xl mx-auto">
            <div className="mb-6">
              <h2 className="text-2xl font-semibold text-card-foreground mb-2">
                Connect
              </h2>
              <p className="text-sm text-muted-foreground">
                Configure API keys and credentials for embedding models, document parsers, and databases
              </p>
            </div>

            {/* Tabs and Buttons */}
            <div className="flex items-center justify-between">
              <div className="inline-flex gap-1 bg-muted rounded-lg p-1">
              <button
                onClick={() => setActiveTab("embedding")}
                className={`px-3 py-1 text-xs font-medium rounded transition-smooth whitespace-nowrap ${
                  activeTab === "embedding"
                    ? "bg-card text-card-foreground shadow-sm"
                    : "text-muted-foreground hover:text-surface-foreground"
                }`}
              >
                Embedding Model
              </button>
              <button
                onClick={() => setActiveTab("parser")}
                className={`px-3 py-1 text-xs font-medium rounded transition-smooth whitespace-nowrap ${
                  activeTab === "parser"
                    ? "bg-card text-card-foreground shadow-sm"
                    : "text-muted-foreground hover:text-surface-foreground"
                }`}
              >
                Document Parsers
              </button>
              <button
                onClick={() => setActiveTab("database")}
                className={`px-3 py-1 text-xs font-medium rounded transition-smooth whitespace-nowrap ${
                  activeTab === "database"
                    ? "bg-card text-card-foreground shadow-sm"
                    : "text-muted-foreground hover:text-surface-foreground"
                }`}
              >
                Vector Database
              </button>
              </div>

              <div className="flex items-center gap-8">
                {saved && (
                  <span className="text-sm text-green-600 dark:text-green-400 flex items-center gap-1">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    Saved
                  </span>
                )}
                <button
                  onClick={handleReset}
                  disabled={loading}
                  className="text-sm text-muted-foreground hover:text-card-foreground transition-smooth flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  Reset
                </button>
                <button
                  onClick={handleSave}
                  disabled={loading}
                  className="text-sm text-accent hover:text-accent/80 font-medium transition-smooth flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? (
                    <>
                      <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Saving...
                    </>
                  ) : (
                    <>
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
                      </svg>
                      Save
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Content Area */}
        <div className="px-6 pb-6">
          <div className="max-w-5xl mx-auto">
            {/* Embedding Model Section */}
            {activeTab === "embedding" && (
            <div>

              {/* OpenAI Card */}
              <div className="py-6">
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-lg bg-white flex items-center justify-center flex-shrink-0 p-1">
                    <Image
                      src="/logos/openai.webp"
                      alt="OpenAI"
                      width={40}
                      height={40}
                      className="object-contain"
                    />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-1">
                      <h4 className="text-base font-medium text-card-foreground">OpenAI</h4>
                      <button
                        onClick={() => handleTestConnection('openai')}
                        disabled={testResults.openai.status === 'testing' || !keys.openaiEmbedding}
                        className="text-xs text-accent hover:text-accent/80 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
                      >
                        {testResults.openai.status === 'testing' ? (
                          <>
                            <svg className="w-3 h-3 animate-spin" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                            Testing...
                          </>
                        ) : (
                          <>
                            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                            </svg>
                            Test
                          </>
                        )}
                      </button>
                    </div>
                    <p className="text-xs text-muted-foreground mb-4">
                      Used for text embeddings with text-embedding-ada-002 model
                    </p>
                    <div>
                      <label className="block text-xs font-medium text-muted-foreground mb-2">
                        API Key
                      </label>
                      <input
                        type="password"
                        value={keys.openaiEmbedding}
                        onChange={(e) => handleChange("openaiEmbedding", e.target.value)}
                        placeholder="sk-..."
                        className="w-full h-10 px-3 border border-border rounded-lg
                                 focus:outline-none focus:ring-2 focus:ring-accent
                                 bg-surface text-card-foreground text-sm
                                 placeholder-light"
                      />
                    </div>
                    {testResults.openai.status !== 'idle' && testResults.openai.status !== 'testing' && (
                      <div className={`mt-2 text-xs flex items-center gap-1 ${
                        testResults.openai.status === 'success' ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
                      }`}>
                        {testResults.openai.status === 'success' ? (
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                        ) : (
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        )}
                        {testResults.openai.message}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
            )}

            {/* Document Parsers Section */}
            {activeTab === "parser" && (
            <div>
                {/* Upstage Parser Card */}
                <div className="py-6">
                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 rounded-lg bg-white flex items-center justify-center flex-shrink-0 p-1">
                      <Image
                        src="/logos/upstage.webp"
                        alt="Upstage"
                        width={40}
                        height={40}
                        className="object-contain"
                      />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-1">
                        <h4 className="text-base font-medium text-card-foreground">Upstage Document AI</h4>
                        <button
                          onClick={() => handleTestConnection('upstage')}
                          disabled={testResults.upstage.status === 'testing' || !keys.upstageParser}
                          className="text-xs text-accent hover:text-accent/80 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
                        >
                          {testResults.upstage.status === 'testing' ? (
                            <>
                              <svg className="w-3 h-3 animate-spin" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                              </svg>
                              Testing...
                            </>
                          ) : (
                            <>
                              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                              </svg>
                              Test
                            </>
                          )}
                        </button>
                      </div>
                      <p className="text-xs text-muted-foreground mb-4">
                        Parse PDF and image files with Upstage Document AI
                      </p>
                      <div>
                        <label className="block text-xs font-medium text-muted-foreground mb-2">
                          API Key
                        </label>
                        <input
                          type="password"
                          value={keys.upstageParser}
                          onChange={(e) => handleChange("upstageParser", e.target.value)}
                          placeholder="up_..."
                          className="w-full h-10 px-3 border border-border rounded-lg
                                   focus:outline-none focus:ring-2 focus:ring-accent
                                   bg-surface text-card-foreground text-sm
                                   placeholder-light"
                        />
                      </div>
                      {testResults.upstage.status !== 'idle' && testResults.upstage.status !== 'testing' && (
                        <div className={`mt-2 text-xs flex items-center gap-1 ${
                          testResults.upstage.status === 'success' ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
                        }`}>
                          {testResults.upstage.status === 'success' ? (
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                          ) : (
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          )}
                          {testResults.upstage.message}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* LlamaIndex Parser Card */}
                <div className="py-6">
                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 rounded-lg bg-white flex items-center justify-center flex-shrink-0 p-1">
                      <Image
                        src="/logos/llamaindex.webp"
                        alt="LlamaIndex"
                        width={40}
                        height={40}
                        className="object-contain"
                      />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-1">
                        <h4 className="text-base font-medium text-card-foreground">LlamaIndex (LlamaParse)</h4>
                        <button
                          onClick={() => handleTestConnection('llama')}
                          disabled={testResults.llama.status === 'testing' || !keys.llamaParser}
                          className="text-xs text-accent hover:text-accent/80 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
                        >
                          {testResults.llama.status === 'testing' ? (
                            <>
                              <svg className="w-3 h-3 animate-spin" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                              </svg>
                              Testing...
                            </>
                          ) : (
                            <>
                              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                              </svg>
                              Test
                            </>
                          )}
                        </button>
                      </div>
                      <p className="text-xs text-muted-foreground mb-4">
                        Parse PDF, DOCX, PPTX and image files with LlamaParse
                      </p>
                      <div>
                        <label className="block text-xs font-medium text-muted-foreground mb-2">
                          API Key
                        </label>
                        <input
                          type="password"
                          value={keys.llamaParser}
                          onChange={(e) => handleChange("llamaParser", e.target.value)}
                          placeholder="llx-..."
                          className="w-full h-10 px-3 border border-border rounded-lg
                                   focus:outline-none focus:ring-2 focus:ring-accent
                                   bg-surface text-card-foreground text-sm
                                   placeholder-light"
                        />
                      </div>
                      {testResults.llama.status !== 'idle' && testResults.llama.status !== 'testing' && (
                        <div className={`mt-2 text-xs flex items-center gap-1 ${
                          testResults.llama.status === 'success' ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
                        }`}>
                          {testResults.llama.status === 'success' ? (
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                          ) : (
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          )}
                          {testResults.llama.message}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Azure Parser Card */}
                <div className="py-6">
                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 rounded-lg bg-white flex items-center justify-center flex-shrink-0 p-1">
                      <Image
                        src="/logos/azure.webp"
                        alt="Azure"
                        width={40}
                        height={40}
                        className="object-contain"
                      />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-1">
                        <h4 className="text-base font-medium text-card-foreground">Azure Document Intelligence</h4>
                        <button
                          onClick={() => handleTestConnection('azure')}
                          disabled={testResults.azure.status === 'testing' || !keys.azureParserKey || !keys.azureParserEndpoint}
                          className="text-xs text-accent hover:text-accent/80 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
                        >
                          {testResults.azure.status === 'testing' ? (
                            <>
                              <svg className="w-3 h-3 animate-spin" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                              </svg>
                              Testing...
                            </>
                          ) : (
                            <>
                              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                              </svg>
                              Test
                            </>
                          )}
                        </button>
                      </div>
                      <p className="text-xs text-muted-foreground mb-4">
                        Parse documents with Azure Cognitive Services
                      </p>
                      <div className="space-y-4">
                        <div>
                          <label className="block text-xs font-medium text-muted-foreground mb-2">
                            API Key
                          </label>
                          <input
                            type="password"
                            value={keys.azureParserKey}
                            onChange={(e) => handleChange("azureParserKey", e.target.value)}
                            placeholder="Enter your Azure API key"
                            className="w-full h-10 px-3 border border-border rounded-lg
                                     focus:outline-none focus:ring-2 focus:ring-accent
                                     bg-surface text-card-foreground text-sm
                                     placeholder-light"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-muted-foreground mb-2">
                            Endpoint URL
                          </label>
                          <input
                            type="text"
                            value={keys.azureParserEndpoint}
                            onChange={(e) => handleChange("azureParserEndpoint", e.target.value)}
                            placeholder="https://YOUR-RESOURCE.cognitiveservices.azure.com"
                            className="w-full h-10 px-3 border border-border rounded-lg
                                     focus:outline-none focus:ring-2 focus:ring-accent
                                     bg-surface text-card-foreground text-sm
                                     placeholder-light"
                          />
                        </div>
                      </div>
                      {testResults.azure.status !== 'idle' && testResults.azure.status !== 'testing' && (
                        <div className={`mt-2 text-xs flex items-center gap-1 ${
                          testResults.azure.status === 'success' ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
                        }`}>
                          {testResults.azure.status === 'success' ? (
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                          ) : (
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          )}
                          {testResults.azure.message}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Google Parser Card */}
                <div className="py-6">
                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 rounded-lg bg-white flex items-center justify-center flex-shrink-0 p-1">
                      <Image
                        src="/logos/google-cloud.webp"
                        alt="Google Cloud"
                        width={40}
                        height={40}
                        className="object-contain"
                      />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-1">
                        <h4 className="text-base font-medium text-card-foreground">Google Document AI</h4>
                        <button
                          onClick={() => handleTestConnection('google')}
                          disabled={testResults.google.status === 'testing' || !keys.googleParserServiceAccountEmail || !keys.googleParserPrivateKey || !keys.googleParserProjectId || !keys.googleParserLocation || !keys.googleParserProcessorId}
                          className="text-xs text-accent hover:text-accent/80 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
                        >
                          {testResults.google.status === 'testing' ? (
                            <>
                              <svg className="w-3 h-3 animate-spin" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                              </svg>
                              Testing...
                            </>
                          ) : (
                            <>
                              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                              </svg>
                              Test
                            </>
                          )}
                        </button>
                      </div>
                      <p className="text-xs text-muted-foreground mb-4">
                        Parse documents with Google Cloud Document AI
                      </p>
                      <div className="space-y-4">
                        <div>
                          <label className="block text-xs font-medium text-muted-foreground mb-2">
                            Service Account Email <span className="text-red-500">*</span>
                          </label>
                          <input
                            type="password"
                            value={keys.googleParserServiceAccountEmail}
                            onChange={(e) => handleChange("googleParserServiceAccountEmail", e.target.value)}
                            placeholder="your-service-account@project.iam.gserviceaccount.com"
                            className="w-full h-10 px-3 border border-border rounded-lg
                                     focus:outline-none focus:ring-2 focus:ring-accent
                                     bg-surface text-card-foreground text-sm
                                     placeholder-light"
                          />
                          <p className="text-xs text-muted-foreground mt-1">
                            From JSON key file: <code className="text-accent">client_email</code> field
                          </p>
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-muted-foreground mb-2">
                            Private Key <span className="text-red-500">*</span>
                          </label>
                          <textarea
                            value={keys.googleParserPrivateKey}
                            onChange={(e) => {
                              // Auto-format: replace literal \n with actual newlines
                              const formatted = e.target.value.replace(/\\n/g, '\n');
                              handleChange("googleParserPrivateKey", formatted);
                            }}
                            placeholder="-----BEGIN PRIVATE KEY-----&#10;MIIEvgIBADANBgkqhkiG9w0BAQEF...&#10;-----END PRIVATE KEY-----"
                            rows={6}
                            style={{ WebkitTextSecurity: 'disc' } as React.CSSProperties}
                            className="w-full px-3 py-2 border border-border rounded-lg
                                     focus:outline-none focus:ring-2 focus:ring-accent
                                     bg-surface text-card-foreground text-sm
                                     placeholder-light font-mono resize-none"
                          />
                          <p className="text-xs text-muted-foreground mt-1">
                            Paste the entire <code className="text-accent">private_key</code> value from JSON file (literal <code>\n</code> will be auto-converted to line breaks)
                          </p>
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-muted-foreground mb-2">
                            Project ID <span className="text-red-500">*</span>
                          </label>
                          <input
                            type="password"
                            value={keys.googleParserProjectId}
                            onChange={(e) => handleChange("googleParserProjectId", e.target.value)}
                            placeholder="your-project-id or 123456789"
                            className="w-full h-10 px-3 border border-border rounded-lg
                                     focus:outline-none focus:ring-2 focus:ring-accent
                                     bg-surface text-card-foreground text-sm
                                     placeholder-light"
                          />
                          <p className="text-xs text-muted-foreground mt-1">
                            From JSON key file: <code className="text-accent">project_id</code> field, or from processor URL
                          </p>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-xs font-medium text-muted-foreground mb-2">
                              Location <span className="text-red-500">*</span>
                            </label>
                            <input
                              type="password"
                              value={keys.googleParserLocation}
                              onChange={(e) => handleChange("googleParserLocation", e.target.value)}
                              placeholder="us, eu, or us-central1"
                              className="w-full h-10 px-3 border border-border rounded-lg
                                       focus:outline-none focus:ring-2 focus:ring-accent
                                       bg-surface text-card-foreground text-sm
                                       placeholder-light"
                            />
                            <p className="text-xs text-muted-foreground mt-1">
                              From processor URL: <code className="text-accent">/locations/[location]/</code>
                            </p>
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-muted-foreground mb-2">
                              Processor ID <span className="text-red-500">*</span>
                            </label>
                            <input
                              type="password"
                              value={keys.googleParserProcessorId}
                              onChange={(e) => handleChange("googleParserProcessorId", e.target.value)}
                              placeholder="9f9bd205a57448a5"
                              className="w-full h-10 px-3 border border-border rounded-lg
                                       focus:outline-none focus:ring-2 focus:ring-accent
                                       bg-surface text-card-foreground text-sm
                                       placeholder-light"
                            />
                            <p className="text-xs text-muted-foreground mt-1">
                              From processor URL: <code className="text-accent">/processors/[processor-id]:</code>
                            </p>
                          </div>
                        </div>
                      </div>
                      {testResults.google.status !== 'idle' && testResults.google.status !== 'testing' && (
                        <div className={`mt-2 text-xs flex items-center gap-1 ${
                          testResults.google.status === 'success' ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
                        }`}>
                          {testResults.google.status === 'success' ? (
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                          ) : (
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          )}
                          {testResults.google.message}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Vector Database Section */}
            {activeTab === "database" && (
            <div>
              {/* Supabase Card */}
              <div className="py-6">
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-lg bg-white flex items-center justify-center flex-shrink-0 p-1">
                    <Image
                      src="/logos/supabase.png"
                      alt="Supabase"
                      width={40}
                      height={40}
                      className="object-contain"
                    />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-1">
                      <h4 className="text-base font-medium text-card-foreground">Supabase</h4>
                      <button
                        onClick={() => handleTestConnection('supabase')}
                        disabled={testResults.supabase.status === 'testing' || !keys.supabaseUrl || !keys.supabaseKey}
                        className="text-xs text-accent hover:text-accent/80 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
                      >
                        {testResults.supabase.status === 'testing' ? (
                          <>
                            <svg className="w-3 h-3 animate-spin" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                            Testing...
                          </>
                        ) : (
                          <>
                            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                            </svg>
                            Test
                          </>
                        )}
                      </button>
                    </div>
                    <p className="text-xs text-muted-foreground mb-4">
                      Vector database for storing and querying embeddings with pgvector
                    </p>
                    <div className="space-y-4">
                      <div>
                        <label className="block text-xs font-medium text-muted-foreground mb-2">
                          Project URL
                        </label>
                        <input
                          type="text"
                          value={keys.supabaseUrl}
                          onChange={(e) => handleChange("supabaseUrl", e.target.value)}
                          placeholder="https://xxxxx.supabase.co"
                          className="w-full h-10 px-3 border border-border rounded-lg
                                   focus:outline-none focus:ring-2 focus:ring-accent
                                   bg-surface text-card-foreground text-sm
                                   placeholder-light"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-muted-foreground mb-2">
                          API Key (anon/public)
                        </label>
                        <input
                          type="password"
                          value={keys.supabaseKey}
                          onChange={(e) => handleChange("supabaseKey", e.target.value)}
                          placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                          className="w-full h-10 px-3 border border-border rounded-lg
                                   focus:outline-none focus:ring-2 focus:ring-accent
                                   bg-surface text-card-foreground text-sm
                                   placeholder-light"
                        />
                        <p className="text-xs text-muted-foreground mt-2">
                          Find your project URL and anon key in your Supabase project settings
                        </p>
                      </div>
                    </div>
                    {testResults.supabase.status !== 'idle' && testResults.supabase.status !== 'testing' && (
                      <div className={`mt-2 text-xs flex items-center gap-1 ${
                        testResults.supabase.status === 'success' ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
                      }`}>
                        {testResults.supabase.status === 'success' ? (
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                        ) : (
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        )}
                        {testResults.supabase.message}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
