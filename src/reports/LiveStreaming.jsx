import React, { useState, useRef, useEffect } from 'react';
import { makeStyles } from 'tss-react/mui';
import {
    Box,
    Typography,
    Switch,
    Badge,
    CircularProgress,
    Fade,
} from '@mui/material';
import PageLayout from '../common/components/PageLayout';
import ReportsMenu from './components/ReportsMenu';
import fetchOrThrow from '../common/util/fetchOrThrow';
import { useCatch } from '../reactHelper';

const useStyles = makeStyles()(() => ({
    root: {
        '--primary': '#6366f1',
        '--primary-hover': '#4f46e5',
        '--bg': '#ffffff',
        '--card-bg': '#f8fafc',
        '--border': '#e2e8f0',
        '--text': '#0f172a',
        '--text-muted': '#64748b',
        '--success': '#10b981',
        '--danger': '#ef4444',
        backgroundColor: 'var(--bg)',
        color: 'var(--text)',
        minHeight: '100%',
        display: 'flex',
        flexDirection: 'column',
        position: 'relative',
        '&::before': {
            content: '""',
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            background: 'radial-gradient(circle at 50% 50%, rgba(99, 102, 241, 0.15), transparent)',
            zIndex: 0,
            pointerEvents: 'none',
        },
    },
    header: {
        padding: '1.5rem 2rem',
        background: 'rgba(255, 255, 255, 0.8)',
        backdropFilter: 'blur(10px)',
        borderBottom: '1px solid var(--border)',
        position: 'sticky',
        top: 0,
        zIndex: 100,
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    title: {
        fontSize: '1.5rem',
        fontWeight: 700,
        letterSpacing: '-0.025em',
        background: 'linear-gradient(to right, #818cf8, #c084fc)',
        WebkitBackgroundClip: 'text',
        backgroundClip: 'text',
        WebkitTextFillColor: 'transparent',
    },
    container: {
        maxWidth: '1400px',
        margin: '2rem auto',
        padding: '0 2rem',
        width: '100%',
        flexGrow: 1,
        zIndex: 1,
    },
    controls: {
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: '1rem',
        marginBottom: '2rem',
    },
    channelCard: {
        background: '#ffffff',
        border: '1px solid #e2e8f0',
        borderRadius: '1.25rem',
        padding: '1.5rem',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        cursor: 'pointer',
        boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)',
        '&:hover': {
            borderColor: 'var(--primary)',
            transform: 'translateY(-2px)',
            boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
        },
        '&.active': {
            borderColor: 'var(--primary)',
            background: 'rgba(99, 102, 241, 0.04)',
            boxShadow: '0 10px 15px -3px rgba(99, 102, 241, 0.1)',
        },
    },
    channelInfo: {
        display: 'flex',
        flexDirection: 'column',
    },
    channelName: {
        fontWeight: 600,
        fontSize: '1rem',
    },
    channelStatus: {
        fontSize: '0.75rem',
        color: 'var(--text-muted)',
    },
    videoGrid: {
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(450px, 1fr))',
        gap: '1.5rem',
        marginTop: '1rem',
        '@media (max-width: 640px)': {
            gridTemplateColumns: '1fr',
        },
    },
    videoContainer: {
        background: 'var(--card-bg)',
        border: '1px solid var(--border)',
        borderRadius: '1.5rem',
        aspectRatio: '16/9',
        overflow: 'hidden',
        position: 'relative',
        display: 'flex',
        flexDirection: 'column',
        boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
    },
    videoHeader: {
        padding: '0.75rem 1.25rem',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        background: '#f1f5f9',
        borderBottom: '1px solid var(--border)',
        zIndex: 10,
    },
    videoTitle: {
        fontSize: '0.875rem',
        fontWeight: 600,
        display: 'flex',
        alignItems: 'center',
        gap: '0.5rem',
    },
    liveIndicator: {
        width: '8px',
        height: '8px',
        background: 'var(--danger)',
        borderRadius: '50%',
        boxShadow: '0 0 0 0 rgba(239, 68, 68, 0.7)',
        animation: 'pulse 2s infinite',
    },
    '@keyframes pulse': {
        '0%': {
            transform: 'scale(0.95)',
            boxShadow: '0 0 0 0 rgba(239, 68, 68, 0.7)',
        },
        '70%': {
            transform: 'scale(1)',
            boxShadow: '0 0 0 6px rgba(239, 68, 68, 0)',
        },
        '100%': {
            transform: 'scale(0.95)',
            boxShadow: '0 0 0 0 rgba(239, 68, 68, 0)',
        },
    },
    video: {
        width: '100%',
        height: '100%',
        objectFit: 'cover',
        background: '#000',
    },
    noVideo: {
        position: 'absolute',
        inset: 0,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        color: 'var(--text-muted)',
        gap: '1rem',
        zIndex: 5,
        background: 'rgba(255, 255, 255, 0.8)',
    },
    badge: {
        background: 'rgba(99, 102, 241, 0.2)',
        color: 'var(--primary)',
        padding: '2px 8px',
        borderRadius: '4px',
        fontSize: '0.7rem',
        fontWeight: 700,
        border: '1px solid rgba(99, 102, 241, 0.3)',
        textTransform: 'uppercase',
    },
    toastContainer: {
        position: 'fixed',
        bottom: '2rem',
        right: '2rem',
        zIndex: 1000,
    },
    toast: {
        background: 'rgba(255, 255, 255, 0.9)',
        border: '1px solid var(--border)',
        padding: '1rem 1.5rem',
        borderRadius: '0.75rem',
        marginTop: '0.5rem',
        backdropFilter: 'blur(10px)',
        display: 'flex',
        alignItems: 'center',
        gap: '0.75rem',
        boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
    },
}));

