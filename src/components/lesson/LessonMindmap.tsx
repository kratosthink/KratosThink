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

const CANVAS_WIDTH = 2000;
const CANVAS_HEIGHT = 1600;

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

  // Initialize positions with hierarchical tree layout
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
    
    const timer = setTimeout(updateDimensions, 100);
    return () => clearTimeout(timer);
  }, [data, nodePositions]);

  const initializePositions = (node: MindmapNode) => {
    const centerX = CANVAS_WIDTH / 2;
    const centerY = CANVAS_HEIGHT / 2;
    
    const newPositions: Record<string, NodePosition> = {};
    
    // Place root node at center
    newPositions[node.id] = { x: centerX, y: centerY, width: 180, height: 60 };
    
    // Count total nodes at each level for spacing
    const countNodesAtLevel = (n: MindmapNode, level: number): Record<number, number> => {
      const counts: Record<number, number> = { [level]: 1 };
      if (n.children) {
        n.children.forEach(child => {
          const childCounts = countNodesAtLevel(child, level + 1);
          Object.entries(childCounts).forEach(([lvl, count]) => {
            counts[parseInt(lvl)] = (counts[parseInt(lvl)] || 0) + count;
          });
        });
      }
      return counts;
    };

    // Position children in a tree structure radiating outward
    const positionSubtree = (
      parentNode: MindmapNode,
      parentX: number,
      parentY: number,
      level: number,
      startAngle: number,
      endAngle: number
    ) => {
      if (!parentNode.children || parentNode.children.length === 0) return;
      
      const children = parentNode.children;
      const angleSpan = endAngle - startAngle;
      const angleStep = angleSpan / (children.length + 1);
      
      // Radius increases with level
      const radius = 200 + level * 120;
      
      children.forEach((child, index) => {
        const angle = startAngle + angleStep * (index + 1);
        const x = parentX + Math.cos(angle) * radius;
        const y = parentY + Math.sin(angle) * radius;
        
        newPositions[child.id] = { 
          x, 
          y, 
          width: level === 1 ? 160 : 140, 
          height: level === 1 ? 50 : 40 
        };
        
        // Recursively position grandchildren in a narrower arc
        const childAngleSpread = Math.PI / (3 + level);
        positionSubtree(
          child, 
          x, 
          y, 
          level + 1, 
          angle - childAngleSpread / 2, 
          angle + childAngleSpread / 2
        );
      });
    };
    
    // Start positioning from root
    if (node.children && node.children.length > 0) {
      positionSubtree(node, centerX, centerY, 1, 0, 2 * Math.PI);
    }
    
    setNodePositions(newPositions);
    
    // Center view on the mindmap
    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      setPan({
        x: rect.width / 2 - centerX * zoom,
        y: rect.height / 2 - centerY * zoom
      });
    }
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
      // Position new node relative to parent
      const siblings = getSiblingCount(data, addingToId);
      const angle = Math.PI / 4 + (siblings * Math.PI / 6);
      const radius = 180;
      setNodePositions(prev => ({
        ...prev,
        [newId]: {
          x: parentPos.x + Math.cos(angle) * radius,
          y: parentPos.y + Math.sin(angle) * radius,
          width: 140,
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

  const getSiblingCount = (node: MindmapNode, parentId: string): number => {
    if (node.id === parentId) {
      return node.children?.length || 0;
    }
    if (node.children) {
      for (const child of node.children) {
        const count = getSiblingCount(child, parentId);
        if (count >= 0) return count;
      }
    }
    return 0;
  };

  const handleCancelAdd = () => {
    setAddingToId(null);
    setNewNodeLabel('');
  };

  const handleDelete = (nodeId: string) => {
    if (!data) return;
    if (data.id === nodeId) return; // Can't delete root

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
    
    const pos = nodePositions[nodeId];
    if (!pos || !containerRef.current) return;
    
    const containerRect = containerRef.current.getBoundingClientRect();
    setDraggingId(nodeId);
    setDragOffset({
      x: (e.clientX - containerRect.left - pan.x) / zoom - pos.x,
      y: (e.clientY - containerRect.top - pan.y) / zoom - pos.y,
    });
  };

  const handleNodeMouseMove = useCallback((e: MouseEvent) => {
    if (!draggingId || !containerRef.current) return;

    const containerRect = containerRef.current.getBoundingClientRect();
    let x = (e.clientX - containerRect.left - pan.x) / zoom - dragOffset.x;
    let y = (e.clientY - containerRect.top - pan.y) / zoom - dragOffset.y;

    // Clamp to canvas bounds
    x = Math.max(50, Math.min(CANVAS_WIDTH - 50, x));
    y = Math.max(50, Math.min(CANVAS_HEIGHT - 50, y));

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
  const handleZoomOut = () => setZoom(z => Math.max(z - 0.2, 0.3));
  const handleResetView = () => {
    setZoom(0.8);
    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      setPan({
        x: rect.width / 2 - (CANVAS_WIDTH / 2) * 0.8,
        y: rect.height / 2 - (CANVAS_HEIGHT / 2) * 0.8
      });
    }
  };

  // Wheel zoom
  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? -0.1 : 0.1;
    setZoom(z => Math.min(Math.max(z + delta, 0.3), 2));
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

  // Get all connections (parent -> child)
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

  // Get all nodes with their level
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
    'bg-primary text-primary-foreground shadow-lg',
    'bg-secondary text-secondary-foreground border-2 border-primary/30',
    'bg-muted text-muted-foreground border border-border',
    'bg-card text-card-foreground border border-border/50',
  ];

  // Calculate line endpoints that touch node edges
  const getLineEndpoints = (fromId: string, toId: string) => {
    const fromPos = nodePositions[fromId];
    const toPos = nodePositions[toId];
    if (!fromPos || !toPos) return null;

    const fromW = fromPos.width / 2;
    const fromH = fromPos.height / 2;
    const toW = toPos.width / 2;
    const toH = toPos.height / 2;

    // Vector from source to target
    const dx = toPos.x - fromPos.x;
    const dy = toPos.y - fromPos.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    if (distance === 0) return null;

    // Unit vector
    const ux = dx / distance;
    const uy = dy / distance;

    // Find intersection with source node edge
    const getEdgeIntersection = (cx: number, cy: number, w: number, h: number, dirX: number, dirY: number) => {
      // Check intersection with each edge and find closest
      const intersections = [];
      
      // Right edge
      if (dirX > 0) {
        const t = w / dirX;
        const y = t * dirY;
        if (Math.abs(y) <= h) intersections.push({ x: cx + w, y: cy + y });
      }
      // Left edge
      if (dirX < 0) {
        const t = -w / dirX;
        const y = t * dirY;
        if (Math.abs(y) <= h) intersections.push({ x: cx - w, y: cy + y });
      }
      // Bottom edge
      if (dirY > 0) {
        const t = h / dirY;
        const x = t * dirX;
        if (Math.abs(x) <= w) intersections.push({ x: cx + x, y: cy + h });
      }
      // Top edge
      if (dirY < 0) {
        const t = -h / dirY;
        const x = t * dirX;
        if (Math.abs(x) <= w) intersections.push({ x: cx + x, y: cy - h });
      }

      return intersections[0] || { x: cx, y: cy };
    };

    const start = getEdgeIntersection(fromPos.x, fromPos.y, fromW, fromH, ux, uy);
    const end = getEdgeIntersection(toPos.x, toPos.y, toW, toH, -ux, -uy);

    return { 
      startX: start.x, 
      startY: start.y, 
      endX: end.x, 
      endY: end.y,
      angle: Math.atan2(dy, dx)
    };
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
          className={`relative w-full overflow-hidden bg-secondary/20 rounded-lg border-2 border-dashed border-border/50 ${isFullscreen ? 'h-[calc(100vh-120px)]' : 'h-[600px]'}`}
          style={{ cursor: isPanning ? 'grabbing' : draggingId ? 'grabbing' : 'grab' }}
          onMouseDown={handleCanvasMouseDown}
          onWheel={handleWheel}
        >
          <div
            ref={contentRef}
            className="absolute"
            style={{
              width: CANVAS_WIDTH,
              height: CANVAS_HEIGHT,
              transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
              transformOrigin: '0 0',
            }}
          >
            {/* SVG for connection lines */}
            <svg 
              className="absolute inset-0 pointer-events-none" 
              width={CANVAS_WIDTH} 
              height={CANVAS_HEIGHT}
              style={{ overflow: 'visible' }}
            >
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
                  <polygon points="0 0, 8 3, 0 6" fill="hsl(var(--primary))" />
                </marker>
              </defs>
              {connections.map(({ from, to }) => {
                const points = getLineEndpoints(from, to);
                if (!points) return null;
                
                return (
                  <line
                    key={`${from}-${to}`}
                    x1={points.startX}
                    y1={points.startY}
                    x2={points.endX}
                    y2={points.endY}
                    stroke="hsl(var(--primary))"
                    strokeWidth="2"
                    markerEnd="url(#arrowhead)"
                    className="transition-all duration-200"
                  />
                );
              })}
            </svg>

            {/* Nodes */}
            {allNodes.map(({ node, level }) => {
              const pos = nodePositions[node.id];
              if (!pos) return null;

              const colorClass = levelColors[Math.min(level, levelColors.length - 1)];
              const isRoot = level === 0;

              return (
                <div
                  key={node.id}
                  ref={(el) => { nodeRefs.current[node.id] = el; }}
                  className={`absolute rounded-lg px-4 py-2 cursor-move transition-shadow hover:shadow-xl ${colorClass} ${
                    draggingId === node.id ? 'ring-2 ring-primary shadow-2xl' : ''
                  }`}
                  style={{
                    left: pos.x,
                    top: pos.y,
                    transform: 'translate(-50%, -50%)',
                    minWidth: isRoot ? 180 : level === 1 ? 150 : 120,
                    maxWidth: 220,
                    zIndex: draggingId === node.id ? 100 : 10 - level,
                  }}
                  onMouseDown={(e) => handleNodeMouseDown(e, node.id)}
                >
                  {editingId === node.id ? (
                    <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                      <Input
                        value={editValue}
                        onChange={(e) => setEditValue(e.target.value)}
                        className="h-7 text-xs min-w-0"
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
                  ) : addingToId === node.id ? (
                    <div className="space-y-2" onClick={(e) => e.stopPropagation()}>
                      <p className={`text-center font-medium ${isRoot ? 'text-base' : 'text-sm'}`}>{node.label}</p>
                      <div className="flex items-center gap-1">
                        <Input
                          value={newNodeLabel}
                          onChange={(e) => setNewNodeLabel(e.target.value)}
                          placeholder={t('mindmap.newNode')}
                          className="h-7 text-xs"
                          autoFocus
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleSaveNewChild();
                            if (e.key === 'Escape') handleCancelAdd();
                          }}
                        />
                        <Button size="icon" variant="ghost" className="h-6 w-6" onClick={handleSaveNewChild}>
                          <Check className="h-3 w-3" />
                        </Button>
                        <Button size="icon" variant="ghost" className="h-6 w-6" onClick={handleCancelAdd}>
                          <XIcon className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="group">
                      <p className={`text-center font-medium leading-tight ${isRoot ? 'text-base' : 'text-sm'}`}>
                        {node.label}
                      </p>
                      <div className="absolute -top-8 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 bg-background/90 backdrop-blur rounded-lg p-1 shadow-lg border">
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-6 w-6"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleAddChild(node.id);
                          }}
                          title="Add child"
                        >
                          <Plus className="h-3 w-3" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-6 w-6"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleEdit(node.id, node.label);
                          }}
                          title="Edit"
                        >
                          <Edit2 className="h-3 w-3" />
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
                            title="Delete"
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        )}
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
        <Card className="border-0 rounded-none flex-1 flex flex-col h-full">
          {mindmapContent}
        </Card>
      </div>
    );
  }

  return (
    <Card className="border-border/50 flex flex-col">
      {mindmapContent}
    </Card>
  );
};
