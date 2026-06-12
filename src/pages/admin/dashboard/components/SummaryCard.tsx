import type { LucideIcon } from 'lucide-react';
import './summary-card.css';

interface SummaryCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: LucideIcon;
  iconColorClass?: string;
}

export function SummaryCard({ title, value, subtitle, icon: Icon, iconColorClass = 'text-primary' }: SummaryCardProps) {
  return (
    <div className="summary-card">
      <div className="summary-header">
        <h3 className="summary-title">{title}</h3>
        <Icon size={20} className={`summary-icon ${iconColorClass}`} />
      </div>
      <p className="summary-value">{value}</p>
      {subtitle && <p className="summary-subtitle">{subtitle}</p>}
    </div>
  );
}
