"use client";

import { useState, useEffect } from "react";
import { Input } from "@/components/shared/FormFields";
import { Button } from "@/components/shared/Button";
import Image from "next/image";
import { CheckCircle, CircleAlert, LoaderCircle } from "lucide-react";
import { getAuthToken } from "@/lib/auth";

interface LicenseKeys {
  // OpenAI (kept as openaiEmbedding for stored-key backward compatibility)
  openaiEmbedding: string;
  geminiVision: string;
  anthropicVision: string;
  qwenVision: string;
  qwenVisionEndpoint: string;
  nativeDocumentRendererEndpoint: string;
  nativeDocumentRendererApiKey: string;

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
  doclingEndpoint: string;
  doclingApiKey: string;
}

type TestStatus = 'idle' | 'testing' | 'success' | 'error';

interface TestResults {
  openai: { status: TestStatus; message?: string };
  gemini: { status: TestStatus; message?: string };
  anthropic: { status: TestStatus; message?: string };
  qwen: { status: TestStatus; message?: string };
  renderer: { status: TestStatus; message?: string };
  upstage: { status: TestStatus; message?: string };
  llama: { status: TestStatus; message?: string };
  azure: { status: TestStatus; message?: string };
  google: { status: TestStatus; message?: string };
  docling: { status: TestStatus; message?: string };
}

const EMPTY_LICENSE_KEYS: LicenseKeys = {
  openaiEmbedding: "",
  geminiVision: "",
  anthropicVision: "",
  qwenVision: "",
  qwenVisionEndpoint: "",
  nativeDocumentRendererEndpoint: "",
  nativeDocumentRendererApiKey: "",
  upstageParser: "",
  llamaParser: "",
  azureParserKey: "",
  azureParserEndpoint: "",
  googleParserServiceAccountEmail: "",
  googleParserPrivateKey: "",
  googleParserProjectId: "",
  googleParserLocation: "",
  googleParserProcessorId: "",
  doclingEndpoint: "",
  doclingApiKey: "",
};

const INITIAL_TEST_RESULTS: TestResults = {
  openai: { status: "idle" },
  gemini: { status: "idle" },
  anthropic: { status: "idle" },
  qwen: { status: "idle" },
  renderer: { status: "idle" },
  upstage: { status: "idle" },
  llama: { status: "idle" },
  azure: { status: "idle" },
  google: { status: "idle" },
  docling: { status: "idle" },
};

function credentialsForService(
  service: keyof TestResults,
  keys: LicenseKeys
): Partial<LicenseKeys> {
  switch (service) {
    case 'openai':
      return { openaiEmbedding: keys.openaiEmbedding };
    case 'gemini':
      return { geminiVision: keys.geminiVision };
    case 'anthropic':
      return { anthropicVision: keys.anthropicVision };
    case 'qwen':
      return {
        qwenVision: keys.qwenVision,
        qwenVisionEndpoint: keys.qwenVisionEndpoint,
      };
    case 'renderer':
      return {
        nativeDocumentRendererEndpoint: keys.nativeDocumentRendererEndpoint,
        nativeDocumentRendererApiKey: keys.nativeDocumentRendererApiKey,
      };
    case 'upstage':
      return { upstageParser: keys.upstageParser };
    case 'llama':
      return { llamaParser: keys.llamaParser };
    case 'azure':
      return {
        azureParserKey: keys.azureParserKey,
        azureParserEndpoint: keys.azureParserEndpoint,
      };
    case 'google':
      return {
        googleParserServiceAccountEmail: keys.googleParserServiceAccountEmail,
        googleParserPrivateKey: keys.googleParserPrivateKey,
        googleParserProjectId: keys.googleParserProjectId,
        googleParserLocation: keys.googleParserLocation,
        googleParserProcessorId: keys.googleParserProcessorId,
      };
    case 'docling':
      return {
        doclingEndpoint: keys.doclingEndpoint,
        doclingApiKey: keys.doclingApiKey,
      };
  }
}

interface LicensesPanelProps {
  embedded?: boolean;
}

interface CredentialCardProps {
  title: string;
  description: string;
  logo?: { src: string; alt: string };
  fields: Array<{
    key: keyof LicenseKeys;
    label: string;
    placeholder: string;
    type?: "text" | "password";
  }>;
  result: { status: TestStatus; message?: string };
  values: LicenseKeys;
  onChange: (key: keyof LicenseKeys, value: string) => void;
  onTest: () => void;
  testDisabled: boolean;
}

