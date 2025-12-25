import React from 'react';
import { Card, CardContent } from '@/components/ui/card';

interface MindmapNode {
  id: string;
  label: string;
  children?: MindmapNode[];
}

interface LessonMindmapProps {
  mindmapData: MindmapNode | null;
}

export const LessonMindmap: React.FC<LessonMindmapProps> = ({ mindmapData }) => {
  if (!mindmapData) {
    return (
      <Card className="border-border/50">
        <CardContent className="py-12 text-center">
          <p className="text-muted-foreground">Mind map non disponible pour cette leçon</p>
        </CardContent>
      </Card>
    );
  }

  const renderNode = (node: MindmapNode, level: number = 0, isLast: boolean = true) => {
    const colors = [
      'bg-primary text-primary-foreground',
      'bg-accent text-accent-foreground',
      'bg-success text-success-foreground',
      'bg-secondary text-secondary-foreground',
    ];
    const colorClass = colors[level % colors.length];

    return (
      <div key={node.id} className="relative">
        <div className="flex items-start">
          {level > 0 && (
            <div className="flex items-center mr-2">
              <div className="w-6 h-px bg-border" />
            </div>
          )}
          <div className={`px-4 py-2 rounded-lg font-medium text-sm ${colorClass} shadow-sm`}>
            {node.label}
          </div>
        </div>
        {node.children && node.children.length > 0 && (
          <div className="ml-8 mt-2 space-y-2 border-l-2 border-border/50 pl-4">
            {node.children.map((child, index) => 
              renderNode(child, level + 1, index === node.children!.length - 1)
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <Card className="border-border/50">
      <CardContent className="py-8 overflow-x-auto">
        <div className="min-w-fit">
          {renderNode(mindmapData)}
        </div>
      </CardContent>
    </Card>
  );
};
