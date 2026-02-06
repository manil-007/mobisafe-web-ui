import React, { useState, useRef, useEffect, useCallback } from 'react';
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
    Tabs,
    Tab,
    Tooltip,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import MicIcon from '@mui/icons-material/Mic';
import MicOffIcon from '@mui/icons-material/MicOff';
import VideocamIcon from '@mui/icons-material/Videocam';
import HistoryIcon from '@mui/icons-material/History';
import { makeStyles } from 'tss-react/mui';
import { useSelector } from 'react-redux';
import VideoPlaybackTab from './VideoPlaybackTab';

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
        backgroundColor: '#f8fafc',
        minHeight: 'calc(100vh - 112px)',
        overflow: 'auto',
    },
    tabContent: {
        marginTop: theme.spacing(2),
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
        boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)',
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
        background: '#1a1a2e',
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
        background: 'rgba(0, 0, 0, 0.5)',
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 10,
    },
    videoControls: {
        padding: '0.75rem 1.25rem',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        gap: '1rem',
        background: 'rgba(0, 0, 0, 0.5)',
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
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
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        zIndex: 5,
        gap: '1rem',
        color: '#fff',
    },
    liveIndicator: {
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        color: '#fff',
    },
    liveDot: {
        width: '8px',
        height: '8px',
        background: '#ef4444',
        borderRadius: '50%',
        animation: 'pulse 2s infinite',
    },
    micButton: {
        background: 'rgba(255, 255, 255, 0.2)',
        color: '#fff',
        '&:hover': {
            background: 'rgba(255, 255, 255, 0.3)',
        },
        '&.active': {
            background: '#ef4444',
            '&:hover': {
                background: '#dc2626',
            },
        },
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

const LiveStreamingDialog = ({ open, onClose, deviceId }) => {
    const { classes, cx } = useStyles();
    const [activeTab, setActiveTab] = useState(0);
    const [channels, setChannels] = useState({
        1: { active: false, status: 'Off', loading: false, talking: false },
        2: { active: false, status: 'Off', loading: false, talking: false },
        3: { active: false, status: 'Off', loading: false, talking: false },
        4: { active: false, status: 'Off', loading: false, talking: false },
    });
    
    const peerConnections = useRef({});
    const videoRefs = useRef({});
    const audioContextRef = useRef(null);
    const mediaStreamRef = useRef({});
    const talkWebSocketRef = useRef({});

    const device = useSelector((state) => state.devices.items[deviceId]);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            Object.values(peerConnections.current).forEach((pc) => pc?.close());
            Object.values(talkWebSocketRef.current).forEach((ws) => ws?.close());
            Object.values(mediaStreamRef.current).forEach((stream) => {
                stream?.getTracks().forEach((track) => track.stop());
            });
        };
    }, []);

    // Fetch stream URLs from backend
    const getStreamUrls = useCallback(async (channelId) => {
        try {
            const response = await fetch(`/api/video/live/${deviceId}/${channelId}`);
            if (!response.ok) throw new Error('Failed to get stream URLs');
            return await response.json();
        } catch (error) {
            console.error('Error fetching stream URLs:', error);
            return null;
        }
    }, [deviceId]);

    // Start WebRTC connection - connects directly to LKM, no start/stop commands
    const startWebRTC = useCallback(async (id) => {
        try {
            const streamInfo = await getStreamUrls(id);
            if (!streamInfo) throw new Error('Could not get stream info');

            const pc = new RTCPeerConnection(null);
            peerConnections.current[id] = pc;

            pc.addTransceiver('audio', { direction: 'recvonly' });
            pc.addTransceiver('video', { direction: 'recvonly' });

            const offer = await pc.createOffer();
            await pc.setLocalDescription(offer);

            const response = await fetch(streamInfo.webrtcUrl, {
                method: 'POST',
                body: JSON.stringify({ type: 'offer', sdp: offer.sdp }),
                headers: { 'Content-Type': 'application/json' },
            });

            if (!response.ok) throw new Error('WebRTC negotiation failed');

            const answerData = await response.json();
            await pc.setRemoteDescription({ type: 'answer', sdp: answerData.sdp });

            const stream = new MediaStream();
            const videoElement = videoRefs.current[id];
            if (videoElement) {
                videoElement.srcObject = stream;
            }

            pc.ontrack = (event) => {
                stream.addTrack(event.track);
                setChannels((prev) => ({
                    ...prev,
                    [id]: { ...prev[id], loading: false, status: 'Live' },
                }));
            };

            pc.oniceconnectionstatechange = () => {
                if (pc.iceConnectionState === 'disconnected' || pc.iceConnectionState === 'failed') {
                    setChannels((prev) => ({
                        ...prev,
                        [id]: { ...prev[id], status: 'Reconnecting...' },
                    }));
                }
            };
        } catch (err) {
            console.error(`WebRTC Error for channel ${id}:`, err);
            setChannels((prev) => ({
                ...prev,
                [id]: { ...prev[id], status: 'Connection Failed', loading: false },
            }));
        }
    }, [getStreamUrls]);

    // Stop WebRTC connection
    const stopWebRTC = useCallback((id) => {
        if (peerConnections.current[id]) {
            peerConnections.current[id].close();
            delete peerConnections.current[id];
        }
        const videoElement = videoRefs.current[id];
        if (videoElement) {
            videoElement.srcObject = null;
        }
    }, []);

    // Stop talk-back
    const stopTalking = useCallback((id) => {
        if (talkWebSocketRef.current[id]) {
            talkWebSocketRef.current[id].close();
            delete talkWebSocketRef.current[id];
        }
        if (mediaStreamRef.current[id]) {
            mediaStreamRef.current[id].getTracks().forEach((track) => track.stop());
            delete mediaStreamRef.current[id];
        }
        if (audioContextRef.current) {
            audioContextRef.current.close();
            audioContextRef.current = null;
        }
        setChannels((prev) => ({
            ...prev,
            [id]: { ...prev[id], talking: false },
        }));
    }, []);

    // Toggle channel stream
    const handleToggle = useCallback(async (id) => {
        const isActivating = !channels[id].active;

        setChannels((prev) => ({
            ...prev,
            [id]: {
                ...prev[id],
                active: isActivating,
                status: isActivating ? 'Connecting...' : 'Off',
                loading: isActivating,
            },
        }));

        if (isActivating) {
            await startWebRTC(id);
        } else {
            stopWebRTC(id);
            if (channels[id].talking) {
                stopTalking(id);
            }
        }
    }, [channels, startWebRTC, stopWebRTC, stopTalking]);

    // Start talk-back (microphone)
    const startTalking = useCallback(async (id) => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ 
                audio: {
                    sampleRate: 8000,
                    channelCount: 1,
                    echoCancellation: true,
                    noiseSuppression: true,
                }
            });
            mediaStreamRef.current[id] = stream;

            const response = await fetch(`/api/video/talk/${deviceId}/${id}`);
            if (!response.ok) throw new Error('Failed to get talk URL');
            const talkInfo = await response.json();

            const ws = new WebSocket(talkInfo.websocketUrl);
            talkWebSocketRef.current[id] = ws;

            ws.onopen = () => {
                console.log(`Talk WebSocket connected for channel ${id}`);
                
                audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)({
                    sampleRate: 8000,
                });
                
                const source = audioContextRef.current.createMediaStreamSource(stream);
                const processor = audioContextRef.current.createScriptProcessor(320, 1, 1);
                
                processor.onaudioprocess = (e) => {
                    if (ws.readyState === WebSocket.OPEN) {
                        const inputData = e.inputBuffer.getChannelData(0);
                        const pcmData = new Int8Array(inputData.length);
                        for (let i = 0; i < inputData.length; i++) {
                            pcmData[i] = Math.max(-128, Math.min(127, Math.round(inputData[i] * 127)));
                        }
                        ws.send(pcmData.buffer);
                    }
                };

                source.connect(processor);
                processor.connect(audioContextRef.current.destination);
            };

            ws.onerror = (error) => {
                console.error('Talk WebSocket error:', error);
                stopTalking(id);
            };

            setChannels((prev) => ({
                ...prev,
                [id]: { ...prev[id], talking: true },
            }));
        } catch (error) {
            console.error('Failed to start talking:', error);
            alert('Failed to access microphone. Please check permissions.');
        }
    }, [deviceId, stopTalking]);

    // Toggle talk
    const handleTalkToggle = useCallback((id) => {
        if (channels[id].talking) {
            stopTalking(id);
        } else {
            startTalking(id);
        }
    }, [channels, startTalking, stopTalking]);

    return (
        <Dialog fullScreen open={open} onClose={onClose} TransitionComponent={Transition}>
            <AppBar className={classes.appBar}>
                <Toolbar>
                    <IconButton edge="start" color="inherit" onClick={onClose} aria-label="close">
                        <CloseIcon />
                    </IconButton>
                    <Typography variant="h6" className={classes.title}>
                        Video - {device?.name || `Device ${deviceId}`}
                    </Typography>
                </Toolbar>
                <Tabs
                    value={activeTab}
                    onChange={(e, newValue) => setActiveTab(newValue)}
                    sx={{ px: 2, background: '#f8fafc' }}
                >
                    <Tab icon={<VideocamIcon />} label="Live" />
                    <Tab icon={<HistoryIcon />} label="Playback" />
                </Tabs>
            </AppBar>
            
            <Box className={classes.content}>
                {activeTab === 0 && (
                    <Box className={classes.tabContent}>
                        <Box className={classes.controls}>
                            {[1, 2, 3, 4].map((id) => (
                                <Box
                                    key={id}
                                    className={cx(classes.channelCard, { active: channels[id].active })}
                                    onClick={() => handleToggle(id)}
                                >
                                    <Box>
                                        <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                                            Channel {id}
                                        </Typography>
                                        <Typography variant="caption" color="textSecondary">
                                            {channels[id].status}
                                        </Typography>
                                    </Box>
                                    <Switch
                                        checked={channels[id].active}
                                        onClick={(e) => e.stopPropagation()}
                                        onChange={() => handleToggle(id)}
                                        sx={{
                                            '& .MuiSwitch-switchBase.Mui-checked': { color: '#6366f1' },
                                            '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': {
                                                backgroundColor: '#6366f1',
                                            },
                                        }}
                                    />
                                </Box>
                            ))}
                        </Box>

                        <Box className={classes.videoGrid}>
                            {[1, 2, 3, 4].map((id) =>
                                channels[id].active && (
                                    <Fade in={channels[id].active} key={id}>
                                        <Box className={classes.videoContainer}>
                                            <Box className={classes.videoHeader}>
                                                <Box className={classes.liveIndicator}>
                                                    <Box className={classes.liveDot} />
                                                    <Typography variant="body2" sx={{ fontWeight: 600 }}>
                                                        Channel {id}
                                                    </Typography>
                                                </Box>
                                                <Typography
                                                    variant="caption"
                                                    sx={{
                                                        background: 'rgba(99, 102, 241, 0.2)',
                                                        color: '#a5b4fc',
                                                        px: 1,
                                                        borderRadius: 1,
                                                        fontWeight: 700,
                                                    }}
                                                >
                                                    {channels[id].status}
                                                </Typography>
                                            </Box>

                                            <video
                                                ref={(el) => (videoRefs.current[id] = el)}
                                                className={classes.video}
                                                autoPlay
                                                muted
                                                playsInline
                                            />

                                            <Box className={classes.videoControls}>
                                                <Tooltip title={channels[id].talking ? 'Stop Talking' : 'Talk to Device'}>
                                                    <IconButton
                                                        className={cx(classes.micButton, { active: channels[id].talking })}
                                                        onClick={() => handleTalkToggle(id)}
                                                    >
                                                        {channels[id].talking ? <MicIcon /> : <MicOffIcon />}
                                                    </IconButton>
                                                </Tooltip>
                                            </Box>

                                            {channels[id].loading && (
                                                <Box className={classes.loadingOverlay}>
                                                    <CircularProgress size={40} sx={{ color: '#fff' }} />
                                                    <Typography variant="body2">Connecting...</Typography>
                                                </Box>
                                            )}
                                        </Box>
                                    </Fade>
                                )
                            )}
                        </Box>
                    </Box>
                )}

                {activeTab === 1 && (
                    <VideoPlaybackTab deviceId={deviceId} />
                )}
            </Box>
        </Dialog>
    );
};

export default LiveStreamingDialog;
