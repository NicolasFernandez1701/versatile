import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/core/store/useAuthStore';
import { ShieldCheck, GraduationCap, Users, ChevronDown } from 'lucide-react';
import type { Role } from '@/core/types/auth.types';
import './ProfileSwitcher.css';

const roleLabels: Record<Role, string> = {
  admin: 'Administrador',
  teacher: 'Profesor',
  student: 'Alumno',
};

const roleIcons: Record<Role, typeof ShieldCheck> = {
  admin: ShieldCheck,
  teacher: GraduationCap,
  student: Users,
};

const roleDashboard: Record<Role, string> = {
  admin: '/admin',
  teacher: '/teacher/dashboard',
  student: '/student/dashboard',
};

export function ProfileSwitcher() {
  const { memberships, activeRole, setActiveRole } = useAuthStore();
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);

  if (memberships.length <= 1) {
    return null;
  }

  const activeMembership = memberships.find((membership) => membership.role === activeRole) ?? memberships[0];
  const ActiveIcon = roleIcons[activeMembership.role];

  const handleSelect = (role: Role) => {
    setActiveRole(role);
    setIsOpen(false);
    navigate(roleDashboard[role]);
  };

  return (
    <div className="profile-switcher">
      <button
        type="button"
        className="profile-switcher-trigger"
        onClick={() => setIsOpen((prev) => !prev)}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
      >
        <ActiveIcon size={18} aria-hidden="true" />
        <span className="profile-switcher-role">{roleLabels[activeMembership.role]}</span>
        <ChevronDown size={16} className={`profile-switcher-chevron ${isOpen ? 'open' : ''}`} aria-hidden="true" />
      </button>

      {isOpen && (
        <ul className="profile-switcher-dropdown" role="listbox">
          {memberships.map((membership) => {
            const Icon = roleIcons[membership.role];
            const isActive = membership.role === activeRole;

            return (
              <li
                key={membership.role}
                role="option"
                aria-selected={isActive}
                aria-label={roleLabels[membership.role]}
              >
                <button
                  type="button"
                  className={`profile-switcher-option ${isActive ? 'active' : ''}`}
                  onClick={() => handleSelect(membership.role)}
                >
                  <Icon size={18} aria-hidden="true" />
                  <span>{roleLabels[membership.role]}</span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
