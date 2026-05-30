import { describe, it, expect } from 'vitest';

const modules = [
  '../components/Auth.jsx',
  '../components/Feed.jsx',
  '../components/Navbar.jsx',
  '../components/Sidebar.jsx',
  '../components/PostCreate.jsx',
  '../components/Comunidades.jsx',
  '../pages/HomePage.jsx',
  '../pages/ChatPage.jsx',
  '../pages/CommunitiesPage.jsx',
  '../pages/UserPage.jsx',
  '../pages/SettingsPage.jsx',
];

describe('Frontend module structure', () => {
  modules.forEach((path) => {
    it(`loads ${path}`, async () => {
      const module = await import(path);
      expect(module).toBeDefined();
    });
  });
});
