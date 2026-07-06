import { ChevronRight, ChevronLeft, Check, Eye, EyeOff } from 'lucide-react';
import { useTeacherOnboarding } from '@/core/hooks/useTeacherOnboarding';
import './onboarding.css';
import { Loader, Input, Button } from '@/components/ui';

export function TeacherOnboardingPage() {
  const onboarding = useTeacherOnboarding();
  const {
    step,
    totalSteps,
    isSubmitting,
    passwordStep,
    address,
    setAddress,
    dateInput,
    specialtiesList,
    selectedSpecialties,
    toggleSpecialty,
    handleNext,
    handlePrev,
    handleSubmit,
  } = onboarding;

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
                type={passwordStep.showNewPassword ? 'text' : 'password'}
                value={passwordStep.newPassword}
                onChange={(e) => passwordStep.setNewPassword(e.target.value)}
                placeholder="Mínimo 6 caracteres"
                rightElement={
                  <button
                    type="button"
                    onClick={passwordStep.toggleShowNewPassword}
                    style={{
                      background: 'none',
                      border: 'none',
                      padding: 0,
                      cursor: 'pointer',
                      color: 'var(--text-secondary)',
                    }}
                  >
                    {passwordStep.showNewPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                }
              />
              <Input
                label="Confirmar Contraseña"
                type={passwordStep.showConfirmPassword ? 'text' : 'password'}
                value={passwordStep.confirmPassword}
                onChange={(e) => passwordStep.setConfirmPassword(e.target.value)}
                rightElement={
                  <button
                    type="button"
                    onClick={passwordStep.toggleShowConfirmPassword}
                    style={{
                      background: 'none',
                      border: 'none',
                      padding: 0,
                      cursor: 'pointer',
                      color: 'var(--text-secondary)',
                    }}
                  >
                    {passwordStep.showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
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
                value={dateInput.value}
                onChange={dateInput.handleChange}
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
                        cursor: 'pointer',
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
