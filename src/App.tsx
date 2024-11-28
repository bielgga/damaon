import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useGameStore } from './store/gameStore';
import { Notifications, useNotifications } from './components/Notifications';
import GameModeSelection from './components/GameModeSelection';
import GameLobby from './components/GameLobby';
import HomePage from './pages/HomePage';
import GameRoom from './pages/GameRoom';
import Layout from './components/Layout';

export default function App() {
  const { notifications, dismissNotification } = useNotifications();
  const { playerName } = useGameStore();

  return (
    <BrowserRouter>
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 text-white">
        <Notifications 
          notifications={notifications} 
          onDismiss={dismissNotification} 
        />
        
        <Routes>
          <Route path="/" element={<Layout />}>
            <Route index element={<HomePage />} />
            <Route path="modos" element={<GameModeSelection />} />
            <Route 
              path="salas" 
              element={
                playerName ? <GameLobby /> : <Navigate to="/" replace />
              } 
            />
            <Route 
              path="sala/:roomId" 
              element={
                playerName ? <GameRoom /> : <Navigate to="/" replace />
              } 
            />
          </Route>
        </Routes>
      </div>
    </BrowserRouter>
  );
}