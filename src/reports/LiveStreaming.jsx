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
    Snackbar,
} from '@mui/material';
import MicIcon from '@mui/icons-material/Mic';
import MicOffIcon from '@mui/icons-material/MicOff';
import VolumeUpIcon from '@mui/icons-material/VolumeUp';
import VolumeOffIcon from '@mui/icons-material/VolumeOff';
import FullscreenIcon from '@mui/icons-material/Fullscreen';
import WifiOffIcon from '@mui/icons-material/WifiOff';
import Alert from '@mui/material/Alert';
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
    micActive: {
        background: '#ef4444 !important',
        animation: '$micPulse 1.5s infinite',
        '&:hover': {
            background: '#dc2626 !important',
        },
    },
    '@keyframes micPulse': {
        '0%': { boxShadow: '0 0 0 0 rgba(239, 68, 68, 0.6)' },
        '70%': { boxShadow: '0 0 0 8px rgba(239, 68, 68, 0)' },
        '100%': { boxShadow: '0 0 0 0 rgba(239, 68, 68, 0)' },
    },
    micLevelRing: {
        position: 'absolute',
        inset: -3,
        borderRadius: '50%',
        border: '2px solid #ef4444',
        opacity: 0,
        transition: 'opacity 0.15s, transform 0.15s',
        pointerEvents: 'none',
    },
    micConnecting: {
        background: 'rgba(255,255,255,0.15) !important',
        cursor: 'wait',
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

    // Get real-time device status from Redux store (updated via WebSocket)
    const storeDevice = useSelector((state) => state.devices.items[deviceId]);
    const isDeviceOnline = storeDevice?.status === 'online';

    const [channels, setChannels] = useState({
        1: { active: false, status: 'Off', loading: false, muted: true, talking: false, micConnecting: false, micLevel: 0 },
        2: { active: false, status: 'Off', loading: false, muted: true, talking: false, micConnecting: false, micLevel: 0 },
        3: { active: false, status: 'Off', loading: false, muted: true, talking: false, micConnecting: false, micLevel: 0 },
        4: { active: false, status: 'Off', loading: false, muted: true, talking: false, micConnecting: false, micLevel: 0 },
    });

    const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'error' });

    const peerConnections = useRef({});
    const videoRefs = useRef({});
    const talkContexts = useRef({}); // { [channelId]: { audioCtx, stream, ws, analyser, animFrameId } }
    const talkWebSocketRef = useRef({});
    const mediaStreamRef = useRef({});

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
            Object.keys(talkContexts.current).forEach((id) => cleanupTalkContext(id));
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

    // Stop talk-back — robust cleanup of all resources for a channel
    const cleanupTalkContext = useCallback((id) => {
        const ctx = talkContexts.current[id];
        if (ctx) {
            if (ctx.animFrameId) cancelAnimationFrame(ctx.animFrameId);
            if (ctx.processor) { try { ctx.processor.disconnect(); } catch {} }
            if (ctx.silentGain) { try { ctx.silentGain.disconnect(); } catch {} }
            if (ctx.sourceNode) { try { ctx.sourceNode.disconnect(); } catch {} }
            if (ctx.analyser) { try { ctx.analyser.disconnect(); } catch {} }
            if (ctx.audioCtx && ctx.audioCtx.state !== 'closed') {
                ctx.audioCtx.close().catch(() => {});
            }
            if (ctx.stream) ctx.stream.getTracks().forEach((t) => t.stop());
            if (ctx.ws && ctx.ws.readyState <= WebSocket.OPEN) ctx.ws.close();
            delete talkContexts.current[id];
        }
        // Legacy refs cleanup
        if (talkWebSocketRef.current[id]) {
            try { talkWebSocketRef.current[id].close(); } catch {}
            delete talkWebSocketRef.current[id];
        }
        if (mediaStreamRef.current[id]) {
            mediaStreamRef.current[id].getTracks().forEach((t) => t.stop());
            delete mediaStreamRef.current[id];
        }
    }, []);

    const stopTalking = useCallback((id) => {
        // Restore pre-talk mute state before cleanup removes the context
        const ctx = talkContexts.current[id];
        const restoreMuted = ctx ? ctx.wasMuted : true;
        const video = videoRefs.current[id];
        if (video) video.muted = restoreMuted;

        cleanupTalkContext(id);
        setChannels((prev) => ({
            ...prev,
            [id]: { ...prev[id], talking: false, micConnecting: false, micLevel: 0, muted: restoreMuted },
        }));

        // Tell backend to send 0x9101 dataType=0 to restore video+audio streaming.
        // The device will switch from intercom mode back to normal video+audio.
        // Video will briefly pause (~2-3s) while the device reconnects.
        fetch(`/api/video/talk/${deviceId}/${id}/stop`, { method: 'POST' })
            .then((resp) => {
                if (resp.ok) {
                    console.log(`Video restore command sent for CH${id}`);
                } else {
                    console.warn(`Failed to send video restore command for CH${id}: ${resp.status}`);
                }
            })
            .catch((err) => {
                console.warn(`Failed to send video restore command for CH${id}:`, err);
            });
    }, [deviceId, cleanupTalkContext]);

    // Start talk-back (microphone) — production-ready with AudioWorklet fallback, level monitoring, error handling
    const startTalking = useCallback(async (id) => {
        // Prevent double-start
        if (talkContexts.current[id]) return;

        setChannels((prev) => ({
            ...prev,
            [id]: { ...prev[id], micConnecting: true },
        }));

        let micStream;
        try {
            // 1. Acquire mic with echo cancellation
            micStream = await navigator.mediaDevices.getUserMedia({
                audio: {
                    sampleRate: 8000,
                    channelCount: 1,
                    echoCancellation: true,
                    noiseSuppression: true,
                    autoGainControl: true,
                },
            });
        } catch (err) {
            const msg = err.name === 'NotAllowedError'
                ? 'Microphone permission denied. Please allow microphone access in your browser settings.'
                : err.name === 'NotFoundError'
                    ? 'No microphone found. Please connect a microphone.'
                    : `Microphone error: ${err.message}`;
            setSnackbar({ open: true, message: msg, severity: 'error' });
            setChannels((prev) => ({
                ...prev,
                [id]: { ...prev[id], micConnecting: false },
            }));
            return;
        }

        try {
            // 2. Fetch talk WebSocket URL from Traccar backend
            const response = await fetch(`/api/video/talk/${deviceId}/${id}`);
            if (!response.ok) {
                throw new Error(`Server error ${response.status}`);
            }
            const talkInfo = await response.json();

            // 3. Open WebSocket to LKM talk endpoint
            const ws = await new Promise((resolve, reject) => {
                const socket = new WebSocket(talkInfo.websocketUrl);
                socket.binaryType = 'arraybuffer';
                const timeout = setTimeout(() => {
                    socket.close();
                    reject(new Error('Connection timeout'));
                }, 10000);
                socket.onopen = () => { clearTimeout(timeout); resolve(socket); };
                socket.onerror = () => { clearTimeout(timeout); reject(new Error('WebSocket connection failed')); };
            });

            // 4. Wait for the server's connected confirmation
            await new Promise((resolve, reject) => {
                const timeout = setTimeout(() => reject(new Error('Server did not confirm connection')), 5000);
                ws.onmessage = (evt) => {
                    if (typeof evt.data === 'string') {
                        try {
                            const msg = JSON.parse(evt.data);
                            if (msg.status === 'connected') { clearTimeout(timeout); resolve(); }
                            if (msg.error) { clearTimeout(timeout); reject(new Error(msg.error)); }
                        } catch { /* binary data, ignore */ }
                    }
                };
            });

            // 5. Set up AudioContext + processing pipeline
            const audioCtx = new (window.AudioContext || window.webkitAudioContext)({ sampleRate: 8000 });
            const sourceNode = audioCtx.createMediaStreamSource(micStream);

            // AnalyserNode for mic level visualization
            const analyser = audioCtx.createAnalyser();
            analyser.fftSize = 256;
            analyser.smoothingTimeConstant = 0.5;
            const analyserData = new Uint8Array(analyser.frequencyBinCount);

            // Mic level monitoring loop
            let animFrameId;
            const updateLevel = () => {
                analyser.getByteFrequencyData(analyserData);
                // Compute RMS-ish level (0–1)
                let sum = 0;
                for (let i = 0; i < analyserData.length; i++) sum += analyserData[i];
                const avg = sum / analyserData.length / 255;
                setChannels((prev) => (prev[id]?.talking ? {
                    ...prev,
                    [id]: { ...prev[id], micLevel: avg },
                } : prev));
                animFrameId = requestAnimationFrame(updateLevel);
            };

            // ScriptProcessorNode for PCM capture (AudioWorkletNode would be ideal,
            // but cross-browser blob-URL Worklet registration is unreliable without a
            // real served file — ScriptProcessor works universally and is fine for 8kHz mono)
            const processor = audioCtx.createScriptProcessor(512, 1, 1);

            processor.onaudioprocess = (e) => {
                if (ws.readyState !== WebSocket.OPEN) return;
                const inputData = e.inputBuffer.getChannelData(0);
                const pcm = new Int16Array(inputData.length);
                for (let i = 0; i < inputData.length; i++) {
                    const s = Math.max(-1, Math.min(1, inputData[i]));
                    pcm[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
                }
                ws.send(pcm.buffer);
            };

            // Zero-gain node prevents mic audio from playing through browser speakers
            // (which would cause echo on the device). ScriptProcessor still fires because
            // it's connected to the audio graph destination.
            const silentGain = audioCtx.createGain();
            silentGain.gain.value = 0;

            sourceNode.connect(analyser);
            analyser.connect(processor);
            processor.connect(silentGain);
            silentGain.connect(audioCtx.destination);

            // Start level monitor
            animFrameId = requestAnimationFrame(updateLevel);

            // 6. Store all refs for cleanup (including pre-talk mute state for restoration)
            const video = videoRefs.current[id];
            const wasMuted = video ? video.muted : true;
            talkContexts.current[id] = {
                audioCtx, sourceNode, analyser, processor, silentGain, stream: micStream, ws, animFrameId, wasMuted,
            };

            // 7. Handle unexpected close
            ws.onclose = () => {
                if (talkContexts.current[id]) {
                    stopTalking(id);
                    setSnackbar({ open: true, message: `Intercom disconnected (CH${id})`, severity: 'warning' });
                }
            };
            ws.onerror = () => {
                if (talkContexts.current[id]) {
                    stopTalking(id);
                    setSnackbar({ open: true, message: `Intercom error (CH${id})`, severity: 'error' });
                }
            };

            // Always force-mute device audio during talk to prevent echo loop
            // (device speaker → device mic → JT1078 stream → WebRTC → browser speakers → echo)
            if (video) video.muted = true;
            setChannels((prev) => ({
                ...prev,
                [id]: { ...prev[id], talking: true, micConnecting: false, muted: true },
            }));
            if (!wasMuted) {
                setSnackbar({ open: true, message: `Device audio muted to prevent echo (CH${id})`, severity: 'info' });
            }
        } catch (err) {
            // Cleanup mic if we fail after acquiring it
            micStream.getTracks().forEach((t) => t.stop());
            cleanupTalkContext(id);
            setSnackbar({ open: true, message: `Failed to start intercom: ${err.message}`, severity: 'error' });
            setChannels((prev) => ({
                ...prev,
                [id]: { ...prev[id], micConnecting: false, talking: false },
            }));
        }
    }, [deviceId, stopTalking, cleanupTalkContext]);

    // Toggle talk
    const handleTalkToggle = useCallback((id) => {
        if (channels[id].micConnecting) return; // Ignore clicks while connecting
        if (channels[id].talking) {
            stopTalking(id);
        } else {
            startTalking(id);
        }
    }, [channels, startTalking, stopTalking]);

    // Toggle channel stream
    const handleToggle = useCallback(async (id) => {
        if (!currentDevice) return;
        if (!isDeviceOnline) return;

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
    }, [currentDevice, isDeviceOnline, channels, startWebRTC, stopWebRTC, stopTalking]);

    // Toggle mute — blocked during active talk to prevent echo
    const handleMuteToggle = useCallback((id) => {
        // Prevent unmuting while intercom is active — this would cause echo
        if (channels[id].talking) {
            setSnackbar({ open: true, message: 'Cannot unmute while intercom is active (echo prevention)', severity: 'warning' });
            return;
        }
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
            1: { active: false, status: 'Off', loading: false, muted: true, talking: false, micConnecting: false, micLevel: 0 },
            2: { active: false, status: 'Off', loading: false, muted: true, talking: false, micConnecting: false, micLevel: 0 },
            3: { active: false, status: 'Off', loading: false, muted: true, talking: false, micConnecting: false, micLevel: 0 },
            4: { active: false, status: 'Off', loading: false, muted: true, talking: false, micConnecting: false, micLevel: 0 },
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
                                        disabled={!currentDevice || !isDeviceOnline}
                                        color="primary"
                                    />
                                </Box>
                            ))}
                        </Box>
                    </Box>
                </Paper>

                {/* Device offline warning */}
                {currentDevice && !isDeviceOnline && (
                    <Alert
                        severity="warning"
                        icon={<WifiOffIcon />}
                        sx={{ borderRadius: 2 }}
                    >
                        <Typography variant="body1" sx={{ fontWeight: 600 }}>
                            Device is currently offline
                        </Typography>
                        <Typography variant="body2">
                            Live streaming is not available while the device is offline. Streams will be available once the device reconnects.
                        </Typography>
                    </Alert>
                )}

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
                                        <Tooltip title={
                                            channels[id].micConnecting ? 'Connecting...'
                                                : channels[id].talking ? 'Stop Intercom'
                                                    : 'Talk to Device'
                                        }>
                                            <Box sx={{ position: 'relative', display: 'inline-flex' }}>
                                                {/* Mic level ring — visible only while talking */}
                                                {channels[id].talking && (
                                                    <Box
                                                        className={classes.micLevelRing}
                                                        sx={{
                                                            opacity: channels[id].micLevel > 0.05 ? Math.min(channels[id].micLevel * 3, 1) : 0,
                                                            transform: `scale(${1 + channels[id].micLevel * 0.5})`,
                                                        }}
                                                    />
                                                )}
                                                <IconButton
                                                    className={cx(
                                                        classes.controlButton,
                                                        { [classes.micActive]: channels[id].talking },
                                                        { [classes.micConnecting]: channels[id].micConnecting },
                                                    )}
                                                    onClick={() => handleTalkToggle(id)}
                                                    disabled={channels[id].micConnecting}
                                                >
                                                    {channels[id].micConnecting
                                                        ? <CircularProgress size={20} sx={{ color: '#fff' }} />
                                                        : channels[id].talking
                                                            ? <MicIcon />
                                                            : <MicOffIcon />}
                                                </IconButton>
                                            </Box>
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

            {/* Snackbar for mic/talk notifications */}
            <Snackbar
                open={snackbar.open}
                autoHideDuration={5000}
                onClose={() => setSnackbar((s) => ({ ...s, open: false }))}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
            >
                <Alert
                    onClose={() => setSnackbar((s) => ({ ...s, open: false }))}
                    severity={snackbar.severity}
                    variant="filled"
                    sx={{ width: '100%' }}
                >
                    {snackbar.message}
                </Alert>
            </Snackbar>
        </PageLayout>
    );
};

export default LiveStreaming;
