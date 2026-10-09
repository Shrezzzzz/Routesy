import L from 'leaflet';
import { Marker, Popup } from 'react-leaflet';
import { StopStatus } from '../../types';

interface NumberedMarkerProps {
  position: [number, number];
  number: number;
  name: string;
  status?: StopStatus;
  selected?: boolean;
  onSelect?: () => void;
}

function getMarkerColor(status: StopStatus | undefined, selected: boolean): string {
  if (selected) return '#4f46e5'; // indigo-600
  switch (status) {
    case StopStatus.VISITED:
      return '#16a34a'; // green-600
    case StopStatus.SKIPPED:
      return '#d97706'; // amber-600
    case StopStatus.CURRENT:
      return '#dc2626'; // red-600
    default:
      return '#4f46e5'; // indigo-600 for pending/default
  }
}

function createNumberedIcon(
  num: number,
  status: StopStatus | undefined,
  selected: boolean
): L.DivIcon {
  const size = selected ? 36 : 30;
  const color = getMarkerColor(status, selected);
  const borderColor = selected ? '#fff' : 'rgba(255,255,255,0.8)';
  const borderWidth = selected ? 3 : 2;

  const html = `
    <div style="
      width: ${size}px;
      height: ${size}px;
      background-color: ${color};
      border: ${borderWidth}px solid ${borderColor};
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-family: Inter, system-ui, sans-serif;
      font-size: ${selected ? 13 : 11}px;
      font-weight: 600;
      color: white;
      box-shadow: 0 2px 6px rgba(0,0,0,0.3);
      transform: ${selected ? 'scale(1.1)' : 'scale(1)'};
      transition: transform 150ms;
    ">
      ${num}
    </div>
  `;

  return L.divIcon({
    html,
    className: '',
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
    popupAnchor: [0, -(size / 2)],
  });
}

export function NumberedMarker({
  position,
  number,
  name,
  status,
  selected = false,
  onSelect,
}: NumberedMarkerProps) {
  const icon = createNumberedIcon(number, status, selected);

  return (
    <Marker
      position={position}
      icon={icon}
      eventHandlers={{
        click: () => onSelect?.(),
      }}
    >
      <Popup>
        <div className="text-sm font-medium">
          <span className="text-slate-500 mr-1">#{number}</span>
          {name}
        </div>
      </Popup>
    </Marker>
  );
}
