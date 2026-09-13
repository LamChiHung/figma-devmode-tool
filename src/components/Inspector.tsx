import React from 'react';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';

interface InspectorProps {
  node: any;
  variablesData: any;
}

const rgbaToCss = (color: any) => {
  if (!color) return 'transparent';
  const r = Math.round(color.r * 255);
  const g = Math.round(color.g * 255);
  const b = Math.round(color.b * 255);
  const a = color.a !== undefined ? color.a : 1;
  if (a === 1) return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`.toUpperCase();
  return `rgba(${r}, ${g}, ${b}, ${a.toFixed(2)})`;
};

export const Inspector: React.FC<InspectorProps> = ({ node, variablesData }) => {
  if (!node) {
    return (
      <div className="flex items-center justify-center h-full text-slate-400 p-6 text-center">
        Select a node from the tree to view its Developer Specs.
      </div>
    );
  }

  // Helper to resolve variables
  const resolveVariable = (id: string) => {
    if (!variablesData) return null;
    const variables = variablesData.meta?.variables || variablesData.variables;
    if (!variables) return null;
    return variables[id] || null;
  };

  const getBoundVariable = (_type: string, path: string[]) => {
    if (!node.boundVariables) return null;
    let current = node.boundVariables;
    for (const p of path) {
      if (!current[p]) return null;
      current = current[p];
    }
    if (current && current.type === 'VARIABLE_ALIAS') {
      return resolveVariable(current.id);
    }
    return null;
  };

  // Generate CSS
  const cssProps: string[] = [];
  
  if (node.layoutMode === 'HORIZONTAL') {
    cssProps.push('display: flex;');
    cssProps.push('flex-direction: row;');
  } else if (node.layoutMode === 'VERTICAL') {
    cssProps.push('display: flex;');
    cssProps.push('flex-direction: column;');
  }

  if (node.primaryAxisAlignItems) {
    const map: any = { MIN: 'flex-start', MAX: 'flex-end', CENTER: 'center', SPACE_BETWEEN: 'space-between' };
    if (map[node.primaryAxisAlignItems]) cssProps.push(`justify-content: ${map[node.primaryAxisAlignItems]};`);
  }

  if (node.counterAxisAlignItems) {
    const map: any = { MIN: 'flex-start', MAX: 'flex-end', CENTER: 'center' };
    if (map[node.counterAxisAlignItems]) cssProps.push(`align-items: ${map[node.counterAxisAlignItems]};`);
  }

  if (node.itemSpacing > 0) {
    const gapVar = getBoundVariable('FLOAT', ['itemSpacing']);
    cssProps.push(`gap: ${node.itemSpacing}px;${gapVar ? ` /* var(--${gapVar.name}) */` : ''}`);
  }

  const pTopVar = getBoundVariable('FLOAT', ['paddingTop']);
  const pRightVar = getBoundVariable('FLOAT', ['paddingRight']);
  const pBottomVar = getBoundVariable('FLOAT', ['paddingBottom']);
  const pLeftVar = getBoundVariable('FLOAT', ['paddingLeft']);
  const pVarStr = pTopVar || pRightVar || pBottomVar || pLeftVar 
    ? ` /* ${[pTopVar?.name, pRightVar?.name, pBottomVar?.name, pLeftVar?.name].filter(Boolean).map(n => `var(--${n})`).join(' ')} */` 
    : '';

  if (node.paddingTop || node.paddingBottom || node.paddingLeft || node.paddingRight) {
    cssProps.push(`padding: ${node.paddingTop || 0}px ${node.paddingRight || 0}px ${node.paddingBottom || 0}px ${node.paddingLeft || 0}px;${pVarStr}`);
  }

  if (node.absoluteBoundingBox) {
    const widthVar = getBoundVariable('FLOAT', ['width']);
    const heightVar = getBoundVariable('FLOAT', ['height']);
    cssProps.push(`width: ${node.absoluteBoundingBox.width}px;${widthVar ? ` /* var(--${widthVar.name}) */` : ''}`);
    cssProps.push(`height: ${node.absoluteBoundingBox.height}px;${heightVar ? ` /* var(--${heightVar.name}) */` : ''}`);
  }

  if (node.cornerRadius) {
    const radiusVar = getBoundVariable('FLOAT', ['cornerRadius']);
    cssProps.push(`border-radius: ${node.cornerRadius}px;${radiusVar ? ` /* var(--${radiusVar.name}) */` : ''}`);
  }

  // Fills
  const fills = node.fills || [];
  const bgFills = fills.filter((f: any) => f.type === 'SOLID' && f.visible !== false);
  let bgVariable: any = null;
  if (bgFills.length > 0) {
    bgVariable = getBoundVariable('COLOR', ['fills', '0']);
    if (!bgVariable && bgFills[0].boundVariables && bgFills[0].boundVariables.color) {
      bgVariable = resolveVariable(bgFills[0].boundVariables.color.id);
    }
    cssProps.push(`background-color: ${rgbaToCss(bgFills[0].color)};${bgVariable ? ` /* var(--${bgVariable.name}) */` : ''}`);
  }

  // Strokes
  const strokes = node.strokes || [];
  const strokeFills = strokes.filter((f: any) => f.type === 'SOLID' && f.visible !== false);
  let strokeVariable: any = null;
  if (strokeFills.length > 0) {
    strokeVariable = getBoundVariable('COLOR', ['strokes', '0']); 
    if (!strokeVariable && strokeFills[0].boundVariables && strokeFills[0].boundVariables.color) {
      strokeVariable = resolveVariable(strokeFills[0].boundVariables.color.id);
    }
    cssProps.push(`border: ${node.strokeWeight || 1}px solid ${rgbaToCss(strokeFills[0].color)};${strokeVariable ? ` /* var(--${strokeVariable.name}) */` : ''}`);
  }

  if (node.style) {
    if (node.style.fontFamily) cssProps.push(`font-family: "${node.style.fontFamily}", sans-serif;`);
    if (node.style.fontWeight) cssProps.push(`font-weight: ${node.style.fontWeight};`);
    if (node.style.fontSize) cssProps.push(`font-size: ${node.style.fontSize}px;`);
    if (node.style.lineHeightPx) cssProps.push(`line-height: ${Math.round(node.style.lineHeightPx)}px;`);
  }

  return (
    <ScrollArea className="h-[600px] pr-4">
      <div className="space-y-6 pb-6">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center">
            {node.name}
            <Badge variant="secondary" className="ml-2 font-mono text-xs">{node.type}</Badge>
          </h2>
          <p className="text-xs text-slate-500 mt-1 font-mono">ID: {node.id}</p>
        </div>

        <Separator />

        {/* Generated CSS */}
        <div>
          <h3 className="text-sm font-semibold mb-2 text-slate-700 dark:text-slate-300">Generated CSS</h3>
          <div className="bg-slate-950 p-4 rounded-md text-slate-300 font-mono text-xs">
            {cssProps.length > 0 ? (
              <pre className="whitespace-pre-wrap break-all leading-relaxed">{cssProps.join('\n')}</pre>
            ) : (
              <span className="opacity-50">No CSS properties to display</span>
            )}
          </div>
        </div>

        {/* Variables Used */}
        {(bgVariable || getBoundVariable('FLOAT', ['itemSpacing']) || getBoundVariable('FLOAT', ['paddingTop'])) && (
          <div>
            <h3 className="text-sm font-semibold mb-2 text-slate-700 dark:text-slate-300">Variables (Tokens) Used</h3>
            <div className="space-y-2">
              {bgVariable && (
                <div className="flex items-center justify-between bg-slate-100 dark:bg-slate-800 p-2 rounded text-sm">
                  <span className="text-slate-500">Fill</span>
                  <div className="flex items-center">
                    <div className="w-4 h-4 rounded-full mr-2 border border-slate-200 dark:border-slate-700" style={{ backgroundColor: bgFills[0] ? rgbaToCss(bgFills[0].color) : 'transparent' }} />
                    <span className="font-mono bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300 px-2 py-0.5 rounded-sm text-xs">
                      {bgVariable.name}
                    </span>
                  </div>
                </div>
              )}
              {getBoundVariable('FLOAT', ['itemSpacing']) && (
                <div className="flex items-center justify-between bg-slate-100 dark:bg-slate-800 p-2 rounded text-sm">
                  <span className="text-slate-500">Gap (itemSpacing)</span>
                  <span className="font-mono bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300 px-2 py-0.5 rounded-sm text-xs">
                    {getBoundVariable('FLOAT', ['itemSpacing']).name}
                  </span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Colors / Typography / Layout details can go here */}
        <div className="grid grid-cols-2 gap-4">
          {bgFills.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold mb-2 text-slate-700 dark:text-slate-300">Fills</h3>
              {bgFills.map((fill: any, i: number) => (
                <div key={i} className="flex items-center p-2 bg-slate-100 dark:bg-slate-800 rounded">
                  <div className="w-6 h-6 rounded-md mr-3 border shadow-sm" style={{ backgroundColor: rgbaToCss(fill.color) }} />
                  <span className="font-mono text-xs">{rgbaToCss(fill.color)}</span>
                </div>
              ))}
            </div>
          )}
          
          {node.absoluteBoundingBox && (
            <div>
              <h3 className="text-sm font-semibold mb-2 text-slate-700 dark:text-slate-300">Size</h3>
              <div className="p-2 bg-slate-100 dark:bg-slate-800 rounded text-xs grid grid-cols-2 gap-2">
                <div><span className="text-slate-500">W:</span> {Math.round(node.absoluteBoundingBox.width)}</div>
                <div><span className="text-slate-500">H:</span> {Math.round(node.absoluteBoundingBox.height)}</div>
              </div>
            </div>
          )}
        </div>

      </div>
    </ScrollArea>
  );
};
