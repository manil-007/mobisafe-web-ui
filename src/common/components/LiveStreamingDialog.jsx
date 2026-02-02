import React, { useState, useRef, useEffect } from 'react';
import {
    Dialog,
    AppBar,
    Toolbar,
    IconButton,
    Typography,
    Slide,
    Box,
    Switch,
    CircularProgress,
    Fade,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import { makeStyles } from 'tss-react/mui';
import fetchOrThrow from '../util/fetchOrThrow';
import { useCatch } from '../../reactHelper';

const useStyles = makeStyles()((theme) => ({
    appBar: {
        position: 'relative',
        background: '#ffffff',
        color: '#0f172a',
        borderBottom: '1px solid #e2e8f0',
    },
    title: {
        marginLeft: theme.spacing(2),
        flex: 1,
        fontWeight: 700,
    },
    content: {
        padding: theme.spacing(4),
        backgroundColor: '#ffffff',
        minHeight: 'calc(100vh - 64px)',
        overflow: 'auto',
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
            borderColor: '#6366f1',
            transform: 'translateY(-2px)',
            boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
        },
        '&.active': {
            borderColor: '#6366f1',
            background: 'rgba(99, 102, 241, 0.04)',
        },
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
        background: '#f8fafc',
        border: '1px solid #e2e8f0',
        borderRadius: '1.5rem',
        aspectRatio: '16/9',
        overflow: 'hidden',
        position: 'relative',
        display: 'flex',
        flexDirection: 'column',
        boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
    },
    videoHeader: {
        padding: '0.75rem 1.25rem',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        background: '#f1f5f9',
        borderBottom: '1px solid #e2e8f0',
        zIndex: 10,
    },
    video: {
        width: '100%',
        height: '100%',
        objectFit: 'cover',
        background: '#000',
    },
    loadingOverlay: {
        position: 'absolute',
        inset: 0,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'rgba(255, 255, 255, 0.8)',
        zIndex: 5,
        gap: '1rem',
    },
    liveIndicator: {
        width: '8px',
        height: '8px',
        background: '#ef4444',
        borderRadius: '50%',
        marginRight: '8px',
        animation: 'pulse 2s infinite',
    },
    '@keyframes pulse': {
        '0%': { transform: 'scale(0.95)', boxShadow: '0 0 0 0 rgba(239, 68, 68, 0.7)' },
        '70%': { transform: 'scale(1)', boxShadow: '0 0 0 6px rgba(239, 68, 68, 0)' },
        '100%': { transform: 'scale(0.95)', boxShadow: '0 0 0 0 rgba(239, 68, 68, 0)' },
    },
}));

const Transition = React.forwardRef(function Transition(props, ref) {
    return <Slide direction="up" ref={ref} {...props} />;
});

const RTC_SERVER_BASE_URL = "http://51.21.203.186:8080/291074436300";

const LiveStreamingDialog = ({ open, onClose, deviceId }) => {
    const { classes, cx } = useStyles();
    const [channels, setChannels] = useState({
        1: { active: false, status: 'Disconnected', loading: false },
        2: { active: false, status: 'Disconnected', loading: false },
        3: { active: false, status: 'Disconnected', loading: false },
        4: { active: false, status: 'Disconnected', loading: false },
    });
    const peerConnections = useRef({});
    const videoRefs = useRef({});

    useEffect(() => {
        return () => {
            Object.values(peerConnections.current).forEach((pc) => pc.close());
        };
    }, []);

    const sendCommand = async (channelId, type) => {
        const payload = {
            attributes: {
                channel: channelId,
                mediaType: 0,
                streamType: 0,
            },
            deviceId,
            type,
            textChannel: false,
        };

        return fetchOrThrow('/api/commands/send', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
        });
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

            const res = await fetch(`${RTC_SERVER_BASE_URL}/${id}.rtc`, {
                method: 'POST',
                body: JSON.stringify(data),
                headers: { 'Content-Type': 'application/json' },
            });

            const responseData = await res.json();
            await pc.setRemoteDescription({ type: 'answer', sdp: responseData["sdp"] });

            var stream = new MediaStream();
            const videoElement = videoRefs.current[id];
            if (videoElement) {
                videoElement.srcObject = stream;
            }

            pc.ontrack = (event) => {
                stream.addTrack(event.track);
                setChannels(prev => ({
                    ...prev,
                    [id]: { ...prev[id], loading: false, status: 'Streaming' }
                }));
            };

        } catch (err) {
            console.error(`WebRTC Error for channel ${id}:`, err);
            setChannels(prev => ({
                ...prev,
                [id]: { ...prev[id], status: 'Error', loading: false }
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
                loading: isActivating
            },
        }));

        if (isActivating) {
            try {
                await sendCommand(id, 'videoStart');
                startWebRTC(id);
            } catch (error) {
                setChannels((prev) => ({
                    ...prev,
                    [id]: { ...prev[id], active: false, status: 'Error', loading: false },
                }));
                throw error;
            }
        } else {
            await sendCommand(id, 'videoStop');
            stopWebRTC(id);
        }
    });

    return (
        <Dialog fullScreen open={open} onClose={onClose} TransitionComponent={Transition}>
            <AppBar className={classes.appBar}>
                <Toolbar>
                    <IconButton edge="start" color="inherit" onClick={onClose} aria-label="close">
                        <CloseIcon />
                    </IconButton>
                    <Typography variant="h6" className={classes.title}>
                        Live Streaming - Device {deviceId}
                    </Typography>
                </Toolbar>
            </AppBar>
            <Box className={classes.content}>
                <Box className={classes.controls}>
                    {[1, 2, 3, 4].map((id) => (
                        <Box
                            key={id}
                            className={cx(classes.channelCard, { active: channels[id].active })}
                            onClick={() => handleToggle(id)}
                        >
                            <Box>
                                <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>Channel {id}</Typography>
                                <Typography variant="caption" color="textSecondary">{channels[id].status}</Typography>
                            </Box>
                            <Switch
                                checked={channels[id].active}
                                onChange={() => handleToggle(id)}
                                onClick={(e) => e.stopPropagation()}
                                sx={{
                                    '& .MuiSwitch-track': { border: '1px solid black' },
                                    '& .MuiSwitch-switchBase.Mui-checked': { color: '#6366f1' },
                                    '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': { backgroundColor: '#6366f1', border: '1px solid black' },
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
                                        <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                            <Box className={classes.liveIndicator} />
                                            <Typography variant="body2" sx={{ fontWeight: 600 }}>Channel {id} - Live</Typography>
                                        </Box>
                                        <Typography variant="caption" sx={{ background: 'rgba(99, 102, 241, 0.1)', color: '#6366f1', px: 1, borderRadius: 1, fontWeight: 700 }}>HD</Typography>
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
                                        <Box className={classes.loadingOverlay}>
                                            <CircularProgress size={40} />
                                            <Typography variant="body2">Initializing Stream...</Typography>
                                        </Box>
                                    )}
                                </Box>
                            </Fade>
                        )
                    ))}
                </Box>
            </Box>
        </Dialog>
    );
};

export default LiveStreamingDialog;
