import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './styles.css';
import './settings.css';
import './timeline.css';
import './strategy.css';
import './result-controls.css';
import './desktop.css';
class ErrorBoundary extends React.Component<{children:React.ReactNode},{error:boolean}>{
 state={error:false};
 static getDerivedStateFromError(){return {error:true};}
 componentDidCatch(error:Error){console.error('UI render failure',error);}
 render(){return this.state.error?<main className="fatal-error"><h1>Не удалось открыть интерфейс</h1><p>Сохранённые проекты находятся на сервере. Обновите страницу; при повторной ошибке проверьте совместимость API.</p><button type="button" onClick={()=>location.reload()}>Обновить страницу</button></main>:this.props.children;}
}
createRoot(document.getElementById('root')!).render(<ErrorBoundary><App/></ErrorBoundary>);
