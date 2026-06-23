import { useState, useEffect } from 'react';
import { useAuthStore } from '@/core/store/useAuthStore';
import { usersService } from '@/core/services';
import { useAlert } from '@/core/components/GlobalAlertProvider';
import { ChevronRight, ChevronLeft, Check, Eye, EyeOff } from 'lucide-react';
import './onboarding.css';
import { Loader, Input, Button } from '@/components/ui';

export function TeacherOnboardingPage() {
  const { user } = useAuthStore();
  const { showError } = useAlert();

  const [step, setStep] = useState(1);
  const totalSteps = 3;
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Step 1: Password
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Step 2: Datos Personales
  const [address, setAddress] = useState('');
  const [birthDate, setBirthDate] = useState(''); // Visual mask: DD/MM/YYYY

  // Step 3: Especialidades
  const [specialtiesList, setSpecialtiesList] = useState<{ id: string; name: string }[]>([]);
  const [selectedSpecialties, setSelectedSpecialties] = useState<string[]>([]);

  useEffect(() => {
    usersService
      .getSpecialties()
      .then(setSpecialtiesList)
      .catch((err) => console.error('Error fetching specialties:', err));
  }, []);

  const handleNext = async () => {
    if (step === 1) {
      if (newPassword.length < 6)
        return showError('La contraseña debe tener al menos 6 caracteres');
      if (newPassword !== confirmPassword) return showError('Las contraseñas no coinciden');

      setIsSubmitting(true);
      try {
        await usersService.updatePassword(newPassword);
      } catch (error: any) {
        showError(`Error al actualizar contraseña: ${error.message}`);
        setIsSubmitting(false);
        return;
      }
      setIsSubmitting(false);
    }
    if (step === 2) {
      if (!address.trim()) return showError('Completá tu dirección');
      if (birthDate.length !== 10)
        return showError('La fecha de nacimiento debe tener el formato DD/MM/YYYY');
    }
    setStep((s) => Math.min(s + 1, totalSteps));
  };

  const handlePrev = () => setStep((s) => Math.max(s - 1, 1));

  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let val = e.target.value.replace(/\D/g, '');
    if (val.length > 8) val = val.substring(0, 8);
    if (val.length > 4) {
      val = val.substring(0, 2) + '/' + val.substring(2, 4) + '/' + val.substring(4, 8);
    } else if (val.length > 2) {
      val = val.substring(0, 2) + '/' + val.substring(2, 4);
    }
    setBirthDate(val);
  };

  const toggleSpecialty = (id: string) => {
    if (selectedSpecialties.includes(id)) {
      setSelectedSpecialties(selectedSpecialties.filter((s) => s !== id));
    } else {
      setSelectedSpecialties([...selectedSpecialties, id]);
    }
  };

  const handleSubmit = async () => {
    if (selectedSpecialties.length === 0)
      return showError('Debés seleccionar al menos una especialidad');
    if (!user) return showError('No hay sesión activa');

    try {
      setIsSubmitting(true);
      // Transform DD/MM/YYYY to YYYY-MM-DD
      const [dd, mm, yyyy] = birthDate.split('/');
      const isoDate = `${yyyy}-${mm}-${dd}`;

      await usersService.saveTeacherOnboardingDetails(user.id, {
        address,
        birth_date: isoDate,
        specialties: selectedSpecialties
      });

      // Reload page to re-evaluate protection logic
      window.location.href = '/teacher/dashboard';
    } catch (error: any) {
      showError(error.message || 'Error guardando datos');
      setIsSubmitting(false);
    }
  };

  return (
    <div className="onboarding-container">
      <div className="onboarding-card">
        <div className="onboarding-header">
          <h1>Hola Profesora!</h1>
          <p>Completá tu perfil para empezar a dar clases</p>
        </div>

        <div className="progress-container">
          <div className="progress-bar" style={{ width: `${(step / totalSteps) * 100}%` }}></div>
        </div>

        <div className="step-indicator">
          <span>
            Paso {step} de {totalSteps}
          </span>
          <span>{Math.round((step / totalSteps) * 100)}% Completado</span>
        </div>

        <div className="onboarding-content">
          {step === 1 && (
            <div className="step-content fade-in">
              <h3>1. Cambiá tu Contraseña</h3>
              <p className="text-secondary" style={{ marginBottom: '1.5rem' }}>
                Por seguridad, debés cambiar la contraseña generada por el administrador.
              </p>

              <Input
                label="Nueva Contraseña"
                type={showNewPassword ? 'text' : 'password'}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Mínimo 6 caracteres"
                rightElement={
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    style={{
                      background: 'none',
                      border: 'none',
                      padding: 0,
                      cursor: 'pointer',
                      color: 'var(--text-secondary)'
                    }}
                  >
                    {showNewPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                }
              />
              <Input
                label="Confirmar Contraseña"
                type={showConfirmPassword ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                rightElement={
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    style={{
                      background: 'none',
                      border: 'none',
                      padding: 0,
                      cursor: 'pointer',
                      color: 'var(--text-secondary)'
                    }}
                  >
                    {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                }
              />
            </div>
          )}

          {step === 2 && (
            <div className="step-content fade-in">
              <h3>2. Datos Personales</h3>
              <Input
                label="Dirección"
                type="text"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="Ej: Av. San Martín 123"
              />
              <Input
                label="Fecha de Nacimiento (DD/MM/AAAA)"
                type="text"
                placeholder="Ej: 25/10/1990"
                value={birthDate}
                onChange={handleDateChange}
              />
            </div>
          )}

          {step === 3 && (
            <div className="step-content fade-in">
              <h3>3. Especialidades</h3>
              <p className="text-secondary" style={{ marginBottom: '1.5rem' }}>
                Seleccioná las disciplinas en las que podés dictar clases.
              </p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {specialtiesList.length === 0 ? (
                  <div style={{ padding: '2rem' }}>
                    <Loader text="Cargando especialidades..." size="medium" />
                  </div>
                ) : (
                  specialtiesList.map((s) => (
                    <label
                      key={s.id}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.75rem',
                        padding: '0.5rem',
                        background: 'var(--surface-color)',
                        borderRadius: '8px',
                        cursor: 'pointer'
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={selectedSpecialties.includes(s.id)}
                        onChange={() => toggleSpecialty(s.id)}
                        style={{ width: '20px', height: '20px' }}
                      />
                      <span>{s.name}</span>
                    </label>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        <div className="onboarding-footer">
          {step > 1 ? (
            <Button variant="secondary" onClick={handlePrev} disabled={isSubmitting}>
              <ChevronLeft size={20} /> Atrás
            </Button>
          ) : (
            <div></div>
          )}

          {step < totalSteps ? (
            <Button variant="primary" onClick={handleNext} loading={isSubmitting}>
              {isSubmitting ? (
                'Cargando...'
              ) : (
                <>
                  Siguiente <ChevronRight size={20} />
                </>
              )}
            </Button>
          ) : (
            <Button variant="primary" onClick={handleSubmit} loading={isSubmitting}>
              {isSubmitting ? 'Guardando...' : 'Finalizar Perfil'}{' '}
              <Check size={20} style={{ marginLeft: '0.5rem' }} />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
