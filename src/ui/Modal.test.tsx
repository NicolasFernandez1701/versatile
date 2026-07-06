import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Modal } from './Modal';

describe('Modal', () => {
  it('isOpen=false renderiza null', () => {
    const { container } = render(
      <Modal isOpen={false} onClose={() => {}} title="Test">
        <p>Content</p>
      </Modal>
    );
    expect(container.innerHTML).toBe('');
  });

  it('isOpen=true renderiza título, children y botón cerrar', () => {
    render(
      <Modal isOpen={true} onClose={() => {}} title="Modal Title">
        <p>Modal Content</p>
      </Modal>
    );
    expect(screen.getByText('Modal Title')).toBeInTheDocument();
    expect(screen.getByText('Modal Content')).toBeInTheDocument();
    // El botón cerrar con el icono X de lucide-react
    expect(screen.getByRole('button')).toBeInTheDocument();
  });

  it('click en overlay llama onClose', () => {
    const onClose = vi.fn();
    render(
      <Modal isOpen={true} onClose={onClose} title="Test">
        <p>Content</p>
      </Modal>
    );
    const overlay = screen.getByText('Test').closest('.modal-overlay')!;
    fireEvent.click(overlay);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('click en contenido NO llama onClose (stopPropagation)', () => {
    const onClose = vi.fn();
    render(
      <Modal isOpen={true} onClose={onClose} title="Test">
        <p>Content</p>
      </Modal>
    );
    const content = screen.getByText('Content').closest('.modal-content')!;
    fireEvent.click(content);
    expect(onClose).not.toHaveBeenCalled();
  });

  it('maxWidth se aplica al style del modal-content', () => {
    render(
      <Modal isOpen={true} onClose={() => {}} title="Test" maxWidth="600px">
        <p>Content</p>
      </Modal>
    );
    const content = screen.getByText('Content').closest('.modal-content') as HTMLElement;
    expect(content.style.maxWidth).toBe('600px');
  });

  it('el h2 del título está presente con el texto correcto', () => {
    render(
      <Modal isOpen={true} onClose={() => {}} title="My Title">
        <p>Content</p>
      </Modal>
    );
    const heading = screen.getByRole('heading', { level: 2 });
    expect(heading).toHaveTextContent('My Title');
  });
});