const API_URL = '/api/commands/send';
const DEVICE_ID = 17;
const RTC_SERVER_URL = "http://51.21.203.186:8080/291074436300";

const LiveStreaming = () => {
    const { classes, cx } = useStyles();
    const [channels, setChannels] = useState({
        1: { active: false, status: 'Disconnected', color: 'var(--text-muted)', loading: false },
        2: { active: false, status: 'Disconnected', color: 'var(--text-muted)', loading: false },
        3: { active: false, status: 'Disconnected', color: 'var(--text-muted)', loading: false },
        4: { active: false, status: 'Disconnected', color: 'var(--text-muted)', loading: false },
    });
    const [toasts, setToasts] = useState([]);
    const peerConnections = useRef({});
    const videoRefs = useRef({});

    useEffect(() => {
        return () => {
            Object.values(peerConnections.current).forEach((pc) => pc.close());
        };
    }, []);

    const showToast = (message, isError = false) => {
        const id = Date.now();
        setToasts((prev) => [...prev, { id, message, isError }]);
        setTimeout(() => {
            setToasts((prev) => prev.filter((t) => t.id !== id));
        }, 3000);
    };

    const sendCommand = async (channelId, type) => {
        const payload = {
            attributes: {
                channel: channelId,
                mediaType: 0,
                streamType: 0
            },
            deviceId: DEVICE_ID,
            type: type,
            textChannel: false,
            description: type === 'videoStart'
                ? `Start HD streaming at channel ${channelId}`
                : `Stop streaming at channel ${channelId}`
        };

        const response = await fetchOrThrow(API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
        });

        return await response.json();
    };

    const startWebRTC = async (id) => {
        try {
            let pc = new RTCPeerConnection(null);
            peerConnections.current[id] = pc;

            pc.addTransceiver("audio", { direction: "recvonly" });
            pc.addTransceiver("video", { direction: "recvonly" });

            let offer = await pc.createOffer();
            await pc.setLocalDescription(offer);

            const data = {
                type: "offer",
                sdp: offer.sdp,
            };

            var stream = new MediaStream();
            const videoElement = videoRefs.current[id];
            if (videoElement) {
                videoElement.srcObject = stream;
            }

            pc.ontrack = (event) => {
                stream.addTrack(event.track);
                setChannels(prev => ({
                    ...prev,
                    [id]: { ...prev[id], loading: false }
                }));
            };

            const res = await fetch(`${RTC_SERVER_URL}/${id}.rtc`, {
                method: 'POST',
                body: JSON.stringify(data),
                headers: { 'Content-Type': 'application/json' },
            });

            const responseData = await res.json();
            await pc.setRemoteDescription({ type: 'answer', sdp: responseData["sdp"] });

        } catch (err) {
            console.error(`WebRTC Error for channel ${id}:`, err);
            showToast(`Stream Error for Channel ${id}`, true);
            setChannels(prev => ({
                ...prev,
                [id]: { ...prev[id], status: 'Error', color: 'var(--danger)', loading: false }
            }));
        }
    };

    const stopWebRTC = (id) => {
        if (peerConnections.current[id]) {
            peerConnections.current[id].close();
            delete peerConnections.current[id];
        }
        const videoElement = videoRefs.current[id];
        if (videoElement) {
            videoElement.srcObject = null;
        }
    };

    const handleToggle = useCatch(async (id) => {
        const isActivating = !channels[id].active;

        setChannels((prev) => ({
            ...prev,
            [id]: {
                ...prev[id],
                active: isActivating,
                status: isActivating ? 'Connecting...' : 'Disconnected',
                color: isActivating ? 'var(--text-muted)' : 'var(--text-muted)',
                loading: isActivating
            },
        }));

        if (isActivating) {
            showToast(`Starting Channel ${id}...`);
            try {
                await sendCommand(id, 'videoStart');
                setChannels((prev) => ({
                    ...prev,
                    [id]: { ...prev[id], status: 'Streaming', color: 'var(--success)' },
                }));
                startWebRTC(id);
            } catch (error) {
                setChannels((prev) => ({
                    ...prev,
                    [id]: { ...prev[id], active: false, status: 'Error', color: 'var(--danger)', loading: false },
                }));
                throw error;
            }
        } else {
            showToast(`Stopping Channel ${id}...`);
            await sendCommand(id, 'videoStop');
            stopWebRTC(id);
        }
    });

    return (
        <PageLayout menu={<ReportsMenu />} breadcrumbs={['reportTitle', 'Live Streaming']}>
            <Box className={classes.root}>
                <Box className={classes.container}>
                    <Box className={classes.controls}>
                        {[1, 2, 3, 4].map((id) => (
                            <Box
                                key={id}
                                className={cx(classes.channelCard, { active: channels[id].active })}
                                onClick={() => handleToggle(id)}
                            >
                                <Box className={classes.channelInfo}>
                                    <Typography className={classes.channelName}>Channel {id}</Typography>
                                    <Typography className={classes.channelStatus} style={{ color: channels[id].color }}>
                                        {channels[id].status}
                                    </Typography>
                                </Box>
                                <Switch
                                    checked={channels[id].active}
                                    onClick={(e) => e.stopPropagation()}
                                    onChange={() => handleToggle(id)}
                                    sx={{
                                        '& .MuiSwitch-track': { border: '1px solid black' },
                                        '& .MuiSwitch-switchBase.Mui-checked': { color: 'var(--primary)' },
                                        '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': { backgroundColor: 'var(--primary)', border: '1px solid black' },
                                    }}
                                />
                            </Box>
                        ))}
                    </Box>

                    <Box className={classes.videoGrid}>
                        {[1, 2, 3, 4].map((id) => (
                            channels[id].active && (
                                <Fade in={channels[id].active} key={id}>
                                    <Box className={classes.videoContainer}>
                                        <Box className={classes.videoHeader}>
                                            <Box className={classes.videoTitle}>
                                                <Box className={classes.liveIndicator} />
                                                Channel {id} - Live
                                            </Box>
                                            <Box className={classes.badge}>HD</Box>
                                        </Box>
                                        <video
                                            ref={(el) => (videoRefs.current[id] = el)}
                                            className={classes.video}
                                            autoPlay
                                            muted
                                            playsInline
                                            controls
                                        />
                                        {channels[id].loading && (
                                            <Box className={classes.noVideo}>
                                                <CircularProgress size={40} sx={{ color: 'var(--primary)' }} />
                                                <Typography variant="body2">Initializing Stream...</Typography>
                                            </Box>
                                        )}
                                    </Box>
                                </Fade>
                            )
                        ))}
                    </Box>
                </Box>

                <Box className={classes.toastContainer}>
                    {toasts.map((toast) => (
                        <Fade in key={toast.id}>
                            <Box
                                className={classes.toast}
                                sx={{ borderLeft: `4px solid ${toast.isError ? 'var(--danger)' : 'var(--primary)'}` }}
                            >
                                <Box
                                    sx={{
                                        width: '8px',
                                        height: '8px',
                                        borderRadius: '50%',
                                        background: toast.isError ? 'var(--danger)' : 'var(--primary)',
                                    }}
                                />
                                <Typography variant="body2">{toast.message}</Typography>
                            </Box>
                        </Fade>
                    ))}
                </Box>
            </Box>
        </PageLayout>
    );
};

export default LiveStreaming;
