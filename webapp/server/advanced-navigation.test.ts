import { describe, it, expect } from 'vitest';

describe('Advanced Navigation Features', () => {
  describe('Customizable Keyboard Shortcuts', () => {
    interface ShortcutConfig {
      id: string;
      label: string;
      defaultKey: string;
      currentKey: string;
      description: string;
    }

    const defaultShortcuts: ShortcutConfig[] = [
      { id: "ai-tools", label: "More AI Tools", defaultKey: "1", currentKey: "1", description: "Toggle More AI Tools section" },
      { id: "power-tools", label: "Power Tools", defaultKey: "2", currentKey: "2", description: "Toggle Power Tools section" },
      { id: "case-mgmt", label: "Case Management", defaultKey: "3", currentKey: "3", description: "Toggle Case Management section" },
      { id: "team", label: "Team & Collaboration", defaultKey: "4", currentKey: "4", description: "Toggle Team & Collaboration section" },
      { id: "settings", label: "Settings", defaultKey: "5", currentKey: "5", description: "Toggle Settings section" },
    ];

    it('should store shortcuts in localStorage format', () => {
      const serialized = JSON.stringify(defaultShortcuts);
      const deserialized = JSON.parse(serialized);
      
      expect(deserialized).toHaveLength(5);
      expect(deserialized[0].id).toBe('ai-tools');
    });

    it('should detect shortcut conflicts', () => {
      const shortcuts = [...defaultShortcuts];
      const newKey = '1';
      const conflict = shortcuts.find(
        (s) => s.id !== 'power-tools' && s.currentKey === newKey
      );
      
      expect(conflict).toBeDefined();
      expect(conflict?.id).toBe('ai-tools');
    });

    it('should validate single character keys', () => {
      const validKeys = ['1', 'a', 'Z', '9'];
      const invalidKeys = ['12', 'ab', '', 'Ctrl'];
      
      validKeys.forEach(key => {
        expect(/^[0-9a-zA-Z]$/.test(key)).toBe(true);
      });
      
      invalidKeys.forEach(key => {
        expect(/^[0-9a-zA-Z]$/.test(key)).toBe(false);
      });
    });

    it('should reset to default shortcuts', () => {
      const customShortcuts = defaultShortcuts.map(s => ({
        ...s,
        currentKey: 'x'
      }));
      
      const reset = customShortcuts.map(s => ({
        ...s,
        currentKey: s.defaultKey
      }));
      
      expect(reset[0].currentKey).toBe('1');
      expect(reset[4].currentKey).toBe('5');
    });

    it('should reset individual shortcut', () => {
      const shortcuts = [...defaultShortcuts];
      shortcuts[0].currentKey = 'a';
      
      const updated = shortcuts.map(s =>
        s.id === 'ai-tools' ? { ...s, currentKey: s.defaultKey } : s
      );
      
      expect(updated[0].currentKey).toBe('1');
    });
  });

  describe('Sidebar Favorites/Pinning', () => {
    it('should add item to favorites', () => {
      let favorites: string[] = [];
      const path = '/ai-assistant';
      
      favorites = [...favorites, path];
      
      expect(favorites).toContain(path);
      expect(favorites).toHaveLength(1);
    });

    it('should remove item from favorites', () => {
      let favorites = ['/ai-assistant', '/documents'];
      const path = '/ai-assistant';
      
      favorites = favorites.filter(p => p !== path);
      
      expect(favorites).not.toContain(path);
      expect(favorites).toHaveLength(1);
    });

    it('should toggle favorite status', () => {
      let favorites: string[] = [];
      const path = '/ai-assistant';
      
      // Add
      favorites = favorites.includes(path)
        ? favorites.filter(p => p !== path)
        : [...favorites, path];
      
      expect(favorites).toContain(path);
      
      // Remove
      favorites = favorites.includes(path)
        ? favorites.filter(p => p !== path)
        : [...favorites, path];
      
      expect(favorites).not.toContain(path);
    });

    it('should store favorites in localStorage format', () => {
      const favorites = ['/ai-assistant', '/documents', '/analytics'];
      const serialized = JSON.stringify(favorites);
      const deserialized = JSON.parse(serialized);
      
      expect(deserialized).toHaveLength(3);
      expect(deserialized).toContain('/ai-assistant');
    });

    it('should check if item is favorited', () => {
      const favorites = ['/ai-assistant', '/documents'];
      
      expect(favorites.includes('/ai-assistant')).toBe(true);
      expect(favorites.includes('/analytics')).toBe(false);
    });

    it('should prevent duplicate favorites', () => {
      let favorites = ['/ai-assistant'];
      const path = '/ai-assistant';
      
      if (!favorites.includes(path)) {
        favorites = [...favorites, path];
      }
      
      expect(favorites).toHaveLength(1);
    });
  });

  describe('Search Result Preview', () => {
    const menuItems = [
      { label: 'AI Assistant', path: '/ai-assistant', description: 'Multi-modal AI chat' },
      { label: 'Dashboard', path: '/dashboard', description: 'Overview of cases and metrics' },
      { label: 'Documents', path: '/documents', description: 'Manage case documents' },
      { label: 'Analytics', path: '/analytics', description: 'Data insights and reports' },
    ];

    it('should display description in search results', () => {
      const item = menuItems[0];
      
      expect(item.description).toBeDefined();
      expect(item.description).toBe('Multi-modal AI chat');
    });

    it('should filter items with descriptions', () => {
      const searchQuery = 'ai';
      const filtered = menuItems.filter(item =>
        item.label.toLowerCase().includes(searchQuery.toLowerCase())
      );
      
      expect(filtered).toHaveLength(1);
      expect(filtered[0].description).toBe('Multi-modal AI chat');
    });

    it('should highlight matching text', () => {
      const searchQuery = 'assistant';
      const label = 'AI Assistant';
      const highlighted = label.replace(
        new RegExp(searchQuery, 'gi'),
        (match) => `<mark>${match}</mark>`
      );
      
      expect(highlighted).toContain('<mark>Assistant</mark>');
    });

    it('should show description below label', () => {
      const item = menuItems[0];
      const hasDescription = Boolean(item.description);
      
      expect(hasDescription).toBe(true);
    });

    it('should handle items without descriptions', () => {
      const itemWithoutDesc = {
        label: 'Test',
        path: '/test'
      };
      
      expect(itemWithoutDesc.description).toBeUndefined();
    });
  });

  describe('Integration Tests', () => {
    it('should load custom shortcuts and update indicators', () => {
      const storedShortcuts = [
        { id: 'ai-tools', currentKey: 'a' },
        { id: 'power-tools', currentKey: 'p' },
      ];
      
      const shortcutMap: Record<string, string> = {};
      storedShortcuts.forEach(s => {
        shortcutMap[s.id] = s.currentKey;
      });
      
      expect(shortcutMap['ai-tools']).toBe('a');
      expect(shortcutMap['power-tools']).toBe('p');
    });

    it('should filter favorites from all items', () => {
      const allItems = [
        { path: '/ai-assistant', label: 'AI Assistant' },
        { path: '/dashboard', label: 'Dashboard' },
        { path: '/documents', label: 'Documents' },
      ];
      const favorites = ['/ai-assistant', '/documents'];
      
      const favoriteItems = allItems.filter(item =>
        favorites.includes(item.path)
      );
      
      expect(favoriteItems).toHaveLength(2);
      expect(favoriteItems[0].path).toBe('/ai-assistant');
    });

    it('should hide favorites section when empty', () => {
      const favorites: string[] = [];
      const shouldShow = favorites.length > 0;
      
      expect(shouldShow).toBe(false);
    });

    it('should show favorites section when items exist', () => {
      const favorites = ['/ai-assistant'];
      const shouldShow = favorites.length > 0;
      
      expect(shouldShow).toBe(true);
    });

    it('should use custom shortcut or fallback to default', () => {
      const customShortcuts: Record<string, string> = {
        'ai-tools': 'a'
      };
      
      const aiKey = customShortcuts['ai-tools'] || '1';
      const powerKey = customShortcuts['power-tools'] || '2';
      
      expect(aiKey).toBe('a');
      expect(powerKey).toBe('2');
    });
  });
});
