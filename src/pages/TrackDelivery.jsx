import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import DeliveryMap from '../components/DeliveryMap';

const POLL_INTERVAL = 10000; // 10 seconds

export default function TrackDelivery() {
    const { orderId } = useParams();
    const [delivery, setDelivery] = useState(null);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(true);
    const [lastUpdated, setLastUpdated] = useState(null);

    const fetchDelivery = useCallback(async () => {
        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`/api/deliveries/order/${orderId}`, {
                headers: { Authorization: `Bearer ${token}` },
            });

            if (!res.ok) {
                const { message } = await res.json();
                throw new Error(message || 'Failed to fetch delivery');
            }

            const data = await res.json();
            setDelivery(data);
            setLastUpdated(new Date());
            setError('');
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }, [orderId]);

    useEffect(() => {
        fetchDelivery();
        const interval = setInterval(fetchDelivery, POLL_INTERVAL);
        return () => clearInterval(interval);
    }, [fetchDelivery]);

    if (loading) {
        return (
            <div style={styles.center}>
                <div style={styles.spinner} />
                <p>Loading delivery tracking...</p>
            </div>
        );
    }

    if (error) {
        return (
            <div style={styles.center}>
                <div style={styles.errorBox}>
                    <strong>Error:</strong> {error}
                    <br />
                    <button style={styles.retryBtn} onClick={fetchDelivery}>
                        Retry
                    </button>
                </div>
            </div>
        );
    }

    if (!delivery) return null;

    return (
        <div style={styles.page}>
            <div style={styles.card}>
                <div style={styles.header}>
                    <div>
                        <h2 style={styles.title}>Track Your Order</h2>
                        <p style={styles.subtitle}>Order #{orderId.slice(-8).toUpperCase()}</p>
                    </div>
                    {lastUpdated && (
                        <span style={styles.updated}>
                            Updated {lastUpdated.toLocaleTimeString()}
                        </span>
                    )}
                </div>

                <DeliveryMap delivery={delivery} />

                {delivery.status === 'delivered' && (
                    <div style={styles.deliveredBanner}>
                        Your order has been delivered!{' '}
                        {delivery.deliveredAt && (
                            <span>at {new Date(delivery.deliveredAt).toLocaleTimeString()}</span>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}

const styles = {
    page: {
        minHeight: '100vh',
        background: '#f0f2f5',
        display: 'flex',
        justifyContent: 'center',
        padding: '32px 16px',
    },
    card: {
        background: '#fff',
        borderRadius: '12px',
        boxShadow: '0 2px 12px rgba(0,0,0,0.1)',
        width: '100%',
        maxWidth: '780px',
        overflow: 'hidden',
        alignSelf: 'flex-start',
    },
    header: {
        padding: '20px 24px',
        borderBottom: '1px solid #e9ecef',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    title: { margin: 0, fontSize: '1.25rem', fontWeight: 700, color: '#212529' },
    subtitle: { margin: '4px 0 0', color: '#6c757d', fontSize: '0.875rem' },
    updated: { fontSize: '0.75rem', color: '#adb5bd' },
    center: {
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '12px',
    },
    spinner: {
        width: 36,
        height: 36,
        border: '4px solid #e9ecef',
        borderTop: '4px solid #0d6efd',
        borderRadius: '50%',
        animation: 'spin 1s linear infinite',
    },
    errorBox: {
        background: '#fff5f5',
        border: '1px solid #f5c6cb',
        borderRadius: '8px',
        padding: '20px 24px',
        color: '#721c24',
        textAlign: 'center',
    },
    retryBtn: {
        marginTop: '12px',
        padding: '8px 20px',
        background: '#0d6efd',
        color: '#fff',
        border: 'none',
        borderRadius: '6px',
        cursor: 'pointer',
    },
    deliveredBanner: {
        background: '#d1e7dd',
        color: '#0a3622',
        padding: '14px 24px',
        textAlign: 'center',
        fontWeight: 600,
    },
};
