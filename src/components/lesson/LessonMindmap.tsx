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

  // Initialize positions
  useEffect(() => {
    if (data && Object.keys(nodePositions).length === 0) {
      initializePositions(data);
    }
  }, [data]);

  const initializePositions = (node: MindmapNode) => {
    const centerX = 400;
    const centerY = 300;
    
    const newPositions: Record<string, NodePosition> = {};
    
    // Collect all children at each level with their parent angle
    const calculatePositions = (
      n: MindmapNode, 
      level: number, 
      parentAngle: number, 
      angleSpread: number,
      parentPos: NodePosition
    ): void => {
      if (level === 0) {
        newPositions[n.id] = { x: centerX, y: centerY };
        
        if (n.children && n.children.length > 0) {
          const childCount = n.children.length;
          const fullAngle = 2 * Math.PI;
          const anglePerChild = fullAngle / childCount;
          
          n.children.forEach((child, idx) => {
            const childAngle = anglePerChild * idx - Math.PI / 2;
            calculatePositions(child, 1, childAngle, anglePerChild * 0.8, newPositions[n.id]);
          });
        }
      } else {
        // Calculate position based on parent angle - spread children around parent's direction
        const radius = 120 + level * 80;
        const x = parentPos.x + Math.cos(parentAngle) * radius;
        const y = parentPos.y + Math.sin(parentAngle) * radius;
        newPositions[n.id] = { x, y };
        
        if (n.children && n.children.length > 0) {
          const childCount = n.children.length;
          const spreadAngle = Math.min(angleSpread, Math.PI * 0.6);
          const startAngle = parentAngle - spreadAngle / 2;
          const angleStep = childCount > 1 ? spreadAngle / (childCount - 1) : 0;
          
          n.children.forEach((child, idx) => {
            const childAngle = childCount === 1 ? parentAngle : startAngle + angleStep * idx;
            calculatePositions(child, level + 1, childAngle, spreadAngle * 0.7, newPositions[n.id]);
          });
        }
      }
    };
    
    calculatePositions(node, 0, 0, Math.PI * 2, { x: centerX, y: centerY });
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
      const radius = 120;
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
          className={`relative w-full overflow-hidden bg-secondary/20 rounded-lg ${isFullscreen ? 'h-[calc(100vh-120px)]' : 'h-[500px]'}`}
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
            {/* SVG for connections - curved bezier lines */}
            <svg className="absolute inset-0 w-[300%] h-[300%] pointer-events-none" style={{ left: '-100%', top: '-100%' }}>
              <defs>
                <marker id="arrowhead" markerWidth="6" markerHeight="4" refX="5" refY="2" orient="auto">
                  <polygon points="0 0, 6 2, 0 4" fill="hsl(var(--primary))" opacity="0.6" />
                </marker>
              </defs>
              {connections.map(({ from, to }) => {
                const fromPos = nodePositions[from];
                const toPos = nodePositions[to];
                if (!fromPos || !toPos) return null;
                
                // Offset for the SVG positioning
                const offsetX = 600;
                const offsetY = 450;
                
                const x1 = fromPos.x + offsetX;
                const y1 = fromPos.y + offsetY;
                const x2 = toPos.x + offsetX;
                const y2 = toPos.y + offsetY;
                
                // Calculate control points for bezier curve
                const dx = x2 - x1;
                const dy = y2 - y1;
                const dist = Math.sqrt(dx * dx + dy * dy);
                const curveStrength = Math.min(dist * 0.3, 50);
                
                // Control point perpendicular to line
                const midX = (x1 + x2) / 2;
                const midY = (y1 + y2) / 2;
                
                return (
                  <path
                    key={`${from}-${to}`}
                    d={`M ${x1} ${y1} Q ${midX} ${midY - curveStrength * 0.2} ${x2} ${y2}`}
                    fill="none"
                    stroke="hsl(var(--primary))"
                    strokeWidth={2 / zoom}
                    strokeOpacity={0.5}
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
                      relative flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-sm 
                      ${colorClass} ${isRoot ? 'text-base px-6 py-3 shadow-lg' : 'shadow-md'}
                      transition-shadow duration-200 hover:shadow-lg
                      ${draggingId === node.id ? 'ring-2 ring-primary' : ''}
                    `}
                    style={{ cursor: isEditing ? 'default' : 'grab' }}
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
                            onClick={(e) => { e.stopPropagation(); handleEdit(node.id, node.label); }}
                            onMouseDown={(e) => e.stopPropagation()}
                          >
                            <Edit2 className="h-3 w-3" />
                          </Button>
                          <Button 
                            size="icon" 
                            variant="ghost" 
                            className="h-6 w-6 opacity-70 hover:opacity-100"
                            onClick={(e) => { e.stopPropagation(); handleAddChild(node.id); }}
                            onMouseDown={(e) => e.stopPropagation()}
                          >
                            <Plus className="h-3 w-3" />
                          </Button>
                          {!isRoot && (
                            <Button 
                              size="icon" 
                              variant="ghost" 
                              className="h-6 w-6 opacity-70 hover:opacity-100 text-destructive"
                              onClick={(e) => { e.stopPropagation(); handleDelete(node.id); }}
                              onMouseDown={(e) => e.stopPropagation()}
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          )}
                        </div>
                      </>
                    )}
                  </div>

                  {/* Add new node form */}
                  {isAdding && (
                    <div className="absolute left-1/2 top-full mt-2 -translate-x-1/2 z-50">
                      <div className="flex items-center gap-2 bg-card border border-border rounded-lg p-2 shadow-lg">
                        <Input
                          value={newNodeLabel}
                          onChange={(e) => setNewNodeLabel(e.target.value)}
                          placeholder={t('mindmap.newConcept')}
                          className="h-8 text-sm w-32"
                          autoFocus
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleSaveNewChild();
                            if (e.key === 'Escape') handleCancelAdd();
                          }}
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
      <div className="fixed inset-0 z-50 bg-background flex flex-col">
        <Card className="border-0 rounded-none flex-1 flex flex-col h-full overflow-hidden">
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