function CredentialCard({
  title,
  description,
  logo,
  fields,
  result,
  values,
  onChange,
  onTest,
  testDisabled,
}: CredentialCardProps) {
  return (
    <div className="border-b border-border py-6 last:border-b-0">
      <div className="flex items-start gap-4">
        <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${logo ? "bg-brand p-1" : "bg-muted"}`}>
          {logo ? (
            <Image
              src={logo.src}
              alt={logo.alt}
              width={40}
              height={40}
              className="object-contain"
            />
          ) : (
            <span className="text-xs font-semibold text-card-foreground">
              {title.slice(0, 1)}
            </span>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <div className="mb-1 flex items-center justify-between gap-4">
            <h3 className="text-xs font-medium text-card-foreground">{title}</h3>
            <button
              type="button"
              onClick={onTest}
              disabled={testDisabled || result.status === "testing"}
              className="flex items-center gap-1 text-xs font-medium text-card-foreground transition-smooth hover:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-disabled"
            >
              {result.status === "testing" && (
                <LoaderCircle className="h-3 w-3 animate-spin" strokeWidth={1.5} aria-hidden="true" />
              )}
              {result.status === "testing" ? "Testing..." : "Test"}
            </button>
          </div>
          <p className="mb-4 text-xs text-muted-foreground">{description}</p>
          <div className="space-y-4">
            {fields.map((field) => (
              <label key={field.key} className="block">
                <span className="mb-2 block text-xs font-medium text-muted-foreground">
                  {field.label}
                </span>
                <input
                  type={field.type || "password"}
                  value={values[field.key]}
                  onChange={(event) => onChange(field.key, event.target.value)}
                  placeholder={field.placeholder}
                  className="h-10 w-full rounded-lg border border-control bg-surface px-3 text-xs text-card-foreground placeholder-light focus-ring"
                />
              </label>
            ))}
          </div>
          {result.status !== "idle" && result.status !== "testing" && (
            <p className={`mt-3 flex items-center gap-1 text-xs ${result.status === "success" ? "text-success" : "text-danger"}`}>
              {result.status === "success" ? (
                <CheckCircle className="h-4 w-4" strokeWidth={1.5} aria-hidden="true" />
              ) : (
                <CircleAlert className="h-4 w-4" strokeWidth={1.5} aria-hidden="true" />
              )}
              <span>{result.message}</span>
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

export default function LicensesPanel({ embedded = false }: LicensesPanelProps) {
  const [keys, setKeys] = useState<LicenseKeys>(EMPTY_LICENSE_KEYS);

  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(false);
  const [dirtyKeys, setDirtyKeys] = useState<Set<keyof LicenseKeys>>(new Set());
  const [activeTab, setActiveTab] = useState<"embedding" | "vision" | "parser" | "database">("embedding");
  const [testResults, setTestResults] = useState<TestResults>(INITIAL_TEST_RESULTS);

  // Load keys from backend on mount
  useEffect(() => {
    const fetchKeys = async () => {
      try {
        const token = getAuthToken();
        if (!token) return;

        const response = await fetch('/api/keys', {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });
        if (response.ok) {
          const data = await response.json();
          setKeys(prev => ({ ...prev, ...data }));
          setDirtyKeys(new Set());
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
    setDirtyKeys((current) => new Set(current).add(key));
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

      if (dirtyKeys.size === 0) {
        setSaved(true);
        setTimeout(() => setSaved(false), 3000);
        return;
      }

      const payload = Object.fromEntries(
        Array.from(dirtyKeys).map((keyName) => [keyName, keys[keyName]])
      );

      const response = await fetch('/api/keys', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        setDirtyKeys(new Set());
        setSaved(true);
        setTimeout(() => setSaved(false), 3000);
      } else {
        const errorData = await response.json().catch(() => ({}));
        alert(errorData.details || errorData.error || 'Failed to save API keys');
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

      const response = await fetch('/api/keys?all=true', {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` },
      });

      if (response.ok) {
        setKeys(EMPTY_LICENSE_KEYS);
        setDirtyKeys(new Set());
        setTestResults(INITIAL_TEST_RESULTS);
        setSaved(true);
        setTimeout(() => setSaved(false), 3000);
      } else {
        const errorData = await response.json().catch(() => ({}));
        alert(errorData.details || errorData.error || 'Failed to reset API keys');
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
        body: JSON.stringify({
          service,
          credentials: credentialsForService(service, keys),
        }),
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
        <div className={`${embedded ? "py-4" : "py-8"} px-6 bg-surface sticky top-0 z-navigation`}>
          <div className="max-w-5xl mx-auto">
            {!embedded && (
              <div className="mb-6">
                <h2 className="text-lg font-semibold text-card-foreground mb-2">
                  연결
                </h2>
                <p className="text-xs text-muted-foreground">
                  Configure API keys and credentials for AI models, document parsers, and databases
                </p>
              </div>
            )}

            {/* Tabs and Buttons */}
            <div className="flex items-center justify-between">
              <div className="inline-flex gap-1 bg-muted rounded-lg p-1">
              <button
                onClick={() => setActiveTab("embedding")}
                className={`px-3 py-1 text-xs font-medium rounded-sm transition-smooth whitespace-nowrap ${
                  activeTab === "embedding"
                    ? "bg-card text-card-foreground shadow-sm"
                    : "text-muted-foreground hover:text-surface-foreground"
                }`}
              >
                AI Models
              </button>
              <button
                onClick={() => setActiveTab("vision")}
                className={`px-3 py-1 text-xs font-medium rounded-sm transition-smooth whitespace-nowrap ${
                  activeTab === "vision"
                    ? "bg-card text-card-foreground shadow-sm"
                    : "text-muted-foreground hover:text-surface-foreground"
                }`}
              >
                Vision Models
              </button>
              <button
                onClick={() => setActiveTab("parser")}
                className={`px-3 py-1 text-xs font-medium rounded-sm transition-smooth whitespace-nowrap ${
                  activeTab === "parser"
                    ? "bg-card text-card-foreground shadow-sm"
                    : "text-muted-foreground hover:text-surface-foreground"
                }`}
              >
                Document Parsers
              </button>
              <button
                onClick={() => setActiveTab("database")}
                className={`px-3 py-1 text-xs font-medium rounded-sm transition-smooth whitespace-nowrap ${
                  activeTab === "database"
                    ? "bg-card text-card-foreground shadow-sm"
                    : "text-muted-foreground hover:text-surface-foreground"
                }`}
              >
                Vector Database
              </button>
              </div>

              <div className="flex items-center gap-3">
                {saved && (
                  <span className="text-xs text-success flex items-center gap-1">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    저장됨
                  </span>
                )}
                <button
                  onClick={handleReset}
                  disabled={loading}
                  className="text-xs text-muted-foreground hover:text-card-foreground transition-smooth flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  초기화
                </button>
                <Button variant="primary" size="md" onClick={handleSave} disabled={loading}>
                  {loading ? (
                    <>
                      <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      저장 중...
                    </>
                  ) : (
                    <>
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
                      </svg>
                      저장
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Content Area */}
        <div className="px-6 pb-6">
          <div className="max-w-5xl mx-auto">
            {/* AI Model Section */}
            {activeTab === "embedding" && (
              <CredentialCard
                title="OpenAI"
                description="Used for text-embedding-3-small embeddings and grounded RAG answers"
                logo={{ src: "/logos/openai.webp", alt: "OpenAI" }}
                fields={[{ key: "openaiEmbedding", label: "API Key", placeholder: "sk-..." }]}
                values={keys}
                result={testResults.openai}
                onChange={handleChange}
                onTest={() => handleTestConnection("openai")}
                testDisabled={!keys.openaiEmbedding}
              />
            )}

            {activeTab === "vision" && (
              <div>
                <div className="rounded-lg border border-border bg-muted px-4 py-3">
                  <p className="text-xs text-muted-foreground">
                    PDF는 OpenAI, Gemini, Claude에 원본으로 전달합니다. Qwen의 PDF와 Office/HWP 문서는 아래 네이티브 렌더러가 만든 페이지 이미지를 사용합니다.
                  </p>
                </div>
                <CredentialCard
                  title="OpenAI Vision"
                  description="Embedding/RAG와 같은 OpenAI API 키를 Vision 문서 비교에도 사용합니다."
                  fields={[{ key: "openaiEmbedding", label: "API Key", placeholder: "sk-..." }]}
                  values={keys}
                  result={testResults.openai}
                  onChange={handleChange}
                  onTest={() => handleTestConnection("openai")}
                  testDisabled={!keys.openaiEmbedding}
                />
                <CredentialCard
                  title="Gemini Vision"
                  description="Google AI Gemini API 키입니다. Google Document AI 서비스 계정과 별도로 관리합니다."
                  fields={[{ key: "geminiVision", label: "API Key", placeholder: "AIza..." }]}
                  values={keys}
                  result={testResults.gemini}
                  onChange={handleChange}
                  onTest={() => handleTestConnection("gemini")}
                  testDisabled={!keys.geminiVision}
                />
                <CredentialCard
                  title="Claude Vision"
                  description="Anthropic Messages API에서 PDF 원본과 페이지 이미지를 처리합니다."
                  fields={[{ key: "anthropicVision", label: "API Key", placeholder: "sk-ant-..." }]}
                  values={keys}
                  result={testResults.anthropic}
                  onChange={handleChange}
                  onTest={() => handleTestConnection("anthropic")}
                  testDisabled={!keys.anthropicVision}
                />
                <CredentialCard
                  title="Qwen Vision"
                  description="Alibaba Model Studio 또는 호환 배포의 OpenAI-compatible endpoint를 사용합니다."
                  fields={[
                    { key: "qwenVision", label: "API Key", placeholder: "API key" },
                    { key: "qwenVisionEndpoint", label: "Compatible API base URL", placeholder: "https://.../compatible-mode/v1", type: "text" },
                  ]}
                  values={keys}
                  result={testResults.qwen}
                  onChange={handleChange}
                  onTest={() => handleTestConnection("qwen")}
                  testDisabled={!keys.qwenVision || !keys.qwenVisionEndpoint}
                />
                <CredentialCard
                  title="Native document renderer"
                  description="Word/Hancom 원본 렌더러가 DOC/DOCX/HWP/HWPX를 중간 PDF 없이 PNG 페이지로 캡처하는 서비스입니다."
                  fields={[
                    { key: "nativeDocumentRendererEndpoint", label: "Renderer base URL", placeholder: "https://renderer.example.com", type: "text" },
                    { key: "nativeDocumentRendererApiKey", label: "API Key (optional)", placeholder: "Renderer API key" },
                  ]}
                  values={keys}
                  result={testResults.renderer}
                  onChange={handleChange}
                  onTest={() => handleTestConnection("renderer")}
                  testDisabled={!keys.nativeDocumentRendererEndpoint}
                />
              </div>
            )}

            {/* Document Parsers Section */}
            {activeTab === "parser" && (
            <div>
                <CredentialCard
                  title="Upstage Document AI"
                  description="Parse PDF and image files with Upstage Document AI"
                  logo={{ src: "/logos/upstage.webp", alt: "Upstage" }}
                  fields={[{ key: "upstageParser", label: "API Key", placeholder: "up_..." }]}
                  values={keys}
                  result={testResults.upstage}
                  onChange={handleChange}
                  onTest={() => handleTestConnection("upstage")}
                  testDisabled={!keys.upstageParser}
                />
                <CredentialCard
                  title="LlamaIndex (LlamaParse)"
                  description="Parse PDF, DOCX, PPTX and image files with LlamaParse"
                  logo={{ src: "/logos/llamaindex.webp", alt: "LlamaIndex" }}
                  fields={[{ key: "llamaParser", label: "API Key", placeholder: "llx-..." }]}
                  values={keys}
                  result={testResults.llama}
                  onChange={handleChange}
                  onTest={() => handleTestConnection("llama")}
                  testDisabled={!keys.llamaParser}
                />
                <CredentialCard
                  title="Azure Document Intelligence"
                  description="Parse documents with Azure Cognitive Services"
                  logo={{ src: "/logos/azure.webp", alt: "Azure" }}
                  fields={[
                    { key: "azureParserKey", label: "API Key", placeholder: "Enter your Azure API key" },
                    { key: "azureParserEndpoint", label: "Endpoint URL", placeholder: "https://YOUR-RESOURCE.cognitiveservices.azure.com", type: "text" },
                  ]}
                  values={keys}
                  result={testResults.azure}
                  onChange={handleChange}
                  onTest={() => handleTestConnection("azure")}
                  testDisabled={!keys.azureParserKey || !keys.azureParserEndpoint}
                />

                {/* Google Parser Card */}
                <div className="py-6">
                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 rounded-lg bg-brand flex items-center justify-center flex-shrink-0 p-1">
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
                        <h3 className="text-xs font-medium text-card-foreground">Google Document AI</h3>
                        <button
                          onClick={() => handleTestConnection('google')}
                          disabled={testResults.google.status === 'testing' || !keys.googleParserServiceAccountEmail || !keys.googleParserPrivateKey || !keys.googleParserProjectId || !keys.googleParserLocation || !keys.googleParserProcessorId}
                          className="text-xs text-card-foreground hover:text-muted-foreground disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
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
                            Service Account Email <span className="text-danger">*</span>
                          </label>
                          <Input type="password" value={keys.googleParserServiceAccountEmail} onChange={(e) => handleChange("googleParserServiceAccountEmail", e.target.value)} placeholder="your-service-account@project.iam.gserviceaccount.com"/>
                          <p className="text-xs text-muted-foreground mt-1">
                            From JSON key file: <code className="text-card-foreground">client_email</code> field
                          </p>
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-muted-foreground mb-2">
                            Private Key <span className="text-danger">*</span>
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
                                     focus-ring
                                     bg-surface text-card-foreground text-xs
                                     placeholder-light font-mono resize-none"
                          />
                          <p className="text-xs text-muted-foreground mt-1">
                            Paste the entire <code className="text-card-foreground">private_key</code> value from JSON file (literal <code>\n</code> will be auto-converted to line breaks)
                          </p>
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-muted-foreground mb-2">
                            Project ID <span className="text-danger">*</span>
                          </label>
                          <Input type="password" value={keys.googleParserProjectId} onChange={(e) => handleChange("googleParserProjectId", e.target.value)} placeholder="your-project-id or 123456789"/>
                          <p className="text-xs text-muted-foreground mt-1">
                            From JSON key file: <code className="text-card-foreground">project_id</code> field, or from processor URL
                          </p>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-xs font-medium text-muted-foreground mb-2">
                              Location <span className="text-danger">*</span>
                            </label>
                            <Input type="password" value={keys.googleParserLocation} onChange={(e) => handleChange("googleParserLocation", e.target.value)} placeholder="us, eu, or us-central1"/>
                            <p className="text-xs text-muted-foreground mt-1">
                              From processor URL: <code className="text-card-foreground">/locations/[location]/</code>
                            </p>
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-muted-foreground mb-2">
                              Processor ID <span className="text-danger">*</span>
                            </label>
                            <Input type="password" value={keys.googleParserProcessorId} onChange={(e) => handleChange("googleParserProcessorId", e.target.value)} placeholder="9f9bd205a57448a5"/>
                            <p className="text-xs text-muted-foreground mt-1">
                              From processor URL: <code className="text-card-foreground">/processors/[processor-id]:</code>
                            </p>
                          </div>
                        </div>
                      </div>
                      {testResults.google.status !== 'idle' && testResults.google.status !== 'testing' && (
                        <div className={`mt-2 text-xs flex items-center gap-1 ${
                          testResults.google.status === 'success' ? 'text-success' : 'text-danger'
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

                {/* Docling Parser Card */}
                <CredentialCard
                  title="Docling (IBM Research)"
                  description="Parse documents using a Docling server endpoint"
                  fields={[
                    { key: "doclingEndpoint", label: "Docling Server Endpoint", placeholder: "http://localhost:5001", type: "text" },
                    { key: "doclingApiKey", label: "API Key (optional)", placeholder: "Required only when X-Api-Key authentication is enabled" },
                  ]}
                  values={keys}
                  result={testResults.docling}
                  onChange={handleChange}
                  onTest={() => handleTestConnection("docling")}
                  testDisabled={!keys.doclingEndpoint}
                />
              </div>
            )}

            {/* Vector Database Section */}
            {activeTab === "database" && (
            <div>
              <div className="py-6">
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-lg bg-brand flex items-center justify-center flex-shrink-0 p-1">
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
                      <h3 className="text-xs font-medium text-card-foreground">Managed Supabase Vector Store</h3>
                      <span className="px-3 py-1 rounded-full bg-success-surface text-xs font-medium text-success">
                        Connected
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground mb-4">
                      앱 Supabase의 pgvector를 사용하며 로그인 사용자별 컬렉션으로 격리됩니다.
                    </p>
                    <div className="rounded-lg border border-border bg-upload-zone p-4">
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
                        <div><span className="block text-muted-foreground">보관함</span><strong className="block mt-1 text-card-foreground">Application Supabase</strong></div>
                        <div><span className="block text-muted-foreground">Search</span><strong className="block mt-1 text-card-foreground">pgvector · cosine</strong></div>
                        <div><span className="block text-muted-foreground">Isolation</span><strong className="block mt-1 text-card-foreground">Owner scoped</strong></div>
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground mt-3">
                      Supabase URL이나 service-role 키를 별도로 입력할 필요가 없습니다. 임베딩 생성에는 AI Models의 OpenAI 키를 사용합니다.
                    </p>
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
