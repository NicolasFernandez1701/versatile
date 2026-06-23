import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, UserPlus, Bookmark } from 'lucide-react';
import { useUsersStore } from '@/core/store/useUsersStore';
import { StudentCard } from './components/StudentCard';
import { StudentFormModal } from './components/StudentFormModal';
import './students.css'; // Will create this
import { Loader } from '@/components/ui';

export function StudentsPage() {
  const navigate = useNavigate();
  const { students, loading, fetchStudents } = useUsersStore();
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingStudentId, setEditingStudentId] = useState<string | null>(null);

  useEffect(() => {
    fetchStudents();
  }, [fetchStudents]);

  const getStatus = (expirationDate?: string | null, hasPlan?: boolean) => {
    if (!hasPlan) return 'Sin Plan';
    if (!expirationDate) return 'Pendiente';
    const today = new Date();
    const exp = new Date(expirationDate);
    if (exp < today) return 'Vencido';
    return 'Al Día';
  };

  const filteredStudents = students.filter(
    (s) =>
      s.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (s.email && s.email.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div
      className="students-page"
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: 'calc(100vh - 4rem)',
        overflow: 'hidden'
      }}
    >
      <div className="page-header">
        <div>
          <h1>Alumnos</h1>
          <p className="text-secondary" style={{ marginTop: '0.25rem', fontSize: '0.9rem' }}>
            Control de planes y pagos
          </p>
        </div>
        <button
          className="btn-primary"
          onClick={() => {
            setEditingStudentId(null);
            setIsModalOpen(true);
          }}
          title="Registrar Alumno"
        >
          <UserPlus size={20} />
          <span>Registrar Alumno</span>
        </button>
      </div>

      <div className="student-actions-row">
        <button
          className="btn-secondary"
          onClick={() => navigate('/admin/enrollments')} // Map to EnrollStudent
          style={{
            width: '100%',
            padding: '0.75rem',
            fontSize: '0.85rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
        >
          <Bookmark size={18} className="text-primary" style={{ marginRight: '0.5rem' }} />
          Inscribir Alumno a Clase
        </button>
      </div>

      <div className="search-container">
        <Search className="search-icon text-secondary" size={20} />
        <input
          className="search-input"
          type="text"
          placeholder="Buscar alumno..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      <div className="student-list-container" style={{ flex: 1, overflowY: 'auto' }}>
        {loading ? (
          <div style={{ padding: '2rem' }}>
            <Loader text="Cargando alumnos..." size="medium" />
          </div>
        ) : filteredStudents.length === 0 ? (
          <div className="empty-state">
            <p>No hay alumnos registrados.</p>
          </div>
        ) : (
          filteredStudents.map((item) => (
            <StudentCard
              key={item.id}
              name={item.full_name}
              plan={item.plans?.name || 'Sin Plan'}
              status={getStatus(item.plan_expiration_date, !!item.plan_id)}
              phone={item.phone}
              email={item.email}
              onPress={() => {
                setEditingStudentId(item.id);
                setIsModalOpen(true);
              }}
            />
          ))
        )}
      </div>

      <StudentFormModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        studentId={editingStudentId}
        onSuccess={() => {
          setIsModalOpen(false);
          fetchStudents();
        }}
      />
    </div>
  );
}
