import { describe, it, expect } from 'vitest';

describe('App Module', () => {
  it('exports a default component', async () => {
    const module = await import('../App.jsx');
    expect(module.default).toBeTypeOf('function');
  });
});

describe('Client Module', () => {
  it('exports request as a function', async () => {
    const { default: request } = await import('../api/client.js');
    expect(request).toBeTypeOf('function');
  });
});
