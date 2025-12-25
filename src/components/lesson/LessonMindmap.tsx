import React, { useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, Trash2, Edit2, Check, X, Brain } from 'lucide-react';
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

export const LessonMindmap: React.FC<LessonMindmapProps> = ({ mindmapData, onUpdate }) => {
  const { t } = useLanguage();
  const [data, setData] = useState<MindmapNode | null>(mindmapData);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');
  const [addingToId, setAddingToId] = useState<string | null>(null);
  const [newNodeLabel, setNewNodeLabel] = useState('');

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

    const newNode: MindmapNode = {
      id: `node-${Date.now()}`,
      label: newNodeLabel.trim(),
      children: []
    };

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
    
    // Don't delete root
    if (data.id === nodeId) return;

    const updated = findAndUpdate(data, nodeId, () => null);
    if (updated) updateData(updated);
  };

  if (!data) {
    return (
      <Card className="border-border/50">
        <CardContent className="py-12 text-center">
          <Brain className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground">{t('course.mindmap')} non disponible</p>
        </CardContent>
      </Card>
    );
  }

  const renderNode = (node: MindmapNode, level: number = 0, isRoot: boolean = false) => {
    const isEditing = editingId === node.id;
    const isAdding = addingToId === node.id;
    
    // Colors based on level
    const levelColors = [
      'bg-primary text-primary-foreground',
      'bg-secondary text-secondary-foreground border border-border',
      'bg-muted text-muted-foreground',
      'bg-card text-card-foreground border border-border/50',
    ];
    const colorClass = levelColors[Math.min(level, levelColors.length - 1)];

    return (
      <div key={node.id} className={`${isRoot ? 'flex flex-col items-center' : ''}`}>
        {/* Node */}
        <div className={`group relative ${isRoot ? 'mb-8' : 'mb-3'}`}>
          <div className={`
            inline-flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-sm 
            ${colorClass} ${isRoot ? 'text-base px-6 py-3' : ''}
            transition-all duration-200 hover:shadow-md
          `}>
            {isEditing ? (
              <div className="flex items-center gap-2">
                <Input
                  value={editValue}
                  onChange={(e) => setEditValue(e.target.value)}
                  className="h-7 w-32 text-sm bg-background text-foreground"
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
                  <X className="h-3 w-3" />
                </Button>
              </div>
            ) : (
              <>
                <span>{node.label}</span>
                <div className="hidden group-hover:flex items-center gap-1 ml-2">
                  <Button 
                    size="icon" 
                    variant="ghost" 
                    className="h-6 w-6 opacity-70 hover:opacity-100"
                    onClick={() => handleEdit(node.id, node.label)}
                  >
                    <Edit2 className="h-3 w-3" />
                  </Button>
                  <Button 
                    size="icon" 
                    variant="ghost" 
                    className="h-6 w-6 opacity-70 hover:opacity-100"
                    onClick={() => handleAddChild(node.id)}
                  >
                    <Plus className="h-3 w-3" />
                  </Button>
                  {!isRoot && (
                    <Button 
                      size="icon" 
                      variant="ghost" 
                      className="h-6 w-6 opacity-70 hover:opacity-100 text-destructive"
                      onClick={() => handleDelete(node.id)}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  )}
                </div>
              </>
            )}
          </div>
        </div>

        {/* Add new node form */}
        {isAdding && (
          <div className={`${isRoot ? 'mb-4' : 'ml-8 mb-3'}`}>
            <div className="flex items-center gap-2 bg-card border border-border rounded-lg p-2">
              <Input
                value={newNodeLabel}
                onChange={(e) => setNewNodeLabel(e.target.value)}
                placeholder="Nouveau concept..."
                className="h-8 text-sm"
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
                <X className="h-3 w-3" />
              </Button>
            </div>
          </div>
        )}

        {/* Children */}
        {node.children && node.children.length > 0 && (
          <div className={`
            ${isRoot 
              ? 'flex flex-wrap justify-center gap-8' 
              : 'ml-8 pl-4 border-l-2 border-border/50 space-y-2'
            }
          `}>
            {node.children.map((child) => renderNode(child, level + 1, false))}
          </div>
        )}
      </div>
    );
  };

  return (
    <Card className="border-border/50">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg flex items-center gap-2">
          <Brain className="h-5 w-5 text-muted-foreground" />
          {t('course.mindmap')}
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Survolez les éléments pour les modifier, ajouter ou supprimer
        </p>
      </CardHeader>
      <CardContent className="py-8 overflow-x-auto">
        <div className="min-w-fit">
          {renderNode(data, 0, true)}
        </div>
      </CardContent>
    </Card>
  );
};