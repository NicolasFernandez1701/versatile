import { useEffect, useState } from 'react';
import { UserPlus, Trash2 } from 'lucide-react';
import { useUsersStore } from '@/core/store/useUsersStore';
import { useAlert } from '@/core/components/GlobalAlertProvider';
import { enrollmentsService, classesService } from '@/core/services';
import { DataTable, type Column } from '@/components/ui/DataTable';
import { Button } from '@/components/ui/Button';
import { EnrollmentFormModal } from './components/EnrollmentFormModal';

export function EnrollmentsPage() {
  const { showError, showSuccess } = useAlert();
  const { fetchStudents } = useUsersStore();
  
  const [enrollments, setEnrollments] = useState<any[]>([]);
  const [classesList, setClassesList] = useState<any[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
    fetchStudents();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [eData, cData] = await Promise.all([
        enrollmentsService.getEnrollments(),
        classesService.getClasses()
      ]);
      setEnrollments(eData);
      setClassesList(cData);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm('¿Eliminar esta inscripción?')) {
      try {
        await enrollmentsService.unenrollStudent(id);
        showSuccess('Alumno desinscripto.');
        loadData();
      } catch (error) {
        showError('Error al desinscribir.');
      }
    }
  };

  const DAYS = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];

  const columns: Column<any>[] = [
    {
      key: 'date',
      header: 'Fecha de Inscripción',
      render: (e) => new Date(e.created_at).toLocaleDateString()
    },
    {
      key: 'student',
      header: 'Alumno',
      render: (e) => e.profiles?.full_name
    },
    {
      key: 'class',
      header: 'Clase Asignada',
      render: (e) => <span className="text-primary" style={{ fontWeight: 'bold' }}>{e.classes?.activity_name}</span>
    },
    {
      key: 'time',
      header: 'Día y Hora',
      render: (e) => `${DAYS[e.classes?.day_of_week || 0]} a las ${e.classes?.start_time?.substring(0, 5)}`
    },
    {
      key: 'actions',
      header: 'Acciones',
      render: (e) => (
        <Button variant="danger" onClick={() => handleDelete(e.id)}>
          <Trash2 size={18} />
        </Button>
      )
    }
  ];

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h1>Inscripciones (Matrículas)</h1>
          <p>Asigná alumnos a las clases respetando los cupos.</p>
        </div>
        <Button 
          variant="primary"
          onClick={() => setIsModalOpen(true)}
        >
          <UserPlus size={20} />
          <span>Nueva Inscripción</span>
        </Button>
      </div>

      <DataTable
        columns={columns}
        data={enrollments}
        loading={loading}
        keyExtractor={(e) => e.id}
        emptyMessage="No hay inscripciones."
      />

      <EnrollmentFormModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={loadData}
        classesList={classesList}
      />
    </div>
  );
}
