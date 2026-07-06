import { ChevronRight, ChevronLeft, Check, Upload, Eye, EyeOff } from 'lucide-react';
import { useStudentOnboarding } from '@/core/hooks/useStudentOnboarding';
import './onboarding.css';
import { Input } from '@/ui';

export function OnboardingPage() {
  const onboarding = useStudentOnboarding();
  const {
    step,
    totalSteps,
    isSubmitting,
    passwordStep,
    dateInput,
    documentId,
    setDocumentId,
    age,
    setAge,
    address,
    setAddress,
    occupation,
    setOccupation,
    emergencyName,
    setEmergencyName,
    emergencyPhone,
    setEmergencyPhone,
    chronicDiseases,
    setChronicDiseases,
    allergies,
    setAllergies,
    recentInjuries,
    setRecentInjuries,
    medications,
    setMedications,
    hasMedicalCert,
    setHasMedicalCert,
    setMedicalCertFile,
    currentlyActive,
    setCurrentlyActive,
    trainingExperience,
    setTrainingExperience,
    dailyActivity,
    setDailyActivity,
    objectives,
    handleObjectiveToggle,
    objectiveOptions,
    preferredSchedule,
    setPreferredSchedule,
    agreedData,
    setAgreedData,
    agreedMedical,
    setAgreedMedical,
    agreedRules,
    setAgreedRules,
    agreedImage,
    setAgreedImage,
    handleNext,
    handlePrev,
    handleSubmit,
  } = onboarding;

  const renderStep = () => {
    switch (step) {
      case 1:
        return (
          <div className="onboarding-section">
            <h2>Cambio de Contraseña</h2>
            <p className="section-desc">
              Por seguridad, debés cambiar la contraseña inicial asignada por la administración.
            </p>
            <Input
              label="Nueva Contraseña (mín. 6 caracteres)"
              type={passwordStep.showNewPassword ? 'text' : 'password'}
              value={passwordStep.newPassword}
              onChange={(e) => passwordStep.setNewPassword(e.target.value)}
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
        );
      case 2:
        return (
          <div className="onboarding-section">
            <h2>1. Datos Personales</h2>
            <p className="section-desc">
              Esta sección sirve para el registro administrativo, contacto y facturación.
            </p>
            <div className="grid-2">
              <div className="form-group">
                <label>Documento de Identidad (DNI/RUT/Pasaporte)</label>
                <input
                  type="text"
                  value={documentId}
                  onChange={(e) => setDocumentId(e.target.value)}
                />
              </div>
              <div className="form-group">
                <label>Fecha de Nacimiento (DD/MM/AAAA)</label>
                <input
                  type="text"
                  placeholder="Ej: 25/10/1990"
                  value={dateInput.value}
                  onChange={dateInput.handleChange}
                />
              </div>
              <div className="form-group">
                <label>Edad</label>
                <input type="number" value={age} onChange={(e) => setAge(e.target.value)} />
              </div>
              <div className="form-group">
                <label>Ocupación / Empresa</label>
                <input
                  type="text"
                  value={occupation}
                  onChange={(e) => setOccupation(e.target.value)}
                />
              </div>
            </div>
            <div className="form-group">
              <label>Dirección (Calle, Ciudad, Provincia/Estado)</label>
              <input type="text" value={address} onChange={(e) => setAddress(e.target.value)} />
            </div>
            <div className="grid-2">
              <div className="form-group">
                <label>Contacto de Emergencia (Nombre)</label>
                <input
                  type="text"
                  value={emergencyName}
                  onChange={(e) => setEmergencyName(e.target.value)}
                />
              </div>
              <div className="form-group">
                <label>Contacto de Emergencia (Teléfono)</label>
                <input
                  type="text"
                  value={emergencyPhone}
                  onChange={(e) => setEmergencyPhone(e.target.value)}
                />
              </div>
            </div>
          </div>
        );
      case 3:
        return (
          <div className="onboarding-section">
            <h2>2. Historial Médico y de Salud</h2>
            <p className="section-desc">
              Crucial para el diseño seguro de rutinas y prevención de lesiones.
            </p>
            <div className="form-group">
              <label>
                ¿Padece alguna enfermedad crónica? (Hipertensión, Diabetes, Asma, Epilepsia, etc.)
              </label>
              <input
                type="text"
                placeholder="Dejar vacío si no padece"
                value={chronicDiseases}
                onChange={(e) => setChronicDiseases(e.target.value)}
              />
            </div>
            <div className="form-group">
              <label>
                ¿Sufre de alergias? (A medicamentos, alimentos o materiales como el látex)
              </label>
              <input
                type="text"
                placeholder="Dejar vacío si no padece"
                value={allergies}
                onChange={(e) => setAllergies(e.target.value)}
              />
            </div>
            <div className="form-group">
              <label>
                ¿Tiene lesiones recientes o crónicas? (En articulaciones, espalda, rodillas, etc.)
              </label>
              <input
                type="text"
                placeholder="Dejar vacío si no padece"
                value={recentInjuries}
                onChange={(e) => setRecentInjuries(e.target.value)}
              />
            </div>
            <div className="form-group">
              <label>¿Toma medicamentos habitualmente? (Indicar cuáles)</label>
              <input
                type="text"
                placeholder="Dejar vacío si no toma"
                value={medications}
                onChange={(e) => setMedications(e.target.value)}
              />
            </div>
            <div className="form-group">
              <label>¿Cuenta con Certificado Médico de aptitud física?</label>
              <select
                value={hasMedicalCert}
                onChange={(e) => setHasMedicalCert(e.target.value as 'yes' | 'no')}
              >
                <option value="no">No</option>
                <option value="yes">Sí</option>
              </select>
            </div>
            {hasMedicalCert === 'yes' && (
              <div
                className="form-group file-upload"
                style={{
                  border: '2px dashed var(--border-color)',
                  padding: '1.5rem',
                  borderRadius: '8px',
                  textAlign: 'center',
                }}
              >
                <Upload size={32} style={{ color: 'var(--primary-color)', marginBottom: '1rem' }} />
                <p style={{ marginBottom: '1rem', color: 'var(--text-secondary)' }}>
                  Adjunte una foto o PDF de su certificado.
                </p>
                <input
                  type="file"
                  accept="image/*,.pdf"
                  onChange={(e) => setMedicalCertFile(e.target.files ? e.target.files[0] : null)}
                  style={{ margin: '0 auto' }}
                />
              </div>
            )}
          </div>
        );
      case 4:
        return (
          <div className="onboarding-section">
            <h2>3. Estilo de Vida y Actividad Física</h2>
            <p className="section-desc">
              Ayuda a los entrenadores a comprender el nivel de condición física inicial.
            </p>
            <div className="form-group checkbox-group" style={{ marginBottom: '1.5rem' }}>
              <label>
                <input
                  type="checkbox"
                  checked={currentlyActive}
                  onChange={(e) => setCurrentlyActive(e.target.checked)}
                />
                ¿Realiza actividad física actualmente?
              </label>
            </div>
            <div className="form-group">
              <label>¿Hace cuánto tiempo entrena regularmente?</label>
              <input
                type="text"
                placeholder="Ej: 6 meses, 2 años, nunca..."
                value={trainingExperience}
                onChange={(e) => setTrainingExperience(e.target.value)}
              />
            </div>
            <div className="form-group">
              <label>Ocupación laboral diaria</label>
              <select value={dailyActivity} onChange={(e) => setDailyActivity(e.target.value)}>
                <option value="">Seleccione una opción...</option>
                <option value="sentado">Mayormente sentado</option>
                <option value="de_pie">De pie / Movimiento moderado</option>
                <option value="cargas_pesadas">Levantando cargas pesadas / Muy activo</option>
              </select>
            </div>
          </div>
        );
      case 5:
        return (
          <div className="onboarding-section">
            <h2>4. Objetivos y Preferencias</h2>
            <p className="section-desc">
              Orientado a establecer metas estéticas, de salud o rendimiento.
            </p>
            <div className="form-group">
              <label style={{ marginBottom: '1rem', display: 'block' }}>
                ¿Cuál es su objetivo principal? (Puede elegir múltiples)
              </label>
              <div style={{ display: 'grid', gap: '0.75rem' }}>
                {objectiveOptions.map((obj) => (
                  <label
                    key={obj}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem',
                      cursor: 'pointer',
                      background: 'rgba(255,255,255,0.05)',
                      padding: '0.75rem',
                      borderRadius: '8px',
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={objectives.includes(obj)}
                      onChange={() => handleObjectiveToggle(obj)}
                    />
                    {obj}
                  </label>
                ))}
              </div>
            </div>
            <div className="form-group" style={{ marginTop: '1.5rem' }}>
              <label>Disponibilidad horaria preferida</label>
              <select
                value={preferredSchedule}
                onChange={(e) => setPreferredSchedule(e.target.value)}
              >
                <option value="">Seleccione turno...</option>
                <option value="mañana">Mañana</option>
                <option value="tarde">Tarde</option>
                <option value="noche">Noche</option>
              </select>
            </div>
          </div>
        );
      case 6:
        return (
          <div className="onboarding-section">
            <h2>5. Términos y Consentimiento Legal</h2>
            <p className="section-desc">
              Obligatorio para la protección de datos y aceptación de normas internas.
            </p>

            <div className="legal-box">
              <div className="checkbox-row">
                <input
                  type="checkbox"
                  id="agreedData"
                  checked={agreedData}
                  onChange={(e) => setAgreedData(e.target.checked)}
                />
                <label htmlFor="agreedData">
                  <strong>Cláusula de Protección de Datos:</strong> Acepto el tratamiento de mis
                  datos personales según la normativa vigente.
                </label>
              </div>
              <div className="checkbox-row">
                <input
                  type="checkbox"
                  id="agreedMedical"
                  checked={agreedMedical}
                  onChange={(e) => setAgreedMedical(e.target.checked)}
                />
                <label htmlFor="agreedMedical">
                  <strong>Exoneración de responsabilidad:</strong> Declaro que me encuentro
                  médicamente apto para el ejercicio y deslindo al gimnasio de cualquier lesión
                  derivada de su práctica.
                </label>
              </div>
              <div className="checkbox-row">
                <input
                  type="checkbox"
                  id="agreedRules"
                  checked={agreedRules}
                  onChange={(e) => setAgreedRules(e.target.checked)}
                />
                <label htmlFor="agreedRules">
                  <strong>Normas del establecimiento:</strong> Declaro conocer y aceptar el
                  reglamento del gimnasio (uso de toalla, calzado adecuado, respeto a los horarios y
                  cuidado de las instalaciones).
                </label>
              </div>
            </div>

            <div className="legal-box" style={{ borderColor: 'var(--primary-color)' }}>
              <div className="checkbox-row">
                <input
                  type="checkbox"
                  id="agreedImage"
                  checked={agreedImage}
                  onChange={(e) => setAgreedImage(e.target.checked)}
                />
                <label htmlFor="agreedImage">
                  <strong>Consentimiento de Imagen:</strong> Autorizo al gimnasio a utilizar
                  fotografías y/o videos en los que aparezca participando de las actividades para
                  fines de promoción y publicidad en sus redes sociales y página web.
                </label>
              </div>
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="onboarding-container">
      <div className="onboarding-card">
        <div className="onboarding-header">
          <h1>Completar Perfil</h1>
          <p>Para comenzar a usar Versatile, necesitamos conocerte mejor.</p>
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

        {renderStep()}

        <div className="onboarding-footer">
          {step > 1 ? (
            <button className="btn-secondary" onClick={handlePrev}>
              <ChevronLeft size={20} /> Atrás
            </button>
          ) : (
            <div></div> // Placeholder para mantener justify-content space-between
          )}

          {step < totalSteps ? (
            <button className="btn-primary" onClick={handleNext} disabled={isSubmitting}>
              {isSubmitting ? (
                'Cargando...'
              ) : (
                <>
                  Siguiente <ChevronRight size={20} />
                </>
              )}
            </button>
          ) : (
            <button className="btn-primary" onClick={handleSubmit} disabled={isSubmitting}>
              {isSubmitting ? 'Guardando...' : 'Finalizar y Entrar'}{' '}
              <Check size={20} style={{ marginLeft: '0.5rem' }} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
