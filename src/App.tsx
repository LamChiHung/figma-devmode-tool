import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Loader2, Lock, KeyRound, Clock } from 'lucide-react';
import { NodeTree } from './components/NodeTree';
import { Inspector } from './components/Inspector';
import { VariablesTab } from './components/VariablesTab';
import { LockScreen } from './components/LockScreen';

const FIGMA_API_BASE = 'https://api.figma.com/v1';

interface HistoryItem {
  id: string;
  url: string;
  name: string;
  timestamp: number;
}

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

  const [history, setHistory] = useState<HistoryItem[]>(() => {
    try {
      const saved = localStorage.getItem('figma_fetch_history');
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      return [];
    }
  });

  const fetchFromFigma = async (endpoint: string) => {
    const response = await fetch(endpoint, {
      headers: {
        'X-Figma-Token': token!,
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

  const handleFetch = async (urlToFetch?: string) => {
    const input = urlToFetch || inputValue.trim();
    if (!input) return;
    
    if (urlToFetch) {
      setInputValue(urlToFetch);
    }

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
    setError('');
    setSelectedNodeId(null);
    setSelectedNode(null);

    if (fileId) {
      setIsProcessing(true);
      try {
        // Fetch variables and nodes in parallel
        const varsPromise = fetchFromFigma(`${FIGMA_API_BASE}/files/${fileId}/variables/local`).catch(e => {
          console.warn('Could not fetch variables (maybe no permission or not a Pro plan):', e);
          return null; 
        });

        const nodesPromise = nodeId
          ? fetchFromFigma(`${FIGMA_API_BASE}/files/${fileId}/nodes?ids=${nodeId}`)
          : fetchFromFigma(`${FIGMA_API_BASE}/files/${fileId}`);

        const [varsResult, nodesResult] = await Promise.all([varsPromise, nodesPromise]);

        setVariablesData(varsResult);
        setNodesData(nodesResult);

        // Save to history
        const docName = nodesResult?.name || (nodesResult?.nodes && nodesResult.nodes[nodeId]?.document?.name) || 'Unknown Document';
        const newItem: HistoryItem = {
          id: `${fileId}-${nodeId}`,
          url: input,
          name: docName,
          timestamp: Date.now()
        };

        setHistory(prev => {
          const filtered = prev.filter(item => item.id !== newItem.id);
          const updated = [newItem, ...filtered].slice(0, 5); // Keep top 5 recent
          localStorage.setItem('figma_fetch_history', JSON.stringify(updated));
          return updated;
        });

      } catch (err: any) {
        console.error(err);
        setError(err.message || 'An error occurred while fetching data');
      } finally {
        setIsProcessing(false);
      }
    } else {
      setError('Could not extract File ID from URL');
      setIsProcessing(false);
    }
  };

  const handleLock = () => {
    setToken(null);
  };

  if (!token) {
    return <LockScreen onUnlock={setToken} />;
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 p-6 flex flex-col items-center">
      {/* Loading Overlay */}
      {isProcessing && (
        <div className="fixed inset-0 bg-slate-950/50 backdrop-blur-sm z-50 flex flex-col items-center justify-center text-white">
          <Loader2 className="w-12 h-12 animate-spin mb-4 text-blue-500" />
          <h2 className="text-xl font-bold">Fetching Data...</h2>
        </div>
      )}

      {/* Header & Lock Button */}
      <div className="w-full max-w-7xl flex justify-end mb-4">
        <Button variant="outline" size="sm" onClick={handleLock} className="text-slate-500 hover:text-slate-900 dark:hover:text-white">
          <Lock className="w-4 h-4 mr-2" />
          Lock Vault
        </Button>
      </div>

      <div className="w-full max-w-7xl space-y-6">
        <div className="text-center space-y-2 mb-10">
          <h1 className="text-4xl font-bold tracking-tight text-slate-900 dark:text-slate-50 flex items-center justify-center">
            <KeyRound className="w-8 h-8 mr-3 text-indigo-500" />
            Figma API Explorer
          </h1>
          <p className="text-slate-500 dark:text-slate-400">
            Paste a Figma URL to securely fetch Nodes and Design Tokens (Variables) directly to your browser.
          </p>
        </div>

        <Card className="shadow-xl border-slate-200/60 dark:border-slate-800/60">
          <CardHeader>
            <CardTitle>Fetch Figma Design</CardTitle>
            <CardDescription>Retrieve document hierarchy, properties, and CSS automatically.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex space-x-2">
              <Input
                placeholder="Paste Figma URL here (e.g. https://www.figma.com/design/j1Z.../Title?node-id=0-1)"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleFetch()}
                disabled={isProcessing}
              />
              <Button onClick={() => handleFetch()} disabled={isProcessing || !inputValue.trim()}>
                {isProcessing ? 'Fetching...' : 'Fetch Data'}
              </Button>
            </div>

            {history.length > 0 && (
              <div className="pt-4 mt-2 border-t border-slate-100 dark:border-slate-800/50">
                <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3 flex items-center">
                  <Clock className="w-4 h-4 mr-2 text-indigo-500" />
                  Recent Fetches
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3">
                  {history.map(item => (
                    <div 
                      key={item.id}
                      onClick={() => handleFetch(item.url)}
                      className="flex flex-col p-3 rounded-lg border border-slate-200 dark:border-slate-700/60 bg-slate-50 dark:bg-slate-800/40 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 hover:border-indigo-200 dark:hover:border-indigo-700/60 cursor-pointer transition-all text-left shadow-sm hover:shadow"
                      title={item.url}
                    >
                      <span className="text-sm font-medium text-slate-800 dark:text-slate-200 truncate mb-1">
                        {item.name}
                      </span>
                      <span className="text-xs text-slate-500 dark:text-slate-400">
                        {new Intl.DateTimeFormat('en-US', { hour: 'numeric', minute: '2-digit', hour12: true, month: 'short', day: 'numeric' }).format(new Date(item.timestamp))}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

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
