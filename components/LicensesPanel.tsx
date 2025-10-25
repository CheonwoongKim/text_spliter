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
  googleParserKey: string;
  googleParserProjectId: string;
  googleParserLocation: string;
  googleParserProcessorId: string;

  // Vector Database
  supabaseUrl: string;
  supabaseKey: string;
}

export default function LicensesPanel() {
  const [keys, setKeys] = useState<LicenseKeys>({
    openaiEmbedding: "",
    upstageParser: "",
    llamaParser: "",
    azureParserKey: "",
    azureParserEndpoint: "",
    googleParserKey: "",
    googleParserProjectId: "",
    googleParserLocation: "",
    googleParserProcessorId: "",
    supabaseUrl: "",
    supabaseKey: "",
  });

  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<"embedding" | "parser" | "database">("embedding");

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
        googleParserKey: "",
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
                    <h4 className="text-base font-medium text-card-foreground mb-1">OpenAI</h4>
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
                      <h4 className="text-base font-medium text-card-foreground mb-1">Upstage Document AI</h4>
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
                      <h4 className="text-base font-medium text-card-foreground mb-1">LlamaIndex (LlamaParse)</h4>
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
                      <h4 className="text-base font-medium text-card-foreground mb-1">Azure Document Intelligence</h4>
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
                      <h4 className="text-base font-medium text-card-foreground mb-1">Google Document AI</h4>
                      <p className="text-xs text-muted-foreground mb-4">
                        Parse documents with Google Cloud Document AI
                      </p>
                      <div className="space-y-4">
                        <div>
                          <label className="block text-xs font-medium text-muted-foreground mb-2">
                            API Key
                          </label>
                          <input
                            type="password"
                            value={keys.googleParserKey}
                            onChange={(e) => handleChange("googleParserKey", e.target.value)}
                            placeholder="Enter your Google API key"
                            className="w-full h-10 px-3 border border-border rounded-lg
                                     focus:outline-none focus:ring-2 focus:ring-accent
                                     bg-surface text-card-foreground text-sm
                                     placeholder-light"
                          />
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <div>
                            <label className="block text-xs font-medium text-muted-foreground mb-2">
                              Project ID
                            </label>
                            <input
                              type="text"
                              value={keys.googleParserProjectId}
                              onChange={(e) => handleChange("googleParserProjectId", e.target.value)}
                              placeholder="your-project-id"
                              className="w-full h-10 px-3 border border-border rounded-lg
                                       focus:outline-none focus:ring-2 focus:ring-accent
                                       bg-surface text-card-foreground text-sm
                                       placeholder-light"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-muted-foreground mb-2">
                              Location
                            </label>
                            <input
                              type="text"
                              value={keys.googleParserLocation}
                              onChange={(e) => handleChange("googleParserLocation", e.target.value)}
                              placeholder="us or eu"
                              className="w-full h-10 px-3 border border-border rounded-lg
                                       focus:outline-none focus:ring-2 focus:ring-accent
                                       bg-surface text-card-foreground text-sm
                                       placeholder-light"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-muted-foreground mb-2">
                              Processor ID
                            </label>
                            <input
                              type="text"
                              value={keys.googleParserProcessorId}
                              onChange={(e) => handleChange("googleParserProcessorId", e.target.value)}
                              placeholder="processor-id"
                              className="w-full h-10 px-3 border border-border rounded-lg
                                       focus:outline-none focus:ring-2 focus:ring-accent
                                       bg-surface text-card-foreground text-sm
                                       placeholder-light"
                            />
                          </div>
                        </div>
                      </div>
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
                    <h4 className="text-base font-medium text-card-foreground mb-1">Supabase</h4>
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
