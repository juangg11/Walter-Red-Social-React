import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';
import Auth from '../components/Auth';
import request from '../api/client';

// Mock client request
vi.mock('../api/client', () => ({
  default: vi.fn(),
  getChatSocketUrl: vi.fn(),
}));

describe('Auth Component', () => {
  const mockOnLogin = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  it('renders landing page with correct options', () => {
    render(<Auth onLogin={mockOnLogin} />);
    expect(screen.getByText('Encuentra tu comunidad.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Comenzar ahora/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^Iniciar sesión$/i })).toBeInTheDocument();
  });

  it('opens and closes drawer for Ayuda and Contacto', () => {
    const { container } = render(<Auth onLogin={mockOnLogin} />);
    
    const ayudaBtn = screen.getByRole('button', { name: /Ayuda/i });
    fireEvent.click(ayudaBtn);
    expect(screen.getByText('Centro de Ayuda y Soporte')).toBeInTheDocument();

    const closeBtn = container.querySelector('button[class*="closeDrawerBtn"]');
    fireEvent.click(closeBtn);
    expect(screen.queryByText('Centro de Ayuda y Soporte')).not.toBeInTheDocument();
  });

  it('opens login modal and submits successfully', async () => {
    request.mockResolvedValueOnce({
      token: 'test.header.signature',
      user: { id: 'user-123', username: 'testuser', email: 'test@example.com' },
    });

    render(<Auth onLogin={mockOnLogin} />);
    
    // Open login modal
    const loginBtn = screen.getByRole('button', { name: 'Iniciar sesión' });
    fireEvent.click(loginBtn);

    expect(screen.getByRole('heading', { name: /Te damos la bienvenida/i })).toBeInTheDocument();

    // Fill credentials
    const emailInput = screen.getByPlaceholderText('Correo electrónico');
    const passwordInput = screen.getByPlaceholderText('Contraseña');

    fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
    fireEvent.change(passwordInput, { target: { value: 'password123' } });

    // Submit form
    const submitBtn = screen.getByRole('button', { name: 'Iniciar Sesión' });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(request).toHaveBeenCalledWith('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email: 'test@example.com', password: 'password123' }),
      });
      expect(localStorage.setItem).toHaveBeenCalledWith('token', 'test.header.signature');
      expect(mockOnLogin).toHaveBeenCalledWith({ id: 'user-123', username: 'testuser', email: 'test@example.com' });
    });
  });

  it('opens sign up modal and registers successfully', async () => {
    request.mockResolvedValueOnce({
      token: 'new.header.signature',
      user: { id: 'new-user', username: 'newuser', email: 'new@example.com' },
    });

    render(<Auth onLogin={mockOnLogin} />);
    
    // Open signup modal
    const startBtn = screen.getByRole('button', { name: /Comenzar ahora/i });
    fireEvent.click(startBtn);

    expect(screen.getByRole('heading', { name: /Crea tu cuenta en Walter/i })).toBeInTheDocument();

    // Fill credentials
    const userInput = screen.getByPlaceholderText('Nombre de usuario');
    const emailInput = screen.getByPlaceholderText('Correo electrónico');
    const passwordInput = screen.getByPlaceholderText('Contraseña');

    fireEvent.change(userInput, { target: { value: 'newuser' } });
    fireEvent.change(emailInput, { target: { value: 'new@example.com' } });
    fireEvent.change(passwordInput, { target: { value: 'newpass123' } });

    // Submit form
    const submitBtn = screen.getByRole('button', { name: 'Registrarse y Entrar' });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(request).toHaveBeenCalledWith('/auth/register', {
        method: 'POST',
        body: JSON.stringify({ email: 'new@example.com', password: 'newpass123', username: 'newuser' }),
      });
      expect(localStorage.setItem).toHaveBeenCalledWith('token', 'new.header.signature');
      expect(mockOnLogin).toHaveBeenCalledWith({ id: 'new-user', username: 'newuser', email: 'new@example.com' });
    });
  });

  it('shows error message if API fails', async () => {
    request.mockRejectedValueOnce(new Error('Credenciales incorrectas'));

    render(<Auth onLogin={mockOnLogin} />);
    
    fireEvent.click(screen.getByRole('button', { name: 'Iniciar sesión' }));
    
    fireEvent.change(screen.getByPlaceholderText('Correo electrónico'), { target: { value: 'wrong@example.com' } });
    fireEvent.change(screen.getByPlaceholderText('Contraseña'), { target: { value: 'wrong' } });
    
    fireEvent.click(screen.getByRole('button', { name: 'Iniciar Sesión' }));

    await waitFor(() => {
      expect(screen.getByText('Credenciales incorrectas')).toBeInTheDocument();
    });
  });
});

