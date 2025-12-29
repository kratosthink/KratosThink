import React, { useState, useCallback, useRef, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, Trash2, Edit2, Check, X as XIcon, Brain, Move, ZoomIn, ZoomOut, Maximize2 } from 'lucide-react';
import { useLanguage } from '@/i18n/LanguageContext';

interface MindmapNode {
  id: string;
  label: string;
  children?: MindmapNode[];
}

interface LessonMindmapProps {
  mindmapData: MindmapNode | null;
  onUpdate?: (data: MindmapNode) => void;
}

interface NodePosition {
  x: number;
  y: number;
}

export const LessonMindmap: React.FC<LessonMindmapProps> = ({ mindmapData, onUpdate }) => {
  const { t } = useLanguage();
  const [data, setData] = useState<MindmapNode | null>(mindmapData);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');
  const [addingToId, setAddingToId] = useState<string | null>(null);
  const [newNodeLabel, setNewNodeLabel] = useState('');
  const [nodePositions, setNodePositions] = useState<Record<string, NodePosition>>({});
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [isFullscreen, setIsFullscreen] = useState(false);
  
  // Pan and zoom state
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });
  
  const containerRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  // Initialize positions with radial layout - more spacing
  useEffect(() => {
    if (data && Object.keys(nodePositions).length === 0) {
      initializePositions(data);
    }
  }, [data]);

  const initializePositions = (node: MindmapNode) => {
    const centerX = 500;
    const centerY = 400;
    
    const newPositions: Record<string, NodePosition> = {};
    
    // Collect all nodes with their level
    const collectNodes = (n: MindmapNode, level: number, parentId: string | null): Array<{node: MindmapNode, level: number, parentId: string | null}> => {
      const result = [{node: n, level, parentId}];
      if (n.children) {
        n.children.forEach(child => {
          result.push(...collectNodes(child, level + 1, n.id));
        });
      }
      return result;
    };

    const allNodes = collectNodes(node, 0, null);
    
    // Position root at center
    newPositions[node.id] = { x: centerX, y: centerY };
    
    // Group children by level and parent
    const nodesByParent: Record<string, MindmapNode[]> = {};
    allNodes.forEach(({node: n, parentId}) => {
      if (parentId) {
        if (!nodesByParent[parentId]) nodesByParent[parentId] = [];
        nodesByParent[parentId].push(n);
      }
    });

    // Calculate positions level by level using radial layout
    const positionChildren = (parentId: string, parentPos: NodePosition, level: number, angleStart: number, angleEnd: number) => {
      const children = nodesByParent[parentId] || [];
      if (children.length === 0) return;
      
      // More spacing between levels - 200px between each level
      const radius = 180 + level * 60;
      const angleRange = angleEnd - angleStart;
      const angleStep = children.length > 1 ? angleRange / (children.length) : 0;
      
      children.forEach((child, idx) => {
        // Spread children evenly in the angle range
        const angle = children.length === 1 
          ? (angleStart + angleEnd) / 2 
          : angleStart + angleStep * (idx + 0.5);
        
        const x = parentPos.x + Math.cos(angle) * radius;
        const y = parentPos.y + Math.sin(angle) * radius;
        
        newPositions[child.id] = { x, y };
        
        // Recursively position grandchildren in a narrower arc
        const childAngleSpread = Math.PI / (2 + level);
        positionChildren(child.id, { x, y }, level + 1, angle - childAngleSpread / 2, angle + childAngleSpread / 2);
      });
    };
    
    // Start with full circle for first level children
    if (node.children && node.children.length > 0) {
      positionChildren(node.id, { x: centerX, y: centerY }, 1, 0, 2 * Math.PI);
    }
    
    setNodePositions(newPositions);
  };

  const updateData = useCallback((newData: MindmapNode) => {
    setData(newData);
    onUpdate?.(newData);
  }, [onUpdate]);

  const findAndUpdate = (node: MindmapNode, targetId: string, updater: (n: MindmapNode) => MindmapNode | null): MindmapNode | null => {
    if (node.id === targetId) {
      return updater(node);
    }
    if (node.children) {
      const newChildren = node.children
        .map(child => findAndUpdate(child, targetId, updater))
        .filter((child): child is MindmapNode => child !== null);
      return { ...node, children: newChildren };
    }
    return node;
  };

  const handleEdit = (nodeId: string, currentLabel: string) => {
    setEditingId(nodeId);
    setEditValue(currentLabel);
  };

  const handleSaveEdit = () => {
    if (!data || !editingId || !editValue.trim()) return;
    
    const updated = findAndUpdate(data, editingId, (node) => ({
      ...node,
      label: editValue.trim()
    }));
    
    if (updated) updateData(updated);
    setEditingId(null);
    setEditValue('');
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditValue('');
  };

  const handleAddChild = (parentId: string) => {
    setAddingToId(parentId);
    setNewNodeLabel('');
  };

  const handleSaveNewChild = () => {
    if (!data || !addingToId || !newNodeLabel.trim()) return;

    const newId = `node-${Date.now()}`;
    const newNode: MindmapNode = {
      id: newId,
      label: newNodeLabel.trim(),
      children: []
    };

    const parentPos = nodePositions[addingToId];
    if (parentPos) {
      const angle = Math.random() * Math.PI * 2;
      const radius = 180;
      setNodePositions(prev => ({
        ...prev,
        [newId]: {
          x: parentPos.x + Math.cos(angle) * radius,
          y: parentPos.y + Math.sin(angle) * radius,
        }
      }));
    }

    const updated = findAndUpdate(data, addingToId, (node) => ({
      ...node,
      children: [...(node.children || []), newNode]
    }));

    if (updated) updateData(updated);
    setAddingToId(null);
    setNewNodeLabel('');
  };

  const handleCancelAdd = () => {
    setAddingToId(null);
    setNewNodeLabel('');
  };

  const handleDelete = (nodeId: string) => {
    if (!data) return;
    if (data.id === nodeId) return;

    const updated = findAndUpdate(data, nodeId, () => null);
    if (updated) updateData(updated);
    
    setNodePositions(prev => {
      const newPos = { ...prev };
      delete newPos[nodeId];
      return newPos;
    });
  };

  // Node dragging
  const handleNodeMouseDown = (e: React.MouseEvent, nodeId: string) => {
    if (editingId || addingToId) return;
    e.stopPropagation();
    
    const rect = (e.target as HTMLElement).getBoundingClientRect();
    setDraggingId(nodeId);
    setDragOffset({
      x: e.clientX - rect.left - rect.width / 2,
      y: e.clientY - rect.top - rect.height / 2,
    });
  };

  const handleNodeMouseMove = useCallback((e: MouseEvent) => {
    if (!draggingId || !containerRef.current) return;

    const containerRect = containerRef.current.getBoundingClientRect();
    const x = (e.clientX - containerRect.left - pan.x) / zoom - dragOffset.x;
    const y = (e.clientY - containerRect.top - pan.y) / zoom - dragOffset.y;

    setNodePositions(prev => ({
      ...prev,
      [draggingId]: { x, y }
    }));
  }, [draggingId, dragOffset, pan, zoom]);

  const handleNodeMouseUp = useCallback(() => {
    setDraggingId(null);
  }, []);

  // Canvas panning
  const handleCanvasMouseDown = (e: React.MouseEvent) => {
    if (e.target === containerRef.current || e.target === contentRef.current) {
      setIsPanning(true);
      setPanStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
    }
  };

  const handleCanvasMouseMove = useCallback((e: MouseEvent) => {
    if (isPanning) {
      setPan({
        x: e.clientX - panStart.x,
        y: e.clientY - panStart.y,
      });
    }
  }, [isPanning, panStart]);

  const handleCanvasMouseUp = useCallback(() => {
    setIsPanning(false);
  }, []);

  // Zoom controls
  const handleZoomIn = () => setZoom(z => Math.min(z + 0.2, 2));
  const handleZoomOut = () => setZoom(z => Math.max(z - 0.2, 0.5));
  const handleResetView = () => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  };

  // Wheel zoom
  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? -0.1 : 0.1;
    setZoom(z => Math.min(Math.max(z + delta, 0.5), 2));
  };

  useEffect(() => {
    if (draggingId) {
      window.addEventListener('mousemove', handleNodeMouseMove);
      window.addEventListener('mouseup', handleNodeMouseUp);
      return () => {
        window.removeEventListener('mousemove', handleNodeMouseMove);
        window.removeEventListener('mouseup', handleNodeMouseUp);
      };
    }
  }, [draggingId, handleNodeMouseMove, handleNodeMouseUp]);

  useEffect(() => {
    if (isPanning) {
      window.addEventListener('mousemove', handleCanvasMouseMove);
      window.addEventListener('mouseup', handleCanvasMouseUp);
      return () => {
        window.removeEventListener('mousemove', handleCanvasMouseMove);
        window.removeEventListener('mouseup', handleCanvasMouseUp);
      };
    }
  }, [isPanning, handleCanvasMouseMove, handleCanvasMouseUp]);

  if (!data) {
    return (
      <Card className="border-border/50">
        <CardContent className="py-12 text-center">
          <Brain className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground">{t('mindmap.notAvailable')}</p>
        </CardContent>
      </Card>
    );
  }

  // Get parent-child relationships for connections
  const getAllConnections = (node: MindmapNode): Array<{ from: string; to: string }> => {
    const connections: Array<{ from: string; to: string }> = [];
    if (node.children) {
      node.children.forEach(child => {
        connections.push({ from: node.id, to: child.id });
        connections.push(...getAllConnections(child));
      });
    }
    return connections;
  };

  const getAllNodes = (node: MindmapNode, level = 0): Array<{ node: MindmapNode; level: number }> => {
    const nodes: Array<{ node: MindmapNode; level: number }> = [{ node, level }];
    if (node.children) {
      node.children.forEach(child => {
        nodes.push(...getAllNodes(child, level + 1));
      });
    }
    return nodes;
  };

  const connections = getAllConnections(data);
  const allNodes = getAllNodes(data);

  const levelColors = [
    'bg-primary text-primary-foreground',
    'bg-secondary text-secondary-foreground border border-border',
    'bg-muted text-muted-foreground',
    'bg-card text-card-foreground border border-border/50',
  ];

  const mindmapContent = (
    <>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <Brain className="h-5 w-5 text-muted-foreground" />
            {t('course.mindmap')}
          </CardTitle>
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={handleZoomOut}>
              <ZoomOut className="h-4 w-4" />
            </Button>
            <span className="text-xs text-muted-foreground w-12 text-center">{Math.round(zoom * 100)}%</span>
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={handleZoomIn}>
              <ZoomIn className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={handleResetView}>
              <Maximize2 className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => setIsFullscreen(!isFullscreen)}
            >
              {isFullscreen ? <XIcon className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
            </Button>
          </div>
        </div>
        <p className="text-sm text-muted-foreground flex items-center gap-2">
          <Move className="h-4 w-4" />
          {t('mindmap.instructions')}
        </p>
      </CardHeader>
      <CardContent className="py-4 flex-1">
        <div 
          ref={containerRef}
          className={`relative w-full overflow-hidden bg-secondary/20 rounded-lg ${isFullscreen ? 'h-[calc(100vh-120px)]' : 'h-[600px]'}`}
          style={{ cursor: isPanning ? 'grabbing' : draggingId ? 'grabbing' : 'grab' }}
          onMouseDown={handleCanvasMouseDown}
          onWheel={handleWheel}
        >
          <div
            ref={contentRef}
            className="absolute inset-0"
            style={{
              transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
              transformOrigin: '0 0',
            }}
          >
            {/* SVG for connections - straight lines with arrows pointing to nodes */}
            <svg className="absolute inset-0 w-[400%] h-[400%] pointer-events-none" style={{ left: '-150%', top: '-150%' }}>
              <defs>
                <marker 
                  id="arrowhead" 
                  markerWidth="8" 
                  markerHeight="6" 
                  refX="7" 
                  refY="3" 
                  orient="auto"
                  markerUnits="strokeWidth"
                >
                  <polygon points="0 0, 8 3, 0 6" fill="hsl(var(--primary))" opacity="0.7" />
                </marker>
              </defs>
              {connections.map(({ from, to }) => {
                const fromPos = nodePositions[from];
                const toPos = nodePositions[to];
                if (!fromPos || !toPos) return null;
                
                // Offset for the SVG positioning (center of the larger canvas)
                const offsetX = 750;
                const offsetY = 600;
                
                const x1 = fromPos.x + offsetX;
                const y1 = fromPos.y + offsetY;
                const x2 = toPos.x + offsetX;
                const y2 = toPos.y + offsetY;
                
                // Calculate the direction from parent to child
                const dx = x2 - x1;
                const dy = y2 - y1;
                const dist = Math.sqrt(dx * dx + dy * dy);
                
                if (dist === 0) return null;
                
                // Shorten the line to stop at the node edge (approximate node size: 80px width, 30px height)
                const nodeRadius = 50;
                const ratio = (dist - nodeRadius) / dist;
                const endX = x1 + dx * ratio;
                const endY = y1 + dy * ratio;
                
                // Start a bit away from the parent node
                const startRatio = 40 / dist;
                const startX = x1 + dx * startRatio;
                const startY = y1 + dy * startRatio;
                
                return (
                  <line
                    key={`${from}-${to}`}
                    x1={startX}
                    y1={startY}
                    x2={endX}
                    y2={endY}
                    stroke="hsl(var(--primary))"
                    strokeWidth={2}
                    strokeOpacity={0.6}
                    markerEnd="url(#arrowhead)"
                  />
                );
              })}
            </svg>

            {/* Nodes */}
            {allNodes.map(({ node, level }) => {
              const pos = nodePositions[node.id];
              if (!pos) return null;
              
              const isEditing = editingId === node.id;
              const isAdding = addingToId === node.id;
              const isRoot = level === 0;
              const colorClass = levelColors[Math.min(level, levelColors.length - 1)];

              return (
                <div
                  key={node.id}
                  className="absolute group"
                  style={{
                    left: pos.x,
                    top: pos.y,
                    transform: 'translate(-50%, -50%)',
                    zIndex: draggingId === node.id ? 100 : 10,
                  }}
                >
                  <div
                    className={`
                      relative flex items-center gap-2 px-5 py-3 rounded-xl font-medium text-sm 
                      ${colorClass} ${isRoot ? 'text-base px-7 py-4 shadow-lg' : 'shadow-md'}
                      transition-shadow duration-200 hover:shadow-lg
                      ${draggingId === node.id ? 'ring-2 ring-primary' : ''}
                    `}
                    style={{ cursor: isEditing ? 'default' : 'grab', minWidth: '100px', textAlign: 'center' }}
                    onMouseDown={(e) => handleNodeMouseDown(e, node.id)}
                  >
                    {isEditing ? (
                      <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                        <Input
                          value={editValue}
                          onChange={(e) => setEditValue(e.target.value)}
                          className="h-7 w-32 text-sm bg-background text-foreground"
                          autoFocus
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleSaveEdit();
                            if (e.key === 'Escape') handleCancelEdit();
                          }}
                          onMouseDown={(e) => e.stopPropagation()}
                        />
                        <Button size="icon" variant="ghost" className="h-6 w-6" onClick={handleSaveEdit}>
                          <Check className="h-3 w-3" />
                        </Button>
                        <Button size="icon" variant="ghost" className="h-6 w-6" onClick={handleCancelEdit}>
                          <XIcon className="h-3 w-3" />
                        </Button>
                      </div>
                    ) : (
                      <>
                        <span className="whitespace-nowrap">{node.label}</span>
                        <div className="hidden group-hover:flex items-center gap-1 ml-2">
                          <Button 
                            size="icon" 
                            variant="ghost" 
                            className="h-6 w-6 opacity-70 hover:opacity-100"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleEdit(node.id, node.label);
                            }}
                            onMouseDown={(e) => e.stopPropagation()}
                          >
                            <Edit2 className="h-3 w-3" />
                          </Button>
                          <Button 
                            size="icon" 
                            variant="ghost" 
                            className="h-6 w-6 opacity-70 hover:opacity-100"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleAddChild(node.id);
                            }}
                            onMouseDown={(e) => e.stopPropagation()}
                          >
                            <Plus className="h-3 w-3" />
                          </Button>
                          {!isRoot && (
                            <Button 
                              size="icon" 
                              variant="ghost" 
                              className="h-6 w-6 opacity-70 hover:opacity-100 text-destructive"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDelete(node.id);
                              }}
                              onMouseDown={(e) => e.stopPropagation()}
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          )}
                        </div>
                      </>
                    )}
                  </div>

                  {/* Add child form */}
                  {isAdding && (
                    <div 
                      className="absolute top-full left-1/2 transform -translate-x-1/2 mt-2 p-2 bg-card border border-border rounded-lg shadow-lg z-50"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div className="flex items-center gap-2">
                        <Input
                          value={newNodeLabel}
                          onChange={(e) => setNewNodeLabel(e.target.value)}
                          placeholder="Nouveau concept..."
                          className="h-8 w-40 text-sm"
                          autoFocus
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleSaveNewChild();
                            if (e.key === 'Escape') handleCancelAdd();
                          }}
                          onMouseDown={(e) => e.stopPropagation()}
                        />
                        <Button size="icon" variant="ghost" className="h-7 w-7" onClick={handleSaveNewChild}>
                          <Check className="h-3 w-3" />
                        </Button>
                        <Button size="icon" variant="ghost" className="h-7 w-7" onClick={handleCancelAdd}>
                          <XIcon className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </CardContent>
    </>
  );

  if (isFullscreen) {
    return (
      <div className="fixed inset-0 z-50 bg-background">
        <Card className="h-full border-0 rounded-none flex flex-col">
          {mindmapContent}
        </Card>
      </div>
    );
  }

  return (
    <Card className="border-border/50">
      {mindmapContent}
    </Card>
  );
};
