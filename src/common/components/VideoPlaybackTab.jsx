import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
    Box,
    Typography,
    IconButton,
    Slider,
    Select,
    MenuItem,
    FormControl,
    InputLabel,
    CircularProgress,
    Paper,
    List,
    ListItem,
    ListItemText,
    ListItemIcon,
    Chip,
    Button,
    TextField,
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
import CalendarTodayIcon from '@mui/icons-material/CalendarToday';
import { makeStyles } from 'tss-react/mui';
import { useSelector } from 'react-redux';

const useStyles = makeStyles()((theme) => ({
    root: {
        display: 'grid',
        gridTemplateColumns: '1fr 350px',
        gap: theme.spacing(3),
        height: 'calc(100vh - 200px)',
        '@media (max-width: 1024px)': {
            gridTemplateColumns: '1fr',
            gridTemplateRows: 'auto 1fr',
        },
    },
    videoSection: {
        display: 'flex',
        flexDirection: 'column',
        gap: theme.spacing(2),
    },
    videoContainer: {
        background: '#1a1a2e',
        borderRadius: '1rem',
        aspectRatio: '16/9',
        position: 'relative',
        overflow: 'hidden',
        boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
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
        background: 'linear-gradient(transparent, rgba(0, 0, 0, 0.8))',
        padding: theme.spacing(2),
        display: 'flex',
        flexDirection: 'column',
        gap: theme.spacing(1),
    },
    progressBar: {
        color: '#6366f1',
        '& .MuiSlider-thumb': {
            width: 12,
            height: 12,
        },
        '& .MuiSlider-track': {
            height: 4,
        },
        '& .MuiSlider-rail': {
            height: 4,
            opacity: 0.5,
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
            background: 'rgba(255, 255, 255, 0.1)',
        },
    },
    timeDisplay: {
        color: '#fff',
        fontSize: '0.875rem',
        minWidth: '100px',
    },
    sidebar: {
        display: 'flex',
        flexDirection: 'column',
        gap: theme.spacing(2),
        maxHeight: '100%',
        overflow: 'hidden',
    },
    filterSection: {
        background: '#fff',
        borderRadius: '1rem',
        padding: theme.spacing(2),
        boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)',
    },
    fileList: {
        flex: 1,
        background: '#fff',
        borderRadius: '1rem',
        overflow: 'hidden',
        boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)',
        display: 'flex',
        flexDirection: 'column',
    },
    fileListHeader: {
        padding: theme.spacing(2),
        borderBottom: '1px solid #e2e8f0',
        background: '#f8fafc',
    },
    fileListContent: {
        flex: 1,
        overflow: 'auto',
    },
    fileItem: {
        cursor: 'pointer',
        '&:hover': {
            background: '#f1f5f9',
        },
        '&.active': {
            background: 'rgba(99, 102, 241, 0.1)',
            borderLeft: '3px solid #6366f1',
        },
    },
    noFiles: {
        padding: theme.spacing(4),
        textAlign: 'center',
        color: '#64748b',
    },
    loadingContainer: {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100%',
        minHeight: '200px',
    },
    playlistIndicator: {
        position: 'absolute',
        top: theme.spacing(2),
        left: theme.spacing(2),
        display: 'flex',
        gap: theme.spacing(1),
    },
}));

const formatTime = (seconds) => {
    if (isNaN(seconds) || seconds === Infinity) return '00:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
};

const formatFileSize = (bytes) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

