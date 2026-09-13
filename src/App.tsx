import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Loader2, Lock } from 'lucide-react';
import { NodeTree } from './components/NodeTree';
import { Inspector } from './components/Inspector';
import { VariablesTab } from './components/VariablesTab';
import { LockScreen } from './components/LockScreen';

const FIGMA_API_BASE = 'https://api.figma.com/v1';

function App() {
  const [token, setToken] = useState<string | null>(null);

  const [inputValue, setInputValue] = useState('');
  const [extractedFileId, setExtractedFileId] = useState('');
  const [extractedNodeId, setExtractedNodeId] = useState('');
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [selectedNode, setSelectedNode] = useState<any>(null);

  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState('');

  const [nodesData, setNodesData] = useState<any>(null);
  const [variablesData, setVariablesData] = useState<any>(null);

  if (!token) {
    return <LockScreen onUnlock={(decryptedToken) => setToken(decryptedToken)} />;
  }

  const handleLock = () => {
    setToken(null);
    setNodesData(null);
    setVariablesData(null);
  };

  const fetchFromFigma = async (url: string) => {
    const response = await fetch(url, {
      headers: {
        'X-Figma-Token': token,
      }
    });

    if (!response.ok) {
      const errText = await response.text();
      let errMsg = response.statusText;
      try {
        const parsed = JSON.parse(errText);
        errMsg = parsed.message || parsed.err || errMsg;
      } catch (e) { }
      throw new Error(errMsg);
    }

    return response.json();
  };

  const handleFetch = async () => {
    const input = inputValue.trim();
    if (!input) return;

    setError('');
    setIsProcessing(true);
    setNodesData(null);
    setVariablesData(null);
    setSelectedNodeId(null);
    setSelectedNode(null);

    let fileId = '';
    let nodeId = '';

    try {
      const url = new URL(input);
      if (url.hostname.includes('figma.com')) {
        const pathParts = url.pathname.split('/');
        const idIndex = pathParts.findIndex(part => part === 'file' || part === 'design') + 1;
        if (idIndex > 0 && idIndex < pathParts.length) {
          fileId = pathParts[idIndex];
        }

        const searchParams = new URLSearchParams(url.search);
        if (searchParams.has('node-id')) {
          nodeId = searchParams.get('node-id') || '';
          nodeId = nodeId.replace('-', ':');
        }
      } else {
        fileId = input;
      }
    } catch (e) {
      fileId = input;
    }

    setExtractedFileId(fileId);
    setExtractedNodeId(nodeId);

    if (fileId) {
      try {
        // Fetch variables and nodes in parallel
        const varsPromise = fetchFromFigma(`${FIGMA_API_BASE}/files/${fileId}/variables/local`).catch(e => {
          console.warn('Could not fetch variables (maybe no permission or not a Pro plan):', e);
          return null; // Return null for variables if it fails, don't break the whole app
        });

        const nodesPromise = nodeId
          ? fetchFromFigma(`${FIGMA_API_BASE}/files/${fileId}/nodes?ids=${nodeId}`)
          : fetchFromFigma(`${FIGMA_API_BASE}/files/${fileId}`);

        const [varsResult, nodesResult] = await Promise.all([varsPromise, nodesPromise]);

        setVariablesData(varsResult);
        setNodesData(nodesResult);
      } catch (err: any) {
        setError(err.message || 'Error fetching data from Figma');
      } finally {
        setIsProcessing(false);
      }
    } else {
      setError('Could not extract File ID from URL');
      setIsProcessing(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 p-6 flex flex-col items-center relative">
      {/* Loading Overlay */}
      {isProcessing && (
        <div className="fixed inset-0 bg-slate-950/50 backdrop-blur-sm z-50 flex flex-col items-center justify-center text-white">
          <Loader2 className="w-12 h-12 animate-spin mb-4 text-blue-500" />
          <h2 className="text-xl font-bold">Fetching Data...</h2>
        </div>
      )}

      {/* Lock Button */}
      <div className="absolute top-6 right-6 z-10">
        <Button variant="outline" size="sm" onClick={handleLock} className="text-slate-500 hover:text-red-500">
          <Lock className="w-4 h-4 mr-2" />
          Lock Vault
        </Button>
      </div>

      <div className="w-full max-w-5xl space-y-6 relative z-10">
        <div className="text-center space-y-2 mb-10 mt-8">
          <h1 className="text-4xl font-bold tracking-tight text-slate-900 dark:text-slate-50">
            Figma API Explorer
          </h1>
          <p className="text-slate-500 dark:text-slate-400">
            Direct client-side connection to Figma via Encrypted Vault
          </p>
        </div>

        <Card className="glass shadow-xl border-slate-200/60 dark:border-slate-800/60">
          <CardHeader>
            <CardTitle>Fetch Figma Data</CardTitle>
            <CardDescription>Retrieve document details and design tokens directly from a share URL.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-2">
              <Input
                placeholder="Paste Figma URL (e.g. https://www.figma.com/design/...)"
                value={inputValue}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setInputValue(e.target.value)}
                onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) => e.key === 'Enter' && handleFetch()}
                className="flex-1"
              />
              <Button onClick={handleFetch} disabled={isProcessing || !inputValue.trim()}>
                {isProcessing ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                {isProcessing ? 'Fetching...' : 'Fetch Data'}
              </Button>
            </div>

            {(extractedFileId) && (
              <div className="text-xs text-slate-500 flex gap-4">
                <span><strong>File ID:</strong> {extractedFileId}</span>
                {extractedNodeId && <span><strong>Node ID:</strong> {extractedNodeId}</span>}
              </div>
            )}

            {error && (
              <div className="p-4 bg-red-50 text-red-600 rounded-md border border-red-100 text-sm">
                <strong>Error: </strong> {error}
              </div>
            )}

            {nodesData && (
              <div className="mt-8">
                <Tabs defaultValue="elements" className="w-full">
                  <TabsList className="grid w-full grid-cols-2 mb-4">
                    <TabsTrigger value="elements">Elements / Nodes</TabsTrigger>
                    <TabsTrigger value="variables">Design Tokens (Variables)</TabsTrigger>
                  </TabsList>

                  <TabsContent value="elements" className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="text-lg font-semibold">Result: {nodesData?.name || 'File Nodes'}</h3>
                    </div>

                    <div className="flex h-[600px] border border-slate-200 dark:border-slate-800 rounded-lg overflow-hidden bg-white dark:bg-slate-950">
                      {/* Left Panel: Tree */}
                      <div className="w-1/3 border-r border-slate-200 dark:border-slate-800 overflow-y-auto p-4 bg-slate-50 dark:bg-slate-900/50">
                        <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-4">Layers</h4>
                        {nodesData.nodes && extractedNodeId && nodesData.nodes[extractedNodeId] ? (
                          <NodeTree
                            node={nodesData.nodes[extractedNodeId].document}
                            selectedNodeId={selectedNodeId}
                            onSelectNode={(node) => { setSelectedNodeId(node.id); setSelectedNode(node); }}
                          />
                        ) : nodesData.document ? (
                          <NodeTree
                            node={nodesData.document}
                            selectedNodeId={selectedNodeId}
                            onSelectNode={(node) => { setSelectedNodeId(node.id); setSelectedNode(node); }}
                          />
                        ) : (
                          <span className="text-sm text-slate-500">No nodes found</span>
                        )}
                      </div>

                      {/* Right Panel: Inspector */}
                      <div className="w-2/3 p-6">
                        <Inspector
                          node={selectedNode}
                          variablesData={variablesData}
                        />
                      </div>
                    </div>
                  </TabsContent>

                  <TabsContent value="variables" className="space-y-4">
                    <h3 className="text-lg font-semibold">Local Variables</h3>
                    <VariablesTab variablesData={variablesData} />
                  </TabsContent>
                </Tabs>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default App;
