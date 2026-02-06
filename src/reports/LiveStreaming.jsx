import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { makeStyles } from 'tss-react/mui';
import {
    Box,
    Typography,
    Switch,
    CircularProgress,
    Fade,
    Autocomplete,
    TextField,
    IconButton,
    Tooltip,
    Paper,
} from '@mui/material';
import MicIcon from '@mui/icons-material/Mic';
import MicOffIcon from '@mui/icons-material/MicOff';
import VolumeUpIcon from '@mui/icons-material/VolumeUp';
import VolumeOffIcon from '@mui/icons-material/VolumeOff';
import FullscreenIcon from '@mui/icons-material/Fullscreen';
import PageLayout from '../common/components/PageLayout';
import ReportsMenu from './components/ReportsMenu';
import useReportStyles from './common/useReportStyles';
import { useEffectAsync } from '../reactHelper';
import { useTranslation } from '../common/components/LocalizationProvider';

const useStyles = makeStyles()((theme) => ({
    container: {
        display: 'flex',
        flexDirection: 'column',
        gap: theme.spacing(3),
    },
    controlsRow: {
        display: 'flex',
        flexWrap: 'wrap',
        gap: theme.spacing(2),
        alignItems: 'center',
    },
    channelToggles: {
        display: 'flex',
        gap: theme.spacing(2),
        flexWrap: 'wrap',
    },
    channelCard: {
        display: 'flex',
        alignItems: 'center',
        gap: theme.spacing(1),
        padding: theme.spacing(1, 2),
        background: theme.palette.background.paper,
        border: `1px solid ${theme.palette.divider}`,
        borderRadius: theme.spacing(1),
        cursor: 'pointer',
        transition: 'all 0.2s',
        '&:hover': {
            borderColor: theme.palette.primary.main,
            background: theme.palette.action.hover,
        },
        '&.active': {
            borderColor: theme.palette.primary.main,
            background: theme.palette.primary.main + '10',
        },
    },
    videoGrid: {
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(450px, 1fr))',
        gap: theme.spacing(3),
        '@media (max-width: 640px)': {
            gridTemplateColumns: '1fr',
        },
    },
    videoContainer: {
        background: '#1a1a2e',
        borderRadius: theme.spacing(2),
        aspectRatio: '16/9',
        position: 'relative',
        overflow: 'hidden',
        boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
    },
    videoHeader: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        padding: theme.spacing(1.5, 2),
        background: 'linear-gradient(rgba(0,0,0,0.6), transparent)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        zIndex: 10,
    },
    liveIndicator: {
        display: 'flex',
        alignItems: 'center',
        gap: theme.spacing(1),
        color: '#fff',
    },
    liveDot: {
        width: 8,
        height: 8,
        background: '#ef4444',
        borderRadius: '50%',
        animation: 'pulse 2s infinite',
    },
    '@keyframes pulse': {
        '0%': { transform: 'scale(0.95)', boxShadow: '0 0 0 0 rgba(239, 68, 68, 0.7)' },
        '70%': { transform: 'scale(1)', boxShadow: '0 0 0 6px rgba(239, 68, 68, 0)' },
        '100%': { transform: 'scale(0.95)', boxShadow: '0 0 0 0 rgba(239, 68, 68, 0)' },
    },
    videoControls: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        padding: theme.spacing(1.5, 2),
        background: 'linear-gradient(transparent, rgba(0,0,0,0.6))',
        display: 'flex',
        justifyContent: 'center',
        gap: theme.spacing(1),
        zIndex: 10,
    },
    controlButton: {
        color: '#fff',
        background: 'rgba(255,255,255,0.1)',
        '&:hover': {
            background: 'rgba(255,255,255,0.2)',
        },
        '&.active': {
            background: '#ef4444',
            '&:hover': {
                background: '#dc2626',
            },
        },
    },
    video: {
        width: '100%',
        height: '100%',
        objectFit: 'contain',
        background: '#000',
    },
    loadingOverlay: {
        position: 'absolute',
        inset: 0,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'rgba(0,0,0,0.7)',
        color: '#fff',
        gap: theme.spacing(2),
        zIndex: 5,
    },
    noVideo: {
        position: 'absolute',
        inset: 0,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        color: '#94a3b8',
        gap: theme.spacing(1),
    },
}));

