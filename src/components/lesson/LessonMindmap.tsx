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
  width: number;
  height: number;
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
  const nodeRefs = useRef<Record<string, HTMLDivElement | null>>({});

  // Initialize positions with radial layout
  useEffect(() => {
    if (data && Object.keys(nodePositions).length === 0) {
      initializePositions(data);
    }
  }, [data]);

  // Update node dimensions after render
  useEffect(() => {
    const updateDimensions = () => {
      const newPositions = { ...nodePositions };
      let hasChanges = false;
      
      Object.entries(nodeRefs.current).forEach(([id, ref]) => {
        if (ref && newPositions[id]) {
          const rect = ref.getBoundingClientRect();
          if (newPositions[id].width !== rect.width || newPositions[id].height !== rect.height) {
            newPositions[id] = {
              ...newPositions[id],
              width: rect.width,
              height: rect.height,
            };
            hasChanges = true;
          }
        }
      });
      
      if (hasChanges) {
        setNodePositions(newPositions);
      }
    };
    
    // Delay to allow rendering
    const timer = setTimeout(updateDimensions, 100);
    return () => clearTimeout(timer);
  }, [data, nodePositions]);

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
    newPositions[node.id] = { x: centerX, y: centerY, width: 150, height: 50 };
    
    // Group children by parent
    const nodesByParent: Record<string, MindmapNode[]> = {};
    allNodes.forEach(({node: n, parentId}) => {
      if (parentId) {
        if (!nodesByParent[parentId]) nodesByParent[parentId] = [];
        nodesByParent[parentId].push(n);
      }
    });

    // Calculate positions level by level using radial layout with more spacing
    const positionChildren = (parentId: string, parentPos: NodePosition, level: number, angleStart: number, angleEnd: number) => {
      const children = nodesByParent[parentId] || [];
      if (children.length === 0) return;
      
      // Increase spacing between levels - 250px between each level
      const radius = 220 + level * 80;
      const angleRange = angleEnd - angleStart;
      const angleStep = children.length > 1 ? angleRange / children.length : 0;
      
      children.forEach((child, idx) => {
        const angle = children.length === 1 
          ? (angleStart + angleEnd) / 2 
          : angleStart + angleStep * (idx + 0.5);
        
        const x = parentPos.x + Math.cos(angle) * radius;
        const y = parentPos.y + Math.sin(angle) * radius;
        
        newPositions[child.id] = { x, y, width: 120, height: 40 };
        
        // Recursively position grandchildren in a narrower arc
        const childAngleSpread = Math.PI / (2 + level);
        positionChildren(child.id, { x, y, width: 120, height: 40 }, level + 1, angle - childAngleSpread / 2, angle + childAngleSpread / 2);
      });
    };
    
    if (node.children && node.children.length > 0) {
      positionChildren(node.id, { x: centerX, y: centerY, width: 150, height: 50 }, 1, 0, 2 * Math.PI);
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
      const radius = 220;
      setNodePositions(prev => ({
        ...prev,
        [newId]: {
          x: parentPos.x + Math.cos(angle) * radius,
          y: parentPos.y + Math.sin(angle) * radius,
          width: 120,
          height: 40,
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
      [draggingId]: { ...prev[draggingId], x, y }
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

  // Calculate connection points that touch the node boxes
  const getConnectionPoints = (fromId: string, toId: string) => {
    const fromPos = nodePositions[fromId];
    const toPos = nodePositions[toId];
    if (!fromPos || !toPos) return null;

    const fromW = fromPos.width / 2;
    const fromH = fromPos.height / 2;
    const toW = toPos.width / 2;
    const toH = toPos.height / 2;

    // Direction vector
    const dx = toPos.x - fromPos.x;
    const dy = toPos.y - fromPos.y;
    const angle = Math.atan2(dy, dx);

    // Calculate intersection with from node box edge
    let startX = fromPos.x;
    let startY = fromPos.y;
    
    // Determine which edge to use for start point
    const absAngle = Math.abs(angle);
    if (absAngle < Math.PI / 4 || absAngle > 3 * Math.PI / 4) {
      // Left or right edge
      startX = fromPos.x + (dx > 0 ? fromW : -fromW);
      startY = fromPos.y + Math.tan(angle) * (dx > 0 ? fromW : -fromW);
      startY = Math.max(fromPos.y - fromH, Math.min(fromPos.y + fromH, startY));
    } else {
      // Top or bottom edge
      startY = fromPos.y + (dy > 0 ? fromH : -fromH);
      startX = fromPos.x + (dy > 0 ? fromH : -fromH) / Math.tan(angle);
      startX = Math.max(fromPos.x - fromW, Math.min(fromPos.x + fromW, startX));
    }

    // Calculate intersection with to node box edge
    let endX = toPos.x;
    let endY = toPos.y;
    
    if (absAngle < Math.PI / 4 || absAngle > 3 * Math.PI / 4) {
      // Left or right edge
      endX = toPos.x + (dx > 0 ? -toW : toW);
      endY = toPos.y - Math.tan(angle) * (dx > 0 ? toW : -toW);
      endY = Math.max(toPos.y - toH, Math.min(toPos.y + toH, endY));
    } else {
      // Top or bottom edge
      endY = toPos.y + (dy > 0 ? -toH : toH);
      endX = toPos.x - (dy > 0 ? toH : -toH) / Math.tan(angle);
      endX = Math.max(toPos.x - toW, Math.min(toPos.x + toW, endX));
    }

    return { startX, startY, endX, endY, angle };
  };

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
            {/* SVG for connections - arrows that connect box edges */}
            <svg className="absolute inset-0 w-[400%] h-[400%] pointer-events-none" style={{ left: '-150%', top: '-150%' }}>
              <defs>
                <marker 
                  id="arrowhead" 
                  markerWidth="10" 
                  markerHeight="7" 
                  refX="9" 
                  refY="3.5" 
                  orient="auto"
                  markerUnits="strokeWidth"
                >
                  <polygon points="0 0, 10 3.5, 0 7" fill="hsl(var(--primary))" />
                </marker>
              </defs>
              {connections.map(({ from, to }) => {
                const points = getConnectionPoints(from, to);
                if (!points) return null;
                
                // Offset for the SVG positioning (center of the larger canvas)
                const offsetX = 750;
                const offsetY = 600;
                
                const x1 = points.startX + offsetX;
                const y1 = points.startY + offsetY;
                const x2 = points.endX + offsetX;
                const y2 = points.endY + offsetY;
                
                return (
                  <line
                    key={`${from}-${to}`}
                    x1={x1}
                    y1={y1}
                    x2={x2}
                    y2={y2}
                    stroke="hsl(var(--primary))"
                    strokeWidth={2}
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
                  ref={(el) => { nodeRefs.current[node.id] = el; }}
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
                    style={{ cursor: isEditing ? 'default' : 'grab', minWidth: '100px', textAlign: 'center', whiteSpace: 'nowrap' }}
                    onMouseDown={(e) => handleNodeMouseDown(e, node.id)}
                  >
                    {isEditing ? (
                      <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                        <Input
                          value={editValue}
                          onChange={(e) => setEditValue(e.target.value)}
                          className="h-7 text-sm bg-background/50"
                          autoFocus
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleSaveEdit();
                            if (e.key === 'Escape') handleCancelEdit();
                          }}
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
                        <span className="select-none">{node.label}</span>
                        {/* Action buttons on hover */}
                        <div className="absolute -top-8 left-1/2 -translate-x-1/2 hidden group-hover:flex items-center gap-1 bg-background/95 rounded-lg px-1 py-0.5 shadow-lg border border-border/50">
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-6 w-6"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleEdit(node.id, node.label);
                            }}
                          >
                            <Edit2 className="h-3 w-3" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-6 w-6"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleAddChild(node.id);
                            }}
                          >
                            <Plus className="h-3 w-3" />
                          </Button>
                          {!isRoot && (
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-6 w-6 text-destructive hover:text-destructive"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDelete(node.id);
                              }}
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
                      className="absolute top-full left-1/2 -translate-x-1/2 mt-2 flex items-center gap-2 bg-background p-2 rounded-lg shadow-lg border border-border z-50"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <Input
                        value={newNodeLabel}
                        onChange={(e) => setNewNodeLabel(e.target.value)}
                        placeholder={t('mindmap.newNode')}
                        className="h-8 text-sm w-40"
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
        <Card className="h-full flex flex-col border-0 rounded-none">
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