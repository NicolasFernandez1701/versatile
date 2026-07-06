import { User, Users, Tag, BookOpen, ClipboardCheck } from 'lucide-react';

interface OverflowMenuProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigate: (path: string) => void;
  currentPath: string;
}

const menuItems = [
  { label: 'Perfil', icon: User, path: '/admin/profile' },
  { label: 'Alumnos', icon: Users, path: '/admin/students' },
  { label: 'Planes', icon: Tag, path: '/admin/plans' },
  { label: 'Profesores', icon: BookOpen, path: '/admin/teachers' },
  { label: 'Matrículas', icon: ClipboardCheck, path: '/admin/enrollments' },
];

export function OverflowMenu({ isOpen, onClose, onNavigate, currentPath }: OverflowMenuProps) {
  if (!isOpen) return null;

  const isActive = (path: string) => {
    if (path === '/admin/profile') {
      return currentPath.startsWith('/admin/profile');
    }
    return currentPath.startsWith(path);
  };

  return (
    <>
      <div className={`overflow-overlay ${isOpen ? 'open' : ''}`} onClick={onClose} />
      <div className={`overflow-menu ${isOpen ? 'open' : ''}`}>
        <div className="overflow-handle" />
        <div className="overflow-grid">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.path);
            return (
              <button
                key={item.path}
                className={`overflow-item${active ? ' active' : ''}`}
                onClick={() => onNavigate(item.path)}
              >
                <Icon size={24} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </div>
      </div>
    </>
  );
}
