import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { TripCard } from '../components/trip/TripCard';
import { ProgressBar } from '../components/ui/ProgressBar';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import type { Trip } from '../types';
import { MemoryRouter } from 'react-router-dom';

// Minimal trip fixture
const mockTrip: Trip = {
  id: 'trip-1',
  name: 'Durga Puja 2024',
  travelMode: 'driving',
  routeMode: 'manual',
  isPublic: false,
  createdAt: '2024-10-09T00:00:00.000Z',
  updatedAt: '2024-10-09T12:00:00.000Z',
  stops: [
    {
      id: 'stop-1',
      tripId: 'trip-1',
      name: 'College Square',
      latitude: 22.57,
      longitude: 88.36,
      sequence: 1,
      skipped: false,
      createdAt: '2024-10-09T00:00:00.000Z',
      updatedAt: '2024-10-09T00:00:00.000Z',
    },
    {
      id: 'stop-2',
      tripId: 'trip-1',
      name: 'Kumartuli',
      latitude: 22.6,
      longitude: 88.35,
      sequence: 2,
      skipped: false,
      createdAt: '2024-10-09T00:00:00.000Z',
      updatedAt: '2024-10-09T00:00:00.000Z',
    },
  ],
};

// TripCard tests
describe('TripCard', () => {
  it('renders trip name', () => {
    render(
      <MemoryRouter>
        <TripCard
          trip={mockTrip}
          onOpen={vi.fn()}
          onDuplicate={vi.fn()}
          onRename={vi.fn()}
          onDelete={vi.fn()}
        />
      </MemoryRouter>
    );
    expect(screen.getByText('Durga Puja 2024')).toBeInTheDocument();
  });

  it('renders correct stop count', () => {
    render(
      <MemoryRouter>
        <TripCard
          trip={mockTrip}
          onOpen={vi.fn()}
          onDuplicate={vi.fn()}
          onRename={vi.fn()}
          onDelete={vi.fn()}
        />
      </MemoryRouter>
    );
    expect(screen.getByText('2 stops')).toBeInTheDocument();
  });

  it('renders action buttons', () => {
    render(
      <MemoryRouter>
        <TripCard
          trip={mockTrip}
          onOpen={vi.fn()}
          onDuplicate={vi.fn()}
          onRename={vi.fn()}
          onDelete={vi.fn()}
        />
      </MemoryRouter>
    );
    expect(screen.getByText('Open')).toBeInTheDocument();
    expect(screen.getByText('Duplicate')).toBeInTheDocument();
  });
});

// ProgressBar tests
describe('ProgressBar', () => {
  it('renders with correct width percentage', () => {
    render(<ProgressBar value={60} label="Progress" />);
    const bar = screen.getByRole('progressbar');
    expect(bar).toBeInTheDocument();
    // Check aria values
    expect(bar).toHaveAttribute('aria-valuenow', '60');
    expect(bar).toHaveAttribute('aria-valuemin', '0');
    expect(bar).toHaveAttribute('aria-valuemax', '100');
  });

  it('clamps value to 0-100', () => {
    render(<ProgressBar value={150} />);
    const bar = screen.getByRole('progressbar');
    expect(bar).toHaveAttribute('aria-valuenow', '100');
  });

  it('shows label when provided', () => {
    render(<ProgressBar value={40} label="Trip progress" />);
    expect(screen.getByText('Trip progress')).toBeInTheDocument();
  });
});

// Button tests
describe('Button', () => {
  it('renders children', () => {
    render(<Button>Click me</Button>);
    expect(screen.getByText('Click me')).toBeInTheDocument();
  });

  it('renders loading spinner when loading=true', () => {
    const { container } = render(<Button loading>Loading</Button>);
    // The Loader2 icon has animate-spin class
    const spinner = container.querySelector('.animate-spin');
    expect(spinner).toBeInTheDocument();
  });

  it('is disabled when loading', () => {
    render(<Button loading>Loading</Button>);
    expect(screen.getByRole('button')).toBeDisabled();
  });

  it('renders as primary variant by default', () => {
    const { container } = render(<Button>Primary</Button>);
    const button = container.querySelector('button');
    expect(button?.className).toContain('bg-indigo-600');
  });

  it('renders danger variant', () => {
    const { container } = render(<Button variant="danger">Delete</Button>);
    const button = container.querySelector('button');
    expect(button?.className).toContain('bg-red-600');
  });
});

// Badge tests
describe('Badge', () => {
  it('renders children', () => {
    render(<Badge>Visited</Badge>);
    expect(screen.getByText('Visited')).toBeInTheDocument();
  });

  it('renders pending variant with slate classes', () => {
    const { container } = render(<Badge variant="pending">Pending</Badge>);
    const badge = container.querySelector('span');
    expect(badge?.className).toContain('bg-slate-100');
  });

  it('renders visited variant with green classes', () => {
    const { container } = render(<Badge variant="visited">Visited</Badge>);
    const badge = container.querySelector('span');
    expect(badge?.className).toContain('bg-green-100');
  });

  it('renders current variant with indigo classes', () => {
    const { container } = render(<Badge variant="current">Current</Badge>);
    const badge = container.querySelector('span');
    expect(badge?.className).toContain('bg-indigo-100');
  });

  it('renders skipped variant with amber classes', () => {
    const { container } = render(<Badge variant="skipped">Skipped</Badge>);
    const badge = container.querySelector('span');
    expect(badge?.className).toContain('bg-amber-100');
  });

  it('renders error variant with red classes', () => {
    const { container } = render(<Badge variant="error">Error</Badge>);
    const badge = container.querySelector('span');
    expect(badge?.className).toContain('bg-red-100');
  });
});
