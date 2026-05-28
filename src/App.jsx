import { BrowserRouter, Routes, Route } from 'react-router-dom';
import TrackDelivery from './pages/TrackDelivery';
import './styles/styles.css';

function App() {
    return (
        <BrowserRouter>
            <Routes>
                <Route path="/track/:orderId" element={<TrackDelivery />} />
            </Routes>
        </BrowserRouter>
    );
}

export default App;
