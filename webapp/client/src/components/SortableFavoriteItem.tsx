import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { SidebarMenuItem, SidebarMenuButton } from "@/components/ui/sidebar";
import { Link } from "wouter";
import { GripVertical } from "lucide-react";

interface SortableFavoriteItemProps {
  item: {
    icon: any;
    label: string;
    path: string;
    badge?: string;
    description?: string;
  };
  location: string;
}

export function SortableFavoriteItem({ item, location }: SortableFavoriteItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: item.path });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <SidebarMenuItem ref={setNodeRef} style={style}>
      <div className="group/item relative flex items-center">
        <div
          {...attributes}
          {...listeners}
          className="cursor-grab active:cursor-grabbing p-1 opacity-0 group-hover/item:opacity-100 transition-opacity"
        >
          <GripVertical className="h-4 w-4 text-muted-foreground" />
        </div>
        <SidebarMenuButton
          asChild
          isActive={location === item.path}
          className="flex-1"
        >
          <Link href={item.path}>
            <item.icon className="h-4 w-4" />
            <span>{item.label}</span>
          </Link>
        </SidebarMenuButton>
      </div>
    </SidebarMenuItem>
  );
}
