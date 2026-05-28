import { useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix default marker icons broken by bundlers
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
    iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

const driverIcon = new L.Icon({
    iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41],
});

const destinationIcon = new L.Icon({
    iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41],
});

// Moves the map view when the driver location changes
function PanToDriver({ position }) {
    const map = useMap();
    useEffect(() => {
        if (position) map.panTo(position, { animate: true });
    }, [position, map]);
    return null;
}

const STATUS_LABELS = {
    assigned: 'Driver Assigned',
    picked_up: 'Order Picked Up',
    on_the_way: 'On The Way',
    arrived: 'Driver Arrived',
    delivered: 'Delivered',
};

const STATUS_COLORS = {
    assigned: '#6c757d',
    picked_up: '#0d6efd',
    on_the_way: '#fd7e14',
    arrived: '#0dcaf0',
    delivered: '#198754',
};

export default function DeliveryMap({ delivery }) {
    const { currentLocation, locationHistory, status, driver, estimatedArrival, order } = delivery;

    const driverPos = currentLocation ? [currentLocation.lat, currentLocation.lng] : null;
    const routePath = locationHistory.map(p => [p.lat, p.lng]);
    const defaultCenter = driverPos || [-6.2088, 106.8456]; // Jakarta fallback

    return (
        <div style={{ fontFamily: 'sans-serif' }}>
            {/* Status bar */}
            <div
                style={{
                    padding: '12px 16px',
                    background: STATUS_COLORS[status] || '#6c757d',
                    color: '#fff',
                    borderRadius: '8px 8px 0 0',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                }}
            >
                <span style={{ fontWeight: 700, fontSize: '1rem' }}>
                    {STATUS_LABELS[status] || status}
                </span>
                {estimatedArrival && status !== 'delivered' && (
                    <span style={{ fontSize: '0.85rem' }}>
                        ETA: {new Date(estimatedArrival).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                )}
            </div>

            {/* Map */}
            <MapContainer
                center={defaultCenter}
                zoom={14}
                style={{ height: '420px', width: '100%' }}
                scrollWheelZoom={true}
            >
                <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />

                {/* Auto-pan to driver */}
                {driverPos && <PanToDriver position={driverPos} />}

                {/* Driver marker */}
                {driverPos && (
                    <Marker position={driverPos} icon={driverIcon}>
                        <Popup>
                            <strong>Driver: {driver?.name}</strong>
                            <br />
                            {driver?.phone}
                            <br />
                            <small>{currentLocation?.address || 'Current location'}</small>
                        </Popup>
                    </Marker>
                )}

                {/* Route trail */}
                {routePath.length > 1 && (
                    <Polyline positions={routePath} color="#0d6efd" weight={3} opacity={0.6} dashArray="6 4" />
                )}
            </MapContainer>

            {/* Info footer */}
            <div
                style={{
                    padding: '12px 16px',
                    background: '#f8f9fa',
                    borderRadius: '0 0 8px 8px',
                    display: 'flex',
                    gap: '24px',
                    fontSize: '0.875rem',
                    color: '#495057',
                }}
            >
                {driver && (
                    <div>
                        <div style={{ fontWeight: 600 }}>Driver</div>
                        <div>{driver.name}</div>
                        <div>{driver.phone}</div>
                    </div>
                )}
                {order?.deliveryAddress && (
                    <div>
                        <div style={{ fontWeight: 600 }}>Delivering to</div>
                        <div>{order.deliveryAddress}</div>
                    </div>
                )}
                {currentLocation?.address && (
                    <div>
                        <div style={{ fontWeight: 600 }}>Last seen</div>
                        <div>{currentLocation.address}</div>
                        <div style={{ color: '#adb5bd' }}>
                            {new Date(currentLocation.timestamp).toLocaleTimeString()}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
