import { User, CreditCard, ChevronRight, MessageCircle, Mail } from 'lucide-react';
import './student-card.css';

interface StudentCardProps {
  name: string;
  plan: string;
  status: 'Al Día' | 'Pendiente' | 'Vencido';
  phone?: string | null;
  email?: string | null;
  onPress: () => void;
}

export function StudentCard({ name, plan, status, phone, email, onPress }: StudentCardProps) {
  const getBadgeClass = () => {
    switch (status) {
      case 'Al Día': return 'badge-active';
      case 'Pendiente': return 'badge-pending';
      case 'Vencido': return 'badge-inactive';
      default: return 'badge-inactive';
    }
  };

  const handleWhatsApp = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!phone) return;
    const cleaned = phone.replace(/[^\d+]/g, '');
    window.open(`https://wa.me/${cleaned}`, '_blank');
  };

  const handleEmail = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!email) return;
    window.open(`mailto:${email}`, '_blank');
  };

  return (
    <div className="student-card" onClick={onPress}>
      <div className="student-card-top">
        <div className="student-card-left">
          <div className="student-avatar">
            <User className="text-secondary" size={24} />
          </div>
          <div className="student-info">
            <h3 className="student-name" title={name}>{name}</h3>
            <div className="student-plan-row">
              <CreditCard size={14} className="text-secondary" />
              <span className="student-plan-text" title={plan}>{plan}</span>
            </div>
          </div>
        </div>
        <div className="student-card-right">
          <div className={`status-badge ${getBadgeClass()}`}>
            {status}
          </div>
          <ChevronRight className="text-secondary" size={20} />
        </div>
      </div>

      {(phone || email) && (
        <div className="student-action-row">
          {phone && (
            <button className="contact-button btn-whatsapp" onClick={handleWhatsApp}>
              <MessageCircle size={16} />
              <span>WhatsApp</span>
            </button>
          )}
          {email && (
            <button className="contact-button btn-email" onClick={handleEmail}>
              <Mail size={16} />
              <span>Enviar Email</span>
            </button>
          )}
        </div>
      )}
    </div>
  );
}
