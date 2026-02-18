import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { FolderPlus, Trash2, Edit2, Check, X } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";

interface FavoriteGroupsManagerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  groups: Record<string, string[]>;
  onUpdateGroups: (groups: Record<string, string[]>) => void;
  allItems: Array<{ path: string; label: string }>;
  favoriteItems: string[];
}

export function FavoriteGroupsManager({
  open,
  onOpenChange,
  groups,
  onUpdateGroups,
  allItems,
  favoriteItems,
}: FavoriteGroupsManagerProps) {
  const [newGroupName, setNewGroupName] = useState("");
  const [editingGroup, setEditingGroup] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");
  const [selectedGroup, setSelectedGroup] = useState<string | null>(null);
  const [selectedItems, setSelectedItems] = useState<string[]>([]);

  const handleCreateGroup = () => {
    if (!newGroupName.trim()) return;
    
    const updatedGroups = {
      ...groups,
      [newGroupName]: [],
    };
    onUpdateGroups(updatedGroups);
    setNewGroupName("");
  };

  const handleDeleteGroup = (groupName: string) => {
    const updatedGroups = { ...groups };
    delete updatedGroups[groupName];
    onUpdateGroups(updatedGroups);
    if (selectedGroup === groupName) {
      setSelectedGroup(null);
      setSelectedItems([]);
    }
  };

  const handleRenameGroup = (oldName: string, newName: string) => {
    if (!newName.trim() || newName === oldName) {
      setEditingGroup(null);
      return;
    }

    const updatedGroups = { ...groups };
    updatedGroups[newName] = updatedGroups[oldName];
    delete updatedGroups[oldName];
    onUpdateGroups(updatedGroups);
    
    if (selectedGroup === oldName) {
      setSelectedGroup(newName);
    }
    setEditingGroup(null);
  };

  const handleSelectGroup = (groupName: string) => {
    setSelectedGroup(groupName);
    setSelectedItems(groups[groupName] || []);
  };

  const handleToggleItem = (path: string) => {
    setSelectedItems(prev => {
      if (prev.includes(path)) {
        return prev.filter(p => p !== path);
      } else {
        return [...prev, path];
      }
    });
  };

  const handleSaveGroupItems = () => {
    if (!selectedGroup) return;

    const updatedGroups = {
      ...groups,
      [selectedGroup]: selectedItems,
    };
    onUpdateGroups(updatedGroups);
    setSelectedGroup(null);
    setSelectedItems([]);
  };

  const favoriteItemsData = allItems.filter(item => favoriteItems.includes(item.path));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle>Manage Favorite Groups</DialogTitle>
          <DialogDescription>
            Organize your favorites into groups for better organization
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-4 h-[500px]">
          {/* Left: Groups List */}
          <div className="border rounded-lg p-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold">Groups</h3>
              <Badge variant="secondary">{Object.keys(groups).length}</Badge>
            </div>

            <div className="flex gap-2 mb-4">
              <Input
                placeholder="New group name..."
                value={newGroupName}
                onChange={(e) => setNewGroupName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleCreateGroup();
                }}
              />
              <Button size="sm" onClick={handleCreateGroup}>
                <FolderPlus className="h-4 w-4" />
              </Button>
            </div>

            <Separator className="mb-4" />

            <ScrollArea className="h-[350px]">
              <div className="space-y-2">
                {Object.keys(groups).map((groupName) => (
                  <div
                    key={groupName}
                    className={`flex items-center justify-between p-2 rounded-lg hover:bg-muted/50 transition-colors ${
                      selectedGroup === groupName ? 'bg-muted' : ''
                    }`}
                  >
                    {editingGroup === groupName ? (
                      <div className="flex items-center gap-2 flex-1">
                        <Input
                          value={editingName}
                          onChange={(e) => setEditingName(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleRenameGroup(groupName, editingName);
                            if (e.key === 'Escape') setEditingGroup(null);
                          }}
                          className="h-7 text-sm"
                          autoFocus
                        />
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-7 w-7"
                          onClick={() => handleRenameGroup(groupName, editingName)}
                        >
                          <Check className="h-3 w-3" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-7 w-7"
                          onClick={() => setEditingGroup(null)}
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    ) : (
                      <>
                        <button
                          className="flex items-center gap-2 flex-1 text-left"
                          onClick={() => handleSelectGroup(groupName)}
                        >
                          <span className="text-sm font-medium">{groupName}</span>
                          <Badge variant="outline" className="text-[10px]">
                            {groups[groupName].length}
                          </Badge>
                        </button>
                        <div className="flex items-center gap-1">
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-7 w-7"
                            onClick={() => {
                              setEditingGroup(groupName);
                              setEditingName(groupName);
                            }}
                          >
                            <Edit2 className="h-3 w-3" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-7 w-7 text-destructive"
                            onClick={() => handleDeleteGroup(groupName)}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </>
                    )}
                  </div>
                ))}

                {Object.keys(groups).length === 0 && (
                  <div className="text-center py-8 text-sm text-muted-foreground">
                    No groups yet. Create one to get started!
                  </div>
                )}
              </div>
            </ScrollArea>
          </div>

          {/* Right: Items Selection */}
          <div className="border rounded-lg p-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold">
                {selectedGroup ? `Edit "${selectedGroup}"` : 'Select a group'}
              </h3>
              {selectedGroup && (
                <Button size="sm" onClick={handleSaveGroupItems}>
                  Save
                </Button>
              )}
            </div>

            {selectedGroup ? (
              <>
                <Separator className="mb-4" />
                <ScrollArea className="h-[400px]">
                  <div className="space-y-2">
                    {favoriteItemsData.map((item) => (
                      <div
                        key={item.path}
                        className="flex items-center space-x-2 p-2 rounded-lg hover:bg-muted/50"
                      >
                        <Checkbox
                          id={item.path}
                          checked={selectedItems.includes(item.path)}
                          onCheckedChange={() => handleToggleItem(item.path)}
                        />
                        <label
                          htmlFor={item.path}
                          className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer flex-1"
                        >
                          {item.label}
                        </label>
                      </div>
                    ))}

                    {favoriteItemsData.length === 0 && (
                      <div className="text-center py-8 text-sm text-muted-foreground">
                        No favorites available. Pin some items first!
                      </div>
                    )}
                  </div>
                </ScrollArea>
              </>
            ) : (
              <div className="flex items-center justify-center h-[400px] text-sm text-muted-foreground">
                Select a group to manage its items
              </div>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
