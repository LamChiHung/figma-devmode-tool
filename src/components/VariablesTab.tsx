import React from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';

interface VariablesTabProps {
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

export const VariablesTab: React.FC<VariablesTabProps> = ({ variablesData }) => {
  if (!variablesData) {
    return (
      <div className="flex items-center justify-center h-40 text-slate-400 p-6 text-center">
        No variables data available.
      </div>
    );
  }

  const variables = variablesData.meta?.variables || {};
  const variableCollections = variablesData.meta?.variableCollections || {};

  const varsList = Object.values(variables) as any[];
  
  if (varsList.length === 0) {
    return (
      <div className="flex items-center justify-center h-40 text-slate-400 p-6 text-center">
        This file has no local variables.
      </div>
    );
  }

  // Group by collection
  const groupedVars: Record<string, any[]> = {};
  varsList.forEach(v => {
    const collectionId = v.variableCollectionId;
    if (!groupedVars[collectionId]) {
      groupedVars[collectionId] = [];
    }
    groupedVars[collectionId].push(v);
  });

  const renderValue = (variable: any, collection: any) => {
    // Just grab the value for the default mode for simplicity
    const defaultModeId = collection?.defaultModeId;
    let val = null;
    
    if (defaultModeId && variable.valuesByMode && variable.valuesByMode[defaultModeId] !== undefined) {
      val = variable.valuesByMode[defaultModeId];
    } else if (variable.valuesByMode) {
      // Fallback to first mode
      val = Object.values(variable.valuesByMode)[0];
    }

    if (val === null || val === undefined) return <span className="text-slate-400">-</span>;

    // Is it an alias to another variable?
    if (val && typeof val === 'object' && val.type === 'VARIABLE_ALIAS') {
      const aliasVar = variables[val.id];
      return (
        <div className="flex items-center space-x-2">
          <Badge variant="outline" className="text-xs text-indigo-500 border-indigo-200 bg-indigo-50 dark:bg-indigo-950 dark:border-indigo-800">
            Alias: {aliasVar ? aliasVar.name : val.id}
          </Badge>
        </div>
      );
    }

    if (variable.resolvedType === 'COLOR') {
      return (
        <div className="flex items-center">
          <div className="w-4 h-4 rounded shadow-sm border border-slate-200 dark:border-slate-700 mr-2" style={{ backgroundColor: rgbaToCss(val) }} />
          <span className="font-mono">{rgbaToCss(val)}</span>
        </div>
      );
    }
    
    if (variable.resolvedType === 'FLOAT') {
      return <span className="font-mono">{val}px</span>;
    }

    if (variable.resolvedType === 'STRING') {
      return <span className="font-mono text-amber-600 dark:text-amber-400">"{val}"</span>;
    }

    return <span className="font-mono">{String(val)}</span>;
  };

  return (
    <ScrollArea className="h-[600px] w-full border border-slate-200 dark:border-slate-800 rounded-md p-4 bg-white dark:bg-slate-950">
      <div className="space-y-8 pb-8">
        {Object.entries(groupedVars).map(([collectionId, vars]) => {
          const collection = variableCollections[collectionId];
          const collectionName = collection ? collection.name : 'Unknown Collection';
          
          // Group by type within collection
          const varsByType: Record<string, any[]> = {};
          vars.forEach(v => {
            if (!varsByType[v.resolvedType]) varsByType[v.resolvedType] = [];
            varsByType[v.resolvedType].push(v);
          });

          return (
            <div key={collectionId} className="space-y-4">
              <h3 className="text-lg font-bold border-b pb-2">{collectionName}</h3>
              
              {Object.entries(varsByType).map(([type, typeVars]) => (
                <div key={type} className="mb-6">
                  <h4 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-3 flex items-center">
                    {type} <Badge variant="secondary" className="ml-2">{typeVars.length}</Badge>
                  </h4>
                  
                  <div className="rounded-md border overflow-hidden">
                    <table className="w-full text-sm text-left">
                      <thead className="bg-slate-50 dark:bg-slate-900/50 text-slate-500">
                        <tr>
                          <th className="px-4 py-2 font-medium w-1/2">Token Name</th>
                          <th className="px-4 py-2 font-medium w-1/2">Value (Default)</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                        {typeVars.map(v => (
                          <tr key={v.id} className="hover:bg-slate-50 dark:hover:bg-slate-900/30">
                            <td className="px-4 py-2 font-mono text-slate-900 dark:text-slate-200">
                              {v.name}
                            </td>
                            <td className="px-4 py-2">
                              {renderValue(v, collection)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ))}
            </div>
          );
        })}
      </div>
    </ScrollArea>
  );
};
