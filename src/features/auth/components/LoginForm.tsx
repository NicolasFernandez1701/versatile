import { useState } from 'react';
import { authService } from '@/core/services';
import { isValidEmail, isError } from '@/core/utils/validation';

export function LoginForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!isValidEmail(email)) {
      setError('Ingresá un email válido.');
      return;
    }

    setLoading(true);

    try {
      await authService.login(email, password);
      // El store y el enrutador se enteran por el onAuthStateChange
    } catch (err) {
      const message = isError(err) && err.message ? err.message : 'Error al iniciar sesión';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form className="login-form" onSubmit={handleSubmit}>
      {error && <div className="error-message">{error}</div>}

      <div className="form-group">
        <label htmlFor="email">Email</label>
        <input
          id="email"
          type="email"
          value={email}
          onChange={(e) => {
            setEmail(e.target.value);
            if (error) setError('');
          }}
          required
        />
      </div>

      <div className="form-group">
        <label htmlFor="password">Contraseña</label>
        <input
          id="password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
      </div>

      <button type="submit" disabled={loading} className="btn-primary">
        {loading ? 'Ingresando...' : 'Iniciar Sesión'}
      </button>
    </form>
  );
}
