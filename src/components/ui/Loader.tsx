import './Loader.css';

interface LoaderProps {
  fullScreen?: boolean;
  text?: string;
  size?: 'small' | 'medium' | 'large';
}

export function Loader({ fullScreen = false, text = 'Cargando...', size = 'medium' }: LoaderProps) {
  return (
    <div className={`loader-container ${fullScreen ? 'fullscreen' : ''}`}>
      <div className={`spinner ${size}`}></div>
      {text && <p className="loader-text">{text}</p>}
    </div>
  );
}
