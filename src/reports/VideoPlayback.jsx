import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { makeStyles } from 'tss-react/mui';
import Hls from 'hls.js';
import {
    Box,
    Typography,
    Button,
    CircularProgress,
    Autocomplete,
    TextField,
    FormControl,
    InputLabel,
    Select,
    MenuItem,
    IconButton,
    Tooltip,
    Slider,
    Paper,
    List,
    ListItem,
    ListItemText,
    ListItemIcon,
    Chip,
    Alert,
} from '@mui/material';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import PauseIcon from '@mui/icons-material/Pause';
import StopIcon from '@mui/icons-material/Stop';
import FastForwardIcon from '@mui/icons-material/FastForward';
import FastRewindIcon from '@mui/icons-material/FastRewind';
import Forward10Icon from '@mui/icons-material/Forward10';
import Replay10Icon from '@mui/icons-material/Replay10';
import VolumeUpIcon from '@mui/icons-material/VolumeUp';
import VolumeOffIcon from '@mui/icons-material/VolumeOff';
import FullscreenIcon from '@mui/icons-material/Fullscreen';
import VideoFileIcon from '@mui/icons-material/VideoFile';
import SearchIcon from '@mui/icons-material/Search';
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
    mainContent: {
        display: 'grid',
        gridTemplateColumns: '1fr 350px',
        gap: theme.spacing(3),
        '@media (max-width: 1024px)': {
            gridTemplateColumns: '1fr',
        },
    },
    controlsRow: {
        display: 'flex',
        flexWrap: 'wrap',
        gap: theme.spacing(2),
        alignItems: 'center',
    },
    filterItem: {
        minWidth: 180,
    },
    videoSection: {
        display: 'flex',
        flexDirection: 'column',
        gap: theme.spacing(2),
    },
    videoContainer: {
        position: 'relative',
        backgroundColor: '#1a1a2e',
        borderRadius: theme.shape.borderRadius * 2,
        overflow: 'hidden',
        aspectRatio: '16/9',
        boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.15)',
    },
    video: {
        width: '100%',
        height: '100%',
        objectFit: 'contain',
        background: '#000',
    },
    controlsOverlay: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        background: 'linear-gradient(transparent, rgba(0, 0, 0, 0.85))',
        padding: theme.spacing(2),
        display: 'flex',
        flexDirection: 'column',
        gap: theme.spacing(1),
    },
    progressBar: {
        color: '#6366f1',
        '& .MuiSlider-thumb': {
            width: 14,
            height: 14,
            transition: '0.2s',
            '&:hover': {
                boxShadow: '0 0 0 8px rgba(99, 102, 241, 0.16)',
            },
        },
        '& .MuiSlider-track': {
            height: 5,
        },
        '& .MuiSlider-rail': {
            height: 5,
            opacity: 0.4,
        },
    },
    controlButtons: {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: theme.spacing(1),
    },
    controlButton: {
        color: '#fff',
        '&:hover': {
            background: 'rgba(255, 255, 255, 0.15)',
        },
    },
    timeDisplay: {
        color: '#fff',
        fontSize: '0.875rem',
        minWidth: '120px',
        fontFamily: 'monospace',
    },
    sidebar: {
        display: 'flex',
        flexDirection: 'column',
        gap: theme.spacing(2),
    },
    fileList: {
        background: theme.palette.background.paper,
        borderRadius: theme.shape.borderRadius * 2,
        overflow: 'hidden',
        boxShadow: theme.shadows[1],
        maxHeight: '500px',
        display: 'flex',
        flexDirection: 'column',
    },
    fileListHeader: {
        padding: theme.spacing(2),
        borderBottom: `1px solid ${theme.palette.divider}`,
        background: theme.palette.mode === 'dark' ? theme.palette.background.default : '#f8fafc',
    },
    fileListContent: {
        flex: 1,
        overflow: 'auto',
    },
    fileItem: {
        cursor: 'pointer',
        transition: 'all 0.15s',
        borderBottom: `1px solid ${theme.palette.divider}`,
        '&:hover': {
            background: theme.palette.action.hover,
        },
        '&.active': {
            background: theme.palette.primary.main + '15',
            borderLeft: `4px solid ${theme.palette.primary.main}`,
        },
        '& .MuiListItemText-primary': {
            color: theme.palette.text.primary,
        },
        '& .MuiListItemText-secondary': {
            color: theme.palette.text.secondary,
        },
    },
    noFiles: {
        padding: theme.spacing(4),
        textAlign: 'center',
        color: theme.palette.text.secondary,
        background: theme.palette.background.paper,
    },
    noVideo: {
        position: 'absolute',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        textAlign: 'center',
        color: '#94a3b8',
    },
    playlistIndicator: {
        position: 'absolute',
        top: theme.spacing(2),
        right: theme.spacing(2),
        display: 'flex',
        gap: theme.spacing(1),
    },
    speedControl: {
        minWidth: 80,
        '& .MuiSelect-select': {
            color: '#fff',
            paddingY: '4px',
        },
        '& .MuiOutlinedInput-notchedOutline': {
            borderColor: 'rgba(255,255,255,0.3)',
        },
        '& .MuiSvgIcon-root': {
            color: '#fff',
        },
    },
}));

