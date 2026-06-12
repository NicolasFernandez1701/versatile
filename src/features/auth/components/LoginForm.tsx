import { useState } from 'react';
import { authService } from '@/core/services';

export function LoginForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    
    try {
      await authService.login(email, password);
      // El store y el enrutador se enteran por el onAuthStateChange
    } catch (err: any) {
      setError(err.message || 'Error al iniciar sesión');
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
          onChange={(e) => setEmail(e.target.value)}
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