const VideoPlaybackTab = ({ deviceId }) => {
    const { classes, cx } = useStyles();
    const videoRef = useRef(null);
    const device = useSelector((state) => state.devices.items[deviceId]);

    // State
    const [channel, setChannel] = useState(1);
    const [startDate, setStartDate] = useState(() => {
        const d = new Date();
        d.setDate(d.getDate() - 1);
        return d.toISOString().split('T')[0];
    });
    const [endDate, setEndDate] = useState(() => new Date().toISOString().split('T')[0]);
    const [recordings, setRecordings] = useState([]);
    const [loading, setLoading] = useState(false);
    const [currentFileIndex, setCurrentFileIndex] = useState(-1);
    const [isPlaying, setIsPlaying] = useState(false);
    const [currentTime, setCurrentTime] = useState(0);
    const [duration, setDuration] = useState(0);
    const [volume, setVolume] = useState(1);
    const [muted, setMuted] = useState(false);
    const [playbackRate, setPlaybackRate] = useState(1);

    // Fetch recordings
    const fetchRecordings = useCallback(async () => {
        setLoading(true);
        try {
            const startTime = `${startDate}T00:00:00`;
            const endTime = `${endDate}T23:59:59`;
            
            const response = await fetch(
                `/api/video/recordings/${deviceId}/${channel}?start=${startTime}&end=${endTime}`
            );
            
            if (!response.ok) throw new Error('Failed to fetch recordings');
            
            const data = await response.json();
            setRecordings(data.files || []);
            setCurrentFileIndex(-1);
        } catch (error) {
            console.error('Error fetching recordings:', error);
            setRecordings([]);
        } finally {
            setLoading(false);
        }
    }, [deviceId, channel, startDate, endDate]);

    // Load recordings on filter change
    useEffect(() => {
        fetchRecordings();
    }, [fetchRecordings]);

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

        video.addEventListener('timeupdate', handleTimeUpdate);
        video.addEventListener('durationchange', handleDurationChange);
        video.addEventListener('ended', handleEnded);
        video.addEventListener('play', handlePlay);
        video.addEventListener('pause', handlePause);

        return () => {
            video.removeEventListener('timeupdate', handleTimeUpdate);
            video.removeEventListener('durationchange', handleDurationChange);
            video.removeEventListener('ended', handleEnded);
            video.removeEventListener('play', handlePlay);
            video.removeEventListener('pause', handlePause);
        };
    }, [currentFileIndex, recordings]);

    // Play a specific file
    const playFile = useCallback((index) => {
        if (index < 0 || index >= recordings.length) return;
        
        const file = recordings[index];
        const video = videoRef.current;
        
        if (video) {
            video.src = file.downloadUrl;
            video.load();
            video.play().catch(console.error);
            setCurrentFileIndex(index);
        }
    }, [recordings]);

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
        const video = videoRef.current;
        if (video) {
            video.pause();
            video.currentTime = 0;
            video.src = '';
            setCurrentFileIndex(-1);
            setIsPlaying(false);
            setCurrentTime(0);
            setDuration(0);
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
            video.currentTime = Math.max(0, Math.min(duration, video.currentTime + seconds));
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

    const currentFile = currentFileIndex >= 0 ? recordings[currentFileIndex] : null;

    return (
        <Box className={classes.root}>
            {/* Video Section */}
            <Box className={classes.videoSection}>
                <Box className={classes.videoContainer}>
                    <video
                        ref={videoRef}
                        className={classes.video}
                        playsInline
                    />
                    
                    {/* Playlist indicator */}
                    {currentFile && (
                        <Box className={classes.playlistIndicator}>
                            <Chip
                                size="small"
                                label={`${currentFileIndex + 1} / ${recordings.length}`}
                                sx={{ background: 'rgba(0,0,0,0.7)', color: '#fff' }}
                            />
                            <Chip
                                size="small"
                                label={`${currentFile.date} ${currentFile.time?.replace(/-/g, ':')}`}
                                sx={{ background: 'rgba(99, 102, 241, 0.8)', color: '#fff' }}
                            />
                        </Box>
                    )}

                    {/* Controls Overlay */}
                    <Box className={classes.controlsOverlay}>
                        {/* Progress Bar */}
                        <Slider
                            className={classes.progressBar}
                            value={currentTime}
                            max={duration || 100}
                            onChange={(e, value) => seek(value)}
                            sx={{ py: 1 }}
                        />

                        {/* Control Buttons */}
                        <Box className={classes.controlButtons}>
                            <Typography className={classes.timeDisplay}>
                                {formatTime(currentTime)} / {formatTime(duration)}
                            </Typography>

                            <IconButton className={classes.controlButton} onClick={() => skip(-10)}>
                                <Replay10Icon />
                            </IconButton>

                            <IconButton className={classes.controlButton} onClick={() => changePlaybackRate(0.5)}>
                                <FastRewindIcon fontSize="small" />
                            </IconButton>

                            <IconButton
                                className={classes.controlButton}
                                onClick={togglePlay}
                                sx={{ background: 'rgba(99, 102, 241, 0.8)', '&:hover': { background: '#6366f1' } }}
                            >
                                {isPlaying ? <PauseIcon /> : <PlayArrowIcon />}
                            </IconButton>

                            <IconButton className={classes.controlButton} onClick={stop}>
                                <StopIcon />
                            </IconButton>

                            <IconButton className={classes.controlButton} onClick={() => changePlaybackRate(2)}>
                                <FastForwardIcon fontSize="small" />
                            </IconButton>

                            <IconButton className={classes.controlButton} onClick={() => skip(10)}>
                                <Forward10Icon />
                            </IconButton>

                            <Select
                                value={playbackRate}
                                onChange={(e) => changePlaybackRate(e.target.value)}
                                size="small"
                                sx={{ color: '#fff', minWidth: 70, '& .MuiSelect-icon': { color: '#fff' } }}
                            >
                                <MenuItem value={0.5}>0.5x</MenuItem>
                                <MenuItem value={1}>1x</MenuItem>
                                <MenuItem value={1.5}>1.5x</MenuItem>
                                <MenuItem value={2}>2x</MenuItem>
                            </Select>

                            <IconButton className={classes.controlButton} onClick={toggleMute}>
                                {muted ? <VolumeOffIcon /> : <VolumeUpIcon />}
                            </IconButton>

                            <IconButton className={classes.controlButton} onClick={toggleFullscreen}>
                                <FullscreenIcon />
                            </IconButton>
                        </Box>
                    </Box>
                </Box>
            </Box>

            {/* Sidebar - Filters & File List */}
            <Box className={classes.sidebar}>
                {/* Filter Section */}
                <Paper className={classes.filterSection}>
                    <Typography variant="subtitle2" sx={{ mb: 2, fontWeight: 600 }}>
                        <CalendarTodayIcon fontSize="small" sx={{ mr: 1, verticalAlign: 'middle' }} />
                        Search Recordings
                    </Typography>
                    
                    <FormControl fullWidth size="small" sx={{ mb: 2 }}>
                        <InputLabel>Channel</InputLabel>
                        <Select
                            value={channel}
                            label="Channel"
                            onChange={(e) => setChannel(e.target.value)}
                        >
                            <MenuItem value={1}>Channel 1</MenuItem>
                            <MenuItem value={2}>Channel 2</MenuItem>
                            <MenuItem value={3}>Channel 3</MenuItem>
                            <MenuItem value={4}>Channel 4</MenuItem>
                        </Select>
                    </FormControl>

                    <TextField
                        fullWidth
                        size="small"
                        type="date"
                        label="Start Date"
                        value={startDate}
                        onChange={(e) => setStartDate(e.target.value)}
                        InputLabelProps={{ shrink: true }}
                        sx={{ mb: 2 }}
                    />

                    <TextField
                        fullWidth
                        size="small"
                        type="date"
                        label="End Date"
                        value={endDate}
                        onChange={(e) => setEndDate(e.target.value)}
                        InputLabelProps={{ shrink: true }}
                        sx={{ mb: 2 }}
                    />

                    <Button
                        fullWidth
                        variant="contained"
                        onClick={fetchRecordings}
                        disabled={loading}
                        sx={{ background: '#6366f1', '&:hover': { background: '#4f46e5' } }}
                    >
                        {loading ? <CircularProgress size={20} /> : 'Search'}
                    </Button>
                </Paper>

                {/* File List */}
                <Box className={classes.fileList}>
                    <Box className={classes.fileListHeader}>
                        <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                            <VideoFileIcon fontSize="small" sx={{ mr: 1, verticalAlign: 'middle' }} />
                            Recordings ({recordings.length})
                        </Typography>
                    </Box>

                    <Box className={classes.fileListContent}>
                        {loading ? (
                            <Box className={classes.loadingContainer}>
                                <CircularProgress />
                            </Box>
                        ) : recordings.length === 0 ? (
                            <Box className={classes.noFiles}>
                                <Typography variant="body2">
                                    No recordings found for the selected period
                                </Typography>
                            </Box>
                        ) : (
                            <List disablePadding>
                                {recordings.map((file, index) => (
                                    <ListItem
                                        key={file.path}
                                        className={cx(classes.fileItem, { active: index === currentFileIndex })}
                                        onClick={() => playFile(index)}
                                    >
                                        <ListItemIcon sx={{ minWidth: 36 }}>
                                            <VideoFileIcon color={index === currentFileIndex ? 'primary' : 'action'} />
                                        </ListItemIcon>
                                        <ListItemText
                                            primary={
                                                <Typography variant="body2" sx={{ fontWeight: 500 }}>
                                                    {file.date} {file.time?.replace(/-/g, ':')}
                                                </Typography>
                                            }
                                            secondary={
                                                <Typography variant="caption" color="textSecondary">
                                                    {formatFileSize(file.size)} • {file.format?.toUpperCase()}
                                                </Typography>
                                            }
                                        />
                                    </ListItem>
                                ))}
                            </List>
                        )}
                    </Box>
                </Box>
            </Box>
        </Box>
    );
};

export default VideoPlaybackTab;