const formatTime = (seconds) => {
    if (isNaN(seconds) || seconds === Infinity || seconds < 0) return '00:00:00';
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
};

const formatFileSize = (bytes) => {
    if (!bytes) return '';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

// Convert UTC time to IST (UTC+5:30)
const formatToIST = (dateStr, timeStr) => {
    try {
        // dateStr format: YYYY-MM-DD, timeStr format: HH-MM-SS or HH:MM:SS
        const normalizedTime = timeStr.replace(/-/g, ':');
        const utcDate = new Date(`${dateStr}T${normalizedTime}Z`);
        
        // Format in IST timezone
        const options = {
            timeZone: 'Asia/Kolkata',
            year: 'numeric',
            month: 'short',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            hour12: true,
        };
        return utcDate.toLocaleString('en-IN', options);
    } catch (e) {
        return `${dateStr} ${timeStr}`;
    }
};

/**
 * VideoPlayback - Plays back recordings stored on LKM server
 * 
 * Features:
 * - Fetches recordings from LKM via Traccar API
 * - Streams video files directly (no device commands)
 * - Full playback controls: play, pause, seek, skip ±10s, speed control
 * - Supports multi-file playlists
 * - Range request support for accurate seeking
 */
const VideoPlayback = () => {
    const { classes: reportClasses } = useReportStyles();
    const { classes, cx } = useStyles();
    const navigate = useNavigate();
    const t = useTranslation();
    const { deviceId: paramDeviceId } = useParams();

    const [devices, setDevices] = useState([]);
    const [fetchingDevices, setFetchingDevices] = useState(true);
    const selectedDeviceId = useSelector((state) => state.devices.selectedId);
    const deviceId = paramDeviceId || selectedDeviceId;

    // Filters
    const [selectedChannel, setSelectedChannel] = useState(1);
    const [startDate, setStartDate] = useState(() => {
        const d = new Date();
        d.setDate(d.getDate() - 1);
        return d.toISOString().split('T')[0];
    });
    const [endDate, setEndDate] = useState(() => new Date().toISOString().split('T')[0]);

    // Recordings state
    const [recordings, setRecordings] = useState([]);
    const [loadingRecordings, setLoadingRecordings] = useState(false);
    const [error, setError] = useState(null);

    // Playback state
    const [currentFileIndex, setCurrentFileIndex] = useState(-1);
    const [isPlaying, setIsPlaying] = useState(false);
    const [currentTime, setCurrentTime] = useState(0);
    const [duration, setDuration] = useState(0);
    const [volume, setVolume] = useState(1);
    const [muted, setMuted] = useState(false);
    const [playbackRate, setPlaybackRate] = useState(1);
    const [buffering, setBuffering] = useState(false);

    const videoRef = useRef(null);
    const hlsRef = useRef(null);

    // Cleanup HLS instance on unmount
    useEffect(() => {
        return () => {
            if (hlsRef.current) {
                hlsRef.current.destroy();
                hlsRef.current = null;
            }
        };
    }, []);

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

    // Fetch recordings from LKM server via Traccar API
    const fetchRecordings = useCallback(async () => {
        if (!deviceId) return;

        setLoadingRecordings(true);
        setError(null);

        try {
            const startTime = `${startDate}T00:00:00`;
            const endTime = `${endDate}T23:59:59`;

            const response = await fetch(
                `/api/video/recordings/${deviceId}/${selectedChannel}?start=${startTime}&end=${endTime}`
            );

            if (!response.ok) {
                throw new Error('Failed to fetch recordings');
            }

            const data = await response.json();
            setRecordings(data.files || []);
            setCurrentFileIndex(-1);
            setIsPlaying(false);
        } catch (err) {
            console.error('Error fetching recordings:', err);
            setError(err.message);
            setRecordings([]);
        } finally {
            setLoadingRecordings(false);
        }
    }, [deviceId, selectedChannel, startDate, endDate]);

    // Video event handlers
    useEffect(() => {
        const video = videoRef.current;
        if (!video) return;

        const handleTimeUpdate = () => setCurrentTime(video.currentTime);
        const handleDurationChange = () => setDuration(video.duration);
        const handleEnded = () => {
            // Auto-play next file in playlist
            if (currentFileIndex < recordings.length - 1) {
                playFile(currentFileIndex + 1);
            } else {
                setIsPlaying(false);
            }
        };
        const handlePlay = () => setIsPlaying(true);
        const handlePause = () => setIsPlaying(false);
        const handleWaiting = () => setBuffering(true);
        const handlePlaying = () => setBuffering(false);
        const handleCanPlay = () => setBuffering(false);

        video.addEventListener('timeupdate', handleTimeUpdate);
        video.addEventListener('durationchange', handleDurationChange);
        video.addEventListener('ended', handleEnded);
        video.addEventListener('play', handlePlay);
        video.addEventListener('pause', handlePause);
        video.addEventListener('waiting', handleWaiting);
        video.addEventListener('playing', handlePlaying);
        video.addEventListener('canplay', handleCanPlay);

        return () => {
            video.removeEventListener('timeupdate', handleTimeUpdate);
            video.removeEventListener('durationchange', handleDurationChange);
            video.removeEventListener('ended', handleEnded);
            video.removeEventListener('play', handlePlay);
            video.removeEventListener('pause', handlePause);
            video.removeEventListener('waiting', handleWaiting);
            video.removeEventListener('playing', handlePlaying);
            video.removeEventListener('canplay', handleCanPlay);
        };
    }, [currentFileIndex, recordings]);

    // Play a specific file - supports both HLS and direct video formats
    const playFile = useCallback((index) => {
        if (index < 0 || index >= recordings.length) return;

        const file = recordings[index];
        const video = videoRef.current;

        if (!video) return;

        // Destroy existing HLS instance
        if (hlsRef.current) {
            hlsRef.current.destroy();
            hlsRef.current = null;
        }

        setError(null);
        setBuffering(true);
        setCurrentFileIndex(index);
        setCurrentTime(0); // Reset to beginning

        // Determine URL to use - prefer playlistUrl for HLS, otherwise use downloadUrl
        const isHLS = file.format === 'hls' || file.playlistUrl;
        const sourceUrl = isHLS ? file.playlistUrl : file.downloadUrl;

        if (isHLS && Hls.isSupported()) {
            // Use HLS.js for .m3u8 playback with robust error handling
            const hls = new Hls({
                enableWorker: true,
                lowLatencyMode: false,
                // Buffer settings for VOD playback
                maxBufferLength: 60,
                maxMaxBufferLength: 120,
                maxBufferSize: 100 * 1000 * 1000, // 100 MB
                maxBufferHole: 0.5,
                // Error recovery settings
                fragLoadingMaxRetry: 4,
                fragLoadingMaxRetryTimeout: 16000,
                fragLoadingRetryDelay: 1000,
                manifestLoadingMaxRetry: 4,
                manifestLoadingMaxRetryTimeout: 16000,
                levelLoadingMaxRetry: 4,
                // Start from beginning
                startPosition: 0,
            });

            hls.loadSource(sourceUrl);
            hls.attachMedia(video);

            hls.on(Hls.Events.MANIFEST_PARSED, () => {
                video.currentTime = 0; // Ensure we start from beginning
                video.playbackRate = playbackRate;
                video.play().catch((err) => {
                    console.error('HLS Playback error:', err);
                    setError('Failed to play HLS stream. Click to retry.');
                });
            });

            hls.on(Hls.Events.ERROR, (event, data) => {
                console.error('HLS error:', data);
                if (data.fatal) {
                    switch (data.type) {
                        case Hls.ErrorTypes.NETWORK_ERROR:
                            console.log('HLS network error, attempting recovery...');
                            hls.startLoad();
                            break;
                        case Hls.ErrorTypes.MEDIA_ERROR:
                            console.log('HLS media error, attempting recovery...');
                            hls.recoverMediaError();
                            break;
                        default:
                            setError('Failed to load video. The recording may be incomplete.');
                            hls.destroy();
                            break;
                    }
                } else if (data.type === Hls.ErrorTypes.NETWORK_ERROR && data.details === 'fragLoadError') {
                    // Non-fatal segment load error - HLS.js will retry automatically
                    console.log('Segment load error, HLS.js will retry...');
                }
            });

            hlsRef.current = hls;
        } else if (isHLS && video.canPlayType('application/vnd.apple.mpegurl')) {
            // Native HLS support (Safari)
            video.src = sourceUrl;
            video.playbackRate = playbackRate;
            video.load();
            video.play().catch((err) => {
                console.error('Native HLS Playback error:', err);
                setError('Failed to play video.');
            });
        } else {
            // Direct video playback (MP4, FLV)
            video.src = sourceUrl;
            video.playbackRate = playbackRate;
            video.load();
            video.play().catch((err) => {
                console.error('Playback error:', err);
                setError('Failed to play video. The file may be corrupted or inaccessible.');
            });
        }
    }, [recordings, playbackRate]);

    // Playback controls
    const togglePlay = () => {
        const video = videoRef.current;
        if (!video) return;

        if (currentFileIndex === -1 && recordings.length > 0) {
            playFile(0);
        } else if (isPlaying) {
            video.pause();
        } else {
            video.play();
        }
    };

    const stop = () => {
        // Cleanup HLS instance
        if (hlsRef.current) {
            hlsRef.current.destroy();
            hlsRef.current = null;
        }

        const video = videoRef.current;
        if (video) {
            video.pause();
            video.currentTime = 0;
            video.src = '';
            setCurrentFileIndex(-1);
            setIsPlaying(false);
            setCurrentTime(0);
            setDuration(0);
            setError(null);
        }
    };

    const seek = (value) => {
        const video = videoRef.current;
        if (video && duration) {
            video.currentTime = value;
            setCurrentTime(value);
        }
    };

    const skip = (seconds) => {
        const video = videoRef.current;
        if (video) {
            const newTime = Math.max(0, Math.min(duration, video.currentTime + seconds));
            video.currentTime = newTime;
        }
    };

    const changePlaybackRate = (rate) => {
        const video = videoRef.current;
        if (video) {
            video.playbackRate = rate;
            setPlaybackRate(rate);
        }
    };

    const toggleMute = () => {
        const video = videoRef.current;
        if (video) {
            video.muted = !muted;
            setMuted(!muted);
        }
    };

    const toggleFullscreen = () => {
        const container = videoRef.current?.parentElement;
        if (container) {
            if (document.fullscreenElement) {
                document.exitFullscreen();
            } else {
                container.requestFullscreen();
            }
        }
    };

    const handleDeviceChange = (newDeviceId) => {
        if (newDeviceId) {
            navigate(`/reports/playback/${newDeviceId}`);
        }
    };

    const currentFile = currentFileIndex >= 0 ? recordings[currentFileIndex] : null;

    return (
        <PageLayout menu={<ReportsMenu />} breadcrumbs={['reportTitle', 'videoPlayback']}>
            <Box className={classes.container}>
                {/* Filters */}
                <Paper sx={{ p: 2 }}>
                    <Box className={classes.controlsRow}>
                        <Autocomplete
                            className={classes.filterItem}
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
                        <FormControl size="small" className={classes.filterItem}>
                            <InputLabel>Channel</InputLabel>
                            <Select
                                value={selectedChannel}
                                label="Channel"
                                onChange={(e) => setSelectedChannel(e.target.value)}
                            >
                                {[1, 2, 3, 4].map((ch) => (
                                    <MenuItem key={ch} value={ch}>
                                        Channel {ch}
                                    </MenuItem>
                                ))}
                            </Select>
                        </FormControl>
                        <TextField
                            type="date"
                            label="Start Date"
                            size="small"
                            value={startDate}
                            onChange={(e) => setStartDate(e.target.value)}
                            InputLabelProps={{ shrink: true }}
                            className={classes.filterItem}
                        />
                        <TextField
                            type="date"
                            label="End Date"
                            size="small"
                            value={endDate}
                            onChange={(e) => setEndDate(e.target.value)}
                            InputLabelProps={{ shrink: true }}
                            className={classes.filterItem}
                        />
                        <Button
                            variant="contained"
                            startIcon={<SearchIcon />}
                            onClick={fetchRecordings}
                            disabled={!deviceId || loadingRecordings}
                        >
                            {loadingRecordings ? 'Loading...' : 'Search'}
                        </Button>
                    </Box>
                </Paper>

                {error && (
                    <Alert severity="error" onClose={() => setError(null)}>
                        {error}
                    </Alert>
                )}

                {/* Main content */}
                <Box className={classes.mainContent}>
                    {/* Video Section */}
                    <Box className={classes.videoSection}>
                        <Box className={classes.videoContainer}>
                            <video
                                ref={videoRef}
                                className={classes.video}
                                playsInline
                                muted={muted}
                            />

                            {buffering && currentFileIndex >= 0 && (
                                <Box
                                    sx={{
                                        position: 'absolute',
                                        inset: 0,
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        background: 'rgba(0,0,0,0.5)',
                                    }}
                                >
                                    <CircularProgress sx={{ color: '#fff' }} />
                                </Box>
                            )}

                            {currentFileIndex === -1 && (
                                <Box className={classes.noVideo}>
                                    <VideoFileIcon sx={{ fontSize: 64, mb: 2, color: '#475569' }} />
                                    <Typography variant="h6">No video playing</Typography>
                                    <Typography variant="body2" color="textSecondary">
                                        Search for recordings and select a file to play
                                    </Typography>
                                </Box>
                            )}

                            {currentFile && (
                                <Box className={classes.playlistIndicator}>
                                    <Chip
                                        size="small"
                                        label={`${currentFileIndex + 1} / ${recordings.length}`}
                                        sx={{ background: 'rgba(0,0,0,0.6)', color: '#fff' }}
                                    />
                                    <Chip
                                        size="small"
                                        label={currentFile.date}
                                        sx={{ background: 'rgba(99, 102, 241, 0.8)', color: '#fff' }}
                                    />
                                </Box>
                            )}

                            {/* Controls overlay */}
                            <Box className={classes.controlsOverlay}>
                                {/* Progress bar */}
                                <Slider
                                    className={classes.progressBar}
                                    value={currentTime}
                                    max={duration || 100}
                                    onChange={(e, value) => seek(value)}
                                    disabled={currentFileIndex === -1}
                                />

                                {/* Control buttons */}
                                <Box className={classes.controlButtons}>
                                    <Typography className={classes.timeDisplay}>
                                        {formatTime(currentTime)} / {formatTime(duration)}
                                    </Typography>

                                    <Tooltip title="Rewind 10s">
                                        <IconButton
                                            className={classes.controlButton}
                                            onClick={() => skip(-10)}
                                            disabled={currentFileIndex === -1}
                                        >
                                            <Replay10Icon />
                                        </IconButton>
                                    </Tooltip>

                                    <Tooltip title="Previous file">
                                        <IconButton
                                            className={classes.controlButton}
                                            onClick={() => playFile(currentFileIndex - 1)}
                                            disabled={currentFileIndex <= 0}
                                        >
                                            <FastRewindIcon />
                                        </IconButton>
                                    </Tooltip>

                                    <Tooltip title={isPlaying ? 'Pause' : 'Play'}>
                                        <IconButton
                                            className={classes.controlButton}
                                            onClick={togglePlay}
                                            disabled={recordings.length === 0}
                                            sx={{ fontSize: 48 }}
                                        >
                                            {isPlaying ? (
                                                <PauseIcon sx={{ fontSize: 40 }} />
                                            ) : (
                                                <PlayArrowIcon sx={{ fontSize: 40 }} />
                                            )}
                                        </IconButton>
                                    </Tooltip>

                                    <Tooltip title="Next file">
                                        <IconButton
                                            className={classes.controlButton}
                                            onClick={() => playFile(currentFileIndex + 1)}
                                            disabled={currentFileIndex >= recordings.length - 1}
                                        >
                                            <FastForwardIcon />
                                        </IconButton>
                                    </Tooltip>

                                    <Tooltip title="Forward 10s">
                                        <IconButton
                                            className={classes.controlButton}
                                            onClick={() => skip(10)}
                                            disabled={currentFileIndex === -1}
                                        >
                                            <Forward10Icon />
                                        </IconButton>
                                    </Tooltip>

                                    <Tooltip title="Stop">
                                        <IconButton
                                            className={classes.controlButton}
                                            onClick={stop}
                                            disabled={currentFileIndex === -1}
                                        >
                                            <StopIcon />
                                        </IconButton>
                                    </Tooltip>

                                    <Box sx={{ mx: 1, borderLeft: '1px solid rgba(255,255,255,0.3)', height: 24 }} />

                                    <Tooltip title={muted ? 'Unmute' : 'Mute'}>
                                        <IconButton className={classes.controlButton} onClick={toggleMute}>
                                            {muted ? <VolumeOffIcon /> : <VolumeUpIcon />}
                                        </IconButton>
                                    </Tooltip>

                                    <FormControl size="small" className={classes.speedControl}>
                                        <Select
                                            value={playbackRate}
                                            onChange={(e) => changePlaybackRate(e.target.value)}
                                            variant="outlined"
                                        >
                                            <MenuItem value={0.5}>0.5x</MenuItem>
                                            <MenuItem value={1}>1x</MenuItem>
                                            <MenuItem value={1.5}>1.5x</MenuItem>
                                            <MenuItem value={2}>2x</MenuItem>
                                        </Select>
                                    </FormControl>

                                    <Tooltip title="Fullscreen">
                                        <IconButton className={classes.controlButton} onClick={toggleFullscreen}>
                                            <FullscreenIcon />
                                        </IconButton>
                                    </Tooltip>
                                </Box>
                            </Box>
                        </Box>
                    </Box>

                    {/* Sidebar - File list */}
                    <Box className={classes.sidebar}>
                        <Box className={classes.fileList}>
                            <Box className={classes.fileListHeader}>
                                <Typography variant="subtitle1" sx={{ fontWeight: 600, color: '#1e293b' }}>
                                    Recordings
                                </Typography>
                                <Typography variant="caption" sx={{ color: '#64748b' }}>
                                    {recordings.length} file{recordings.length !== 1 ? 's' : ''} found
                                </Typography>
                            </Box>

                            <Box className={classes.fileListContent}>
                                {loadingRecordings ? (
                                    <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
                                        <CircularProgress />
                                    </Box>
                                ) : recordings.length === 0 ? (
                                    <Box className={classes.noFiles}>
                                        <VideoFileIcon sx={{ fontSize: 48, mb: 1, color: '#94a3b8' }} />
                                        <Typography variant="body2">No recordings found</Typography>
                                        <Typography variant="caption" color="textSecondary">
                                            Try adjusting the date range
                                        </Typography>
                                    </Box>
                                ) : (
                                    <List dense>
                                        {recordings.map((file, index) => (
                                            <ListItem
                                                key={file.path || index}
                                                className={cx(classes.fileItem, { active: index === currentFileIndex })}
                                                onClick={() => playFile(index)}
                                                sx={{
                                                    background: (theme) => index === currentFileIndex
                                                        ? theme.palette.primary.main + '12'
                                                        : theme.palette.background.paper,
                                                    borderLeft: (theme) => index === currentFileIndex
                                                        ? `3px solid ${theme.palette.primary.main}`
                                                        : '3px solid transparent',
                                                    py: 1.5,
                                                }}
                                            >
                                                <ListItemIcon sx={{ minWidth: 40 }}>
                                                    <VideoFileIcon
                                                        sx={{ color: (theme) => index === currentFileIndex
                                                            ? theme.palette.primary.main
                                                            : theme.palette.text.secondary }}
                                                    />
                                                </ListItemIcon>
                                                <ListItemText
                                                    primary={
                                                        <Typography variant="body2" sx={{ fontWeight: 500, color: 'text.primary' }}>
                                                            {formatToIST(file.date, file.time)}
                                                        </Typography>
                                                    }
                                                    secondary={
                                                        <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                                                            {file.format?.toUpperCase()} • {formatFileSize(file.size)}
                                                        </Typography>
                                                    }
                                                />
                                                {index === currentFileIndex && isPlaying && (
                                                    <Chip
                                                        size="small"
                                                        label="Playing"
                                                        color="primary"
                                                        sx={{ ml: 1 }}
                                                    />
                                                )}
                                            </ListItem>
                                        ))}
                                    </List>
                                )}
                            </Box>
                        </Box>
                    </Box>
                </Box>
            </Box>
        </PageLayout>
    );
};

export default VideoPlayback;
