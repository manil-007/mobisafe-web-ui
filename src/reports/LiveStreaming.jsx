import React, { useState, useRef, useEffect, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { makeStyles } from 'tss-react/mui';
import {
    Box,
    Typography,
    Switch,
    Badge,
    CircularProgress,
    Fade,
    Autocomplete,
    TextField,
} from '@mui/material';
import PageLayout from '../common/components/PageLayout';
import ReportsMenu from './components/ReportsMenu';
import useReportStyles from './common/useReportStyles';
import fetchOrThrow from '../common/util/fetchOrThrow';
import { useCatch, useEffectAsync } from '../reactHelper';

const useStyles = makeStyles()((theme) => ({
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
        background: theme.palette.background.paper,
        border: `1px solid ${theme.palette.divider}`,
        borderRadius: '1.5rem',
        aspectRatio: '16/9',
        // overflow: 'hidden',
        position: 'relative',
        display: 'flex',
        flexDirection: 'column',
        boxShadow: theme.shadows[3],
    },
    videoHeader: {
        padding: '0.75rem 1.25rem',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        background: theme.palette.background.default,
        borderBottom: `1px solid ${theme.palette.divider}`,
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
        background: theme.palette.error.main,
        borderRadius: '50%',
        boxShadow: '0 0 0 0 rgba(239, 68, 68, 0.7)',
        animation: 'pulse 2s infinite',
    },
    '@keyframes pulse': {
        '0%': { transform: 'scale(0.95)', boxShadow: '0 0 0 0 rgba(239, 68, 68, 0.7)' },
        '70%': { transform: 'scale(1)', boxShadow: '0 0 0 6px rgba(239, 68, 68, 0)' },
        '100%': { transform: 'scale(0.95)', boxShadow: '0 0 0 0 rgba(239, 68, 68, 0)' },
    },
    video: {
        width: '100%',
        height: '100%',
        objectFit: 'contain',
        background: '#000',
    },
    noVideo: {
        position: 'absolute',
        inset: 0,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        color: theme.palette.text.secondary,
        gap: '1rem',
        zIndex: 5,
        background: 'rgba(255, 255, 255, 0.8)',
    },
    controls: {
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: '1rem',
        marginBottom: '2rem',
    },
    channelCard: {
        background: theme.palette.background.paper,
        border: `1px solid ${theme.palette.divider}`,
        borderRadius: '1.25rem',
        padding: '1rem',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        cursor: 'pointer',
        boxShadow: theme.shadows[1],
        '&:hover': {
            borderColor: theme.palette.primary.main,
            transform: 'translateY(-2px)',
            boxShadow: theme.shadows[4],
        },
        '&.active': {
            borderColor: theme.palette.primary.main,
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
        fontSize: '0.875rem',
    },
    channelStatus: {
        fontSize: '0.75rem',
    },
    badge: {
        background: 'rgba(99, 102, 241, 0.2)',
        color: theme.palette.primary.main,
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
        background: theme.palette.background.paper,
        border: `1px solid ${theme.palette.divider}`,
        padding: '1rem 1.5rem',
        borderRadius: '0.75rem',
        marginTop: '0.5rem',
        backdropFilter: 'blur(10px)',
        display: 'flex',
        alignItems: 'center',
        gap: '0.75rem',
        boxShadow: theme.shadows[6],
    },
    filterItem: {
        minWidth: 0,
        flex: `1 1 ${theme.dimensions.filterFormWidth}`,
    },
}));

const API_URL = '/api/commands/send';
const RTC_SERVER_BASE_URL = import.meta.env.VITE_RTC_SERVER_BASE_URL || "https://stream.driversaathi.com";

const LiveStreaming = () => {
    const { classes: reportClasses } = useReportStyles();
    const { classes, cx } = useStyles();
    const navigate = useNavigate();
    const { deviceId: paramDeviceId } = useParams();
    const [devices, setDevices] = useState([]);
    const [fetchingDevices, setFetchingDevices] = useState(true);
    const selectedDeviceId = useSelector((state) => state.devices.selectedId);
    const deviceId = paramDeviceId || selectedDeviceId;

    useEffectAsync(async () => {
        setFetchingDevices(true);
        try {
            const response = await fetchOrThrow('/api/devices');
            const allDevices = await response.json();
            setDevices(allDevices.filter((d) => d.model?.toUpperCase() === 'JT808'));
        } finally {
            setFetchingDevices(false);
        }
    }, []);

    const currentDevice = useMemo(() => devices.find((d) => d.id === parseInt(deviceId, 10)), [devices, deviceId]);
    const isUnknown = !currentDevice || currentDevice.status === 'unknown';

    const [channels, setChannels] = useState({
        1: { active: false, status: 'Disconnected', color: 'textSecondary', loading: false },
        2: { active: false, status: 'Disconnected', color: 'textSecondary', loading: false },
        3: { active: false, status: 'Disconnected', color: 'textSecondary', loading: false },
        4: { active: false, status: 'Disconnected', color: 'textSecondary', loading: false },
    });
    const [toasts, setToasts] = useState([]);
    const peerConnections = useRef({});
    const videoRefs = useRef({});
    const channelsRef = useRef(channels);

    useEffect(() => {
        channelsRef.current = channels;
    }, [channels]);

    // Route cleanup and initialization
    useEffect(() => {
        setChannels({
            1: { active: false, status: 'Disconnected', color: 'textSecondary', loading: false },
            2: { active: false, status: 'Disconnected', color: 'textSecondary', loading: false },
            3: { active: false, status: 'Disconnected', color: 'textSecondary', loading: false },
            4: { active: false, status: 'Disconnected', color: 'textSecondary', loading: false },
        });

        return () => {
            console.log('leave this route');
            if (deviceId) {
                [1, 2, 3, 4].forEach((id) => {
                    if (channelsRef.current[id].active) {
                        sendCommand(id, 'videoStop').catch(() => { });
                    }
                });
            }
            Object.values(peerConnections.current).forEach((pc) => {
                if (pc && pc.signalingState !== 'closed') pc.close();
            });
            peerConnections.current = {};
            Object.values(videoRefs.current).forEach(ref => {
                if (ref) ref.srcObject = null;
            });
        };
    }, [deviceId]);

    // Browser refresh/close alert (Window level)
    useEffect(() => {
        const handleBeforeUnload = (e) => {
            if (Object.values(channelsRef.current).some(c => c.active)) {
                e.preventDefault();
                e.returnValue = '';
            }
        };
        window.addEventListener('beforeunload', handleBeforeUnload);
        return () => window.removeEventListener('beforeunload', handleBeforeUnload);
    }, []);

    const showToast = (message, isError = false) => {
        const id = Date.now();
        setToasts((prev) => [...prev, { id, message, isError }]);
        setTimeout(() => {
            setToasts((prev) => prev.filter((t) => t.id !== id));
        }, 3000);
    };

    const sendCommand = async (channelId, type) => {
        if (!deviceId) return null;
        const payload = {
            attributes: {
                channel: channelId,
                mediaType: 0,
                streamType: 0
            },
            deviceId: parseInt(deviceId, 10),
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

            if (!currentDevice) {
                console.error('Streaming Error: currentDevice is undefined', { deviceId, devices });
                throw new Error('Device not found or not JT808');
            }
            const rtcUrl = `${RTC_SERVER_BASE_URL}/${currentDevice.uniqueId}/${id}.rtc`;
            console.log(`Starting WebRTC for ${currentDevice.name} at ${rtcUrl}`);
            const res = await fetch(rtcUrl, {
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
                [id]: { ...prev[id], status: 'Error', color: 'error.main', loading: false }
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
                color: 'textSecondary',
                loading: isActivating
            },
        }));

        if (isActivating) {
            showToast(`Starting Channel ${id}...`);
            try {
                await sendCommand(id, 'videoStart');
                setChannels((prev) => ({
                    ...prev,
                    [id]: { ...prev[id], status: 'Streaming', color: 'success.main' },
                }));
                startWebRTC(id);
            } catch (error) {
                setChannels((prev) => ({
                    ...prev,
                    [id]: { ...prev[id], active: false, status: 'Error', color: 'error.main', loading: false },
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
            <div className={reportClasses.container}>
                <div className={reportClasses.header}>
                    <div className={reportClasses.filter}>
                        <div className={classes.filterItem}>
                            <Autocomplete
                                options={devices}
                                loading={fetchingDevices}
                                getOptionLabel={(option) => `${option.name} (${option.model || 'Unknown'})`}
                                value={devices.find((d) => d.id === parseInt(deviceId, 10)) || null}
                                onChange={(_, newValue) => {
                                    if (newValue) {
                                        navigate(`/reports/live/${newValue.id}`);
                                    }
                                }}
                                renderInput={(params) => (
                                    <TextField
                                        {...params}
                                        label="Select Device for Streaming"
                                        variant="outlined"
                                        InputProps={{
                                            ...params.InputProps,
                                            endAdornment: (
                                                <React.Fragment>
                                                    {fetchingDevices ? <CircularProgress color="inherit" size={20} /> : null}
                                                    {params.InputProps.endAdornment}
                                                </React.Fragment>
                                            ),
                                        }}
                                    />
                                )}
                            />
                        </div>
                    </div>
                </div>
                <div className={reportClasses.containerMain} style={{ padding: '0 2rem 2rem' }}>
                    {fetchingDevices && (
                        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
                            <CircularProgress />
                        </Box>
                    )}
                    {!fetchingDevices && devices.length === 0 && (
                        <Typography variant="h6" align="center" sx={{ mt: 4, color: 'textSecondary' }}>
                            No JT808 devices found in your account.
                        </Typography>
                    )}
                    {!fetchingDevices && devices.length > 0 && !deviceId && (
                        <Typography variant="h6" align="center" sx={{ mt: 4, color: 'textSecondary' }}>
                            Please select a device to start live streaming
                        </Typography>
                    )}
                    {!fetchingDevices && deviceId && (
                        <>
                            {isUnknown && (
                                <Box sx={{ mb: 3, p: 2, background: '#fff4f4', border: '1px solid #ffcdd2', borderRadius: '1rem', color: '#d32f2f', fontWeight: 500, textAlign: 'center' }}>
                                    Streaming is disabled because this device is currently offline or its status is unknown.
                                </Box>
                            )}
                            <Box className={classes.controls} sx={{ mt: 2, opacity: isUnknown ? 0.6 : 1 }}>
                                {[1, 2, 3, 4].map((id) => (
                                    <Box
                                        key={id}
                                        className={cx(classes.channelCard, { active: channels[id].active })}
                                        onClick={() => handleToggle(id)}
                                    >
                                        <Box className={classes.channelInfo}>
                                            <Typography className={classes.channelName}>Channel {id}</Typography>
                                            <Typography className={classes.channelStatus} sx={{ color: channels[id].color }}>
                                                {channels[id].status}
                                            </Typography>
                                        </Box>
                                        <Switch
                                            checked={channels[id].active}
                                            disabled={isUnknown}
                                            onClick={(e) => e.stopPropagation()}
                                            onChange={() => handleToggle(id)}
                                            sx={{
                                                '& .MuiSwitch-track': { border: '1px solid black' },
                                                '& .MuiSwitch-switchBase.Mui-disabled + .MuiSwitch-track': { backgroundColor: '#e0e0e0', border: '1px solid #bdbdbd' },
                                                '& .MuiSwitch-switchBase.Mui-checked': { color: 'primary.main' },
                                                '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': { backgroundColor: 'primary.main', border: '1px solid black' },
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
                                                        <CircularProgress size={40} />
                                                        <Typography variant="body2">Initializing Stream...</Typography>
                                                    </Box>
                                                )}
                                            </Box>
                                        </Fade>
                                    )
                                ))}
                            </Box>
                        </>
                    )}
                </div>
                <Box className={classes.toastContainer}>
                    {toasts.map((toast) => (
                        <Fade in key={toast.id}>
                            <Box
                                className={classes.toast}
                                sx={{ borderLeft: (theme) => `4px solid ${toast.isError ? theme.palette.error.main : theme.palette.primary.main}` }}
                            >
                                <Box
                                    sx={{
                                        width: '8px',
                                        height: '8px',
                                        borderRadius: '50%',
                                        background: (theme) => toast.isError ? theme.palette.error.main : theme.palette.primary.main,
                                    }}
                                />
                                <Typography variant="body2">{toast.message}</Typography>
                            </Box>
                        </Fade>
                    ))}
                </Box>
            </div>
        </PageLayout>
    );
};

export default LiveStreaming;
