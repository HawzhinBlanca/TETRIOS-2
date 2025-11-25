
import React from 'react';
import { render } from '@testing-library/react';
import '@testing-library/jest-dom';
import Cell from '../components/Cell';
import { MODIFIER_COLORS } from '../constants';

declare var describe: any;
declare var it: any;
declare var expect: any;

describe('Cell Component', () => {
  it('renders empty cell correctly', () => {
    const { container } = render(<Cell type={0} />);
    const cell = container.firstChild as HTMLElement;
    expect(cell).toHaveStyle('border: 1px solid rgba(255,255,255,0.03)');
  });

  it('renders filled tetromino cell', () => {
    const { container } = render(<Cell type="I" />);
    const cell = container.firstChild as HTMLElement;
    // Cyan for I piece
    expect(cell.style.boxShadow).toContain('rgb(6, 182, 212)');
  });

  it('renders ghost piece with distinct style', () => {
    const { container } = render(<Cell type="T" isGhost={true} ghostStyle="dashed" />);
    const cell = container.firstChild as HTMLElement;
    expect(cell.style.border).toContain('dashed');
    expect(cell.style.opacity).not.toBe('1');
  });

  it('renders modifiers (GEMS)', () => {
    const { container } = render(<Cell type={0} modifier={{ type: 'GEM' }} />);
    const cell = container.firstChild as HTMLElement;
    expect(cell.style.borderColor).toBe(MODIFIER_COLORS.GEM);
  });

  it('renders modifiers (BOMB with timer)', () => {
    const { getByText } = render(<Cell type={0} modifier={{ type: 'BOMB', timer: 5 }} />);
    expect(getByText('5')).toBeInTheDocument();
  });
});