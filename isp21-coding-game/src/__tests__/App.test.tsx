import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import App from '../App';

beforeEach(() => {
  localStorage.clear();
});

const dismissTutorial = () => {
  fireEvent.click(screen.getByText('¡Entendido!'));
};

describe('App', () => {
  it('renderiza el título del nivel', () => {
    render(<App />);
    expect(screen.getByText(/ISP21: Primer Commit/)).toBeTruthy();
  });

  it('renderiza los botones de comandos', () => {
    render(<App />);
    dismissTutorial();
    const avanzarBtns = screen.getAllByText('Avanzar()');
    expect(avanzarBtns.length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('GirarIzq()')).toBeTruthy();
    expect(screen.getByText('GirarDer()')).toBeTruthy();
  });

  it('agrega comandos al hacer click', () => {
    render(<App />);
    dismissTutorial();
    const avanzarBtn = screen.getAllByText('Avanzar()')[0];
    fireEvent.click(avanzarBtn);
    fireEvent.click(avanzarBtn);
    expect(screen.getByText(/Comandos: 2\/10/)).toBeTruthy();
  });

  it('ejecuta comandos y muestra mensaje', async () => {
    render(<App />);
    dismissTutorial();
    const avanzarBtn = screen.getAllByText('Avanzar()')[0];
    fireEvent.click(avanzarBtn);
    fireEvent.click(screen.getByText('▶ Ejecutar'));
    expect(screen.getByText('Ejecutando código...')).toBeTruthy();
  });

  it('resetea el nivel', () => {
    render(<App />);
    dismissTutorial();
    const avanzarBtn = screen.getAllByText('Avanzar()')[0];
    fireEvent.click(avanzarBtn);
    fireEvent.click(avanzarBtn);
    fireEvent.click(avanzarBtn);
    fireEvent.click(screen.getByText('↻ Reset'));
    expect(screen.getByText(/Comandos: 0\/10/)).toBeTruthy();
  });

  it('abre selector de niveles', () => {
    render(<App />);
    dismissTutorial();
    fireEvent.click(screen.getByText(/📋 Niveles/));
    expect(screen.getByText('Seleccionar Nivel')).toBeTruthy();
  });

  it('muestra tutorial la primera vez', () => {
    render(<App />);
    expect(screen.getByText('¿Cómo jugar?')).toBeTruthy();
  });

  it('permite cerrar el tutorial', () => {
    render(<App />);
    dismissTutorial();
    expect(screen.queryByText('¿Cómo jugar?')).toBeNull();
  });
});
