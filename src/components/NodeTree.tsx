import React from 'react';
import { ChevronRight, ChevronDown, Frame, Type, Square, Layout, Component as ComponentIcon, Image } from 'lucide-react';

interface NodeTreeProps {
  node: any;
  selectedNodeId: string | null;
  onSelectNode: (node: any) => void;
  depth?: number;
}

const getNodeIcon = (type: string) => {
  switch (type) {
    case 'FRAME':
    case 'GROUP':
      return <Frame className="w-3 h-3 mr-2" />;
    case 'TEXT':
      return <Type className="w-3 h-3 mr-2" />;
    case 'RECTANGLE':
      return <Square className="w-3 h-3 mr-2" />;
    case 'COMPONENT':
    case 'INSTANCE':
      return <ComponentIcon className="w-3 h-3 mr-2 text-purple-500" />;
    case 'VECTOR':
    case 'BOOLEAN_OPERATION':
      return <Layout className="w-3 h-3 mr-2 text-blue-500" />;
    case 'IMAGE':
      return <Image className="w-3 h-3 mr-2 text-green-500" />;
    default:
      return <Square className="w-3 h-3 mr-2 opacity-50" />;
  }
};

export const NodeTree: React.FC<NodeTreeProps> = ({ node, selectedNodeId, onSelectNode, depth = 0 }) => {
  const [isExpanded, setIsExpanded] = React.useState(depth < 2); // Default expand first 2 levels
  const hasChildren = node.children && node.children.length > 0;
  const isSelected = selectedNodeId === node.id;

  if (!node) return null;

  return (
    <div className="select-none">
      <div 
        className={`flex items-center py-1 px-2 cursor-pointer text-sm hover:bg-slate-100 dark:hover:bg-slate-800 rounded-sm ${isSelected ? 'bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300' : 'text-slate-700 dark:text-slate-300'}`}
        style={{ paddingLeft: `${depth * 12 + 4}px` }}
        onClick={(e) => {
          e.stopPropagation();
          onSelectNode(node);
          if (hasChildren && isSelected) {
            setIsExpanded(!isExpanded); // Toggle on second click
          }
        }}
      >
        <div 
          className="w-4 h-4 flex items-center justify-center mr-1"
          onClick={(e) => {
            if (hasChildren) {
              e.stopPropagation();
              setIsExpanded(!isExpanded);
            }
          }}
        >
          {hasChildren ? (
            isExpanded ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />
          ) : (
            <span className="w-3 h-3 inline-block" />
          )}
        </div>
        
        {getNodeIcon(node.type)}
        <span className="truncate max-w-[180px]">{node.name}</span>
        
        {/* Variable Indicator */}
        {node.boundVariables && Object.keys(node.boundVariables).length > 0 && (
          <span 
            className="ml-2 px-1 rounded-sm bg-indigo-100 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300 text-[10px] font-bold"
            title="Uses Design Tokens (Variables)"
          >
            V
          </span>
        )}
      </div>

      {hasChildren && isExpanded && (
        <div className="">
          {node.children.map((child: any) => (
            <NodeTree 
              key={child.id} 
              node={child} 
              selectedNodeId={selectedNodeId} 
              onSelectNode={onSelectNode} 
              depth={depth + 1} 
            />
          ))}
        </div>
      )}
    </div>
  );
};