/**
 * LiveStreaming - Direct WebRTC streaming from LKM server
 * 
 * NO device commands are sent - device is always streaming when online.
 * Frontend connects directly to LKM WebRTC endpoint.
 * Includes talk-back (microphone) feature.
 */
const LiveStreaming = () => {
    const { classes, cx } = useStyles();
    const navigate = useNavigate();
    const t = useTranslation();
    const { deviceId: paramDeviceId } = useParams();

    const [devices, setDevices] = useState([]);
    const [fetchingDevices, setFetchingDevices] = useState(true);
    const selectedDeviceId = useSelector((state) => state.devices.selectedId);
    const deviceId = paramDeviceId || selectedDeviceId;

    const [channels, setChannels] = useState({
        1: { active: false, status: 'Off', loading: false, muted: true, talking: false },
        2: { active: false, status: 'Off', loading: false, muted: true, talking: false },
        3: { active: false, status: 'Off', loading: false, muted: true, talking: false },
        4: { active: false, status: 'Off', loading: false, muted: true, talking: false },
    });

    const peerConnections = useRef({});
    const videoRefs = useRef({});
    const audioContextRef = useRef(null);
    const mediaStreamRef = useRef({});
    const talkWebSocketRef = useRef({});

    // Fetch JT808 devices
    useEffectAsync(async () => {
        setFetchingDevices(true);
        try {
            const response = await fetch('/api/devices');
            if (response.ok) {
                const allDevices = await response.json();
                setDevices(allDevices.filter((d) =>
                    d.protocol?.toLowerCase() === 'jt808' ||
                    d.model?.toUpperCase() === 'JT808'
                ));
            }
        } finally {
            setFetchingDevices(false);
        }
    }, []);

    const currentDevice = useMemo(
        () => devices.find((d) => d.id === parseInt(deviceId, 10)),
        [devices, deviceId]
    );

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

    // Start WebRTC connection - directly to LKM, no commands
    const startWebRTC = useCallback(async (id) => {
        try {
            const streamInfo = await getStreamUrls(id);
            if (!streamInfo) throw new Error('Could not get stream info');

            console.log('WebRTC URL:', streamInfo.webrtcUrl);

            // Configure ICE servers for NAT traversal
            const iceConfig = {
                iceServers: [
                    { urls: 'stun:stun.l.google.com:19302' },
                    { urls: 'stun:stun1.l.google.com:19302' },
                ],
            };
            const pc = new RTCPeerConnection(iceConfig);
            peerConnections.current[id] = pc;

            // Set up event handlers BEFORE negotiation
            const stream = new MediaStream();
            const videoElement = videoRefs.current[id];

            pc.ontrack = (event) => {
                console.log('WebRTC track received:', event.track.kind, event.track);
                stream.addTrack(event.track);
                if (videoElement && !videoElement.srcObject) {
                    videoElement.srcObject = stream;
                    videoElement.play().catch((e) => console.log('Autoplay error:', e));
                }
                setChannels((prev) => ({
                    ...prev,
                    [id]: { ...prev[id], loading: false, status: 'Live' },
                }));
            };

            pc.oniceconnectionstatechange = () => {
                console.log(`ICE connection state for channel ${id}:`, pc.iceConnectionState);
                if (pc.iceConnectionState === 'connected' || pc.iceConnectionState === 'completed') {
                    setChannels((prev) => ({
                        ...prev,
                        [id]: { ...prev[id], loading: false, status: 'Live' },
                    }));
                } else if (pc.iceConnectionState === 'disconnected' || pc.iceConnectionState === 'failed') {
                    console.error(`ICE connection failed for channel ${id}`);
                    setChannels((prev) => ({
                        ...prev,
                        [id]: { ...prev[id], status: 'Connection Failed', loading: false },
                    }));
                }
            };

            pc.onicecandidate = (event) => {
                if (event.candidate) {
                    console.log('ICE candidate:', event.candidate.candidate);
                }
            };

            // Add transceivers for receiving audio and video
            pc.addTransceiver('audio', { direction: 'recvonly' });
            pc.addTransceiver('video', { direction: 'recvonly' });

            // Create and set local offer
            const offer = await pc.createOffer();
            await pc.setLocalDescription(offer);

            console.log('Sending offer to:', streamInfo.webrtcUrl);

            // Send offer and get answer
            const response = await fetch(streamInfo.webrtcUrl, {
                method: 'POST',
                body: JSON.stringify({ type: 'offer', sdp: offer.sdp }),
                headers: { 'Content-Type': 'application/json' },
            });

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`WebRTC negotiation failed: ${response.status} ${errorText}`);
            }

            const answerData = await response.json();
            console.log('Received answer SDP');

            await pc.setRemoteDescription({ type: 'answer', sdp: answerData.sdp });
            console.log('Remote description set successfully');

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
        setChannels((prev) => ({
            ...prev,
            [id]: { ...prev[id], talking: false },
        }));
    }, []);

    // Toggle channel stream
    const handleToggle = useCallback(async (id) => {
        if (!currentDevice) return;

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
    }, [currentDevice, channels, startWebRTC, stopWebRTC, stopTalking]);

    // Start talk-back (microphone)
    const startTalking = useCallback(async (id) => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                audio: {
                    sampleRate: 8000,
                    channelCount: 1,
                    echoCancellation: true,
                    noiseSuppression: true,
                },
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
                // Use larger buffer for smoother audio (512 samples = 64ms at 8kHz)
                const processor = audioContextRef.current.createScriptProcessor(512, 1, 1);

                processor.onaudioprocess = (e) => {
                    if (ws.readyState === WebSocket.OPEN) {
                        const inputData = e.inputBuffer.getChannelData(0);
                        // Convert float32 audio (-1.0 to 1.0) to 16-bit PCM (little-endian)
                        // G.711A encoder expects 16-bit signed integers
                        const pcmData = new Int16Array(inputData.length);
                        for (let i = 0; i < inputData.length; i++) {
                            // Clamp and convert to 16-bit range (-32768 to 32767)
                            pcmData[i] = Math.max(-32768, Math.min(32767, Math.round(inputData[i] * 32767)));
                        }
                        // Send as binary ArrayBuffer (16-bit PCM)
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

            ws.onclose = () => {
                console.log(`Talk WebSocket closed for channel ${id}`);
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

    // Toggle mute
    const handleMuteToggle = useCallback((id) => {
        const video = videoRefs.current[id];
        if (video) {
            video.muted = !channels[id].muted;
            setChannels((prev) => ({
                ...prev,
                [id]: { ...prev[id], muted: !prev[id].muted },
            }));
        }
    }, [channels]);

    // Fullscreen
    const handleFullscreen = useCallback((id) => {
        const container = videoRefs.current[id]?.parentElement;
        if (container) {
            if (document.fullscreenElement) {
                document.exitFullscreen();
            } else {
                container.requestFullscreen();
            }
        }
    }, []);

    const handleDeviceChange = (newDeviceId) => {
        // Stop all streams when changing device
        Object.keys(channels).forEach((id) => {
            if (channels[id].active) {
                stopWebRTC(parseInt(id, 10));
                if (channels[id].talking) {
                    stopTalking(parseInt(id, 10));
                }
            }
        });
        setChannels({
            1: { active: false, status: 'Off', loading: false, muted: true, talking: false },
            2: { active: false, status: 'Off', loading: false, muted: true, talking: false },
            3: { active: false, status: 'Off', loading: false, muted: true, talking: false },
            4: { active: false, status: 'Off', loading: false, muted: true, talking: false },
        });

        if (newDeviceId) {
            navigate(`/reports/live/${newDeviceId}`);
        }
    };

    const activeChannelCount = Object.values(channels).filter((c) => c.active).length;

    return (
        <PageLayout menu={<ReportsMenu />} breadcrumbs={['reportTitle', 'liveStreaming']}>
            <Box className={classes.container}>
                {/* Device selector and channel toggles */}
                <Paper sx={{ p: 2 }}>
                    <Box className={classes.controlsRow}>
                        <Autocomplete
                            loading={fetchingDevices}
                            options={devices}
                            getOptionLabel={(device) => device.name || ''}
                            value={currentDevice || null}
                            onChange={(e, newValue) => handleDeviceChange(newValue?.id)}
                            renderInput={(params) => (
                                <TextField {...params} label="Device" size="small" />
                            )}
                            sx={{ minWidth: 250 }}
                        />

                        <Box className={classes.channelToggles}>
                            {[1, 2, 3, 4].map((id) => (
                                <Box
                                    key={id}
                                    className={cx(classes.channelCard, { active: channels[id].active })}
                                    onClick={() => handleToggle(id)}
                                >
                                    <Typography variant="body2" sx={{ fontWeight: 500, color: 'text.primary' }}>
                                        CH {id}
                                    </Typography>
                                    <Switch
                                        size="small"
                                        checked={channels[id].active}
                                        onClick={(e) => e.stopPropagation()}
                                        onChange={() => handleToggle(id)}
                                        disabled={!currentDevice}
                                        color="primary"
                                    />
                                </Box>
                            ))}
                        </Box>
                    </Box>
                </Paper>

                {/* Video grid */}
                <Box className={classes.videoGrid}>
                    {[1, 2, 3, 4].map((id) =>
                        channels[id].active && (
                            <Fade in={channels[id].active} key={id}>
                                <Box className={classes.videoContainer}>
                                    <Box className={classes.videoHeader}>
                                        <Box className={classes.liveIndicator}>
                                            <Box className={classes.liveDot} />
                                            <Typography variant="body2" sx={{ fontWeight: 600, color: '#fff' }}>
                                                Channel {id}
                                            </Typography>
                                        </Box>
                                        <Typography
                                            variant="caption"
                                            sx={{
                                                background: 'rgba(99, 102, 241, 0.3)',
                                                color: '#fff',
                                                px: 1,
                                                borderRadius: 1,
                                            }}
                                        >
                                            {channels[id].status}
                                        </Typography>
                                    </Box>

                                    <video
                                        ref={(el) => (videoRefs.current[id] = el)}
                                        className={classes.video}
                                        autoPlay
                                        muted={channels[id].muted}
                                        playsInline
                                    />

                                    <Box className={classes.videoControls}>
                                        <Tooltip title={channels[id].talking ? 'Stop Talking' : 'Talk to Device'}>
                                            <IconButton
                                                className={cx(classes.controlButton, { active: channels[id].talking })}
                                                onClick={() => handleTalkToggle(id)}
                                            >
                                                {channels[id].talking ? <MicIcon /> : <MicOffIcon />}
                                            </IconButton>
                                        </Tooltip>

                                        <Tooltip title={channels[id].muted ? 'Unmute' : 'Mute'}>
                                            <IconButton
                                                className={classes.controlButton}
                                                onClick={() => handleMuteToggle(id)}
                                            >
                                                {channels[id].muted ? <VolumeOffIcon /> : <VolumeUpIcon />}
                                            </IconButton>
                                        </Tooltip>

                                        <Tooltip title="Fullscreen">
                                            <IconButton
                                                className={classes.controlButton}
                                                onClick={() => handleFullscreen(id)}
                                            >
                                                <FullscreenIcon />
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

                {activeChannelCount === 0 && currentDevice && (
                    <Box sx={{ textAlign: 'center', py: 8, color: '#64748b' }}>
                        <Typography variant="h6">No channels active</Typography>
                        <Typography variant="body2">Toggle a channel above to start streaming</Typography>
                    </Box>
                )}

                {!currentDevice && (
                    <Box sx={{ textAlign: 'center', py: 8, color: '#64748b' }}>
                        <Typography variant="h6">Select a device</Typography>
                        <Typography variant="body2">Choose a JT808 device to view live streams</Typography>
                    </Box>
                )}
            </Box>
        </PageLayout>
    );
};

export default LiveStreaming;
