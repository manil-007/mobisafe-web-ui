import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { makeStyles } from 'tss-react/mui';
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
    Paper,
    Grid,
    Card,
    CardMedia,
    CardContent,
    CardActions,
    IconButton,
    Tooltip,
    Chip,
    Dialog,
    DialogContent,
    DialogActions,
    Snackbar,
    Alert,
} from '@mui/material';
import CameraAltIcon from '@mui/icons-material/CameraAlt';
import RefreshIcon from '@mui/icons-material/Refresh';
import DownloadIcon from '@mui/icons-material/Download';
import ZoomInIcon from '@mui/icons-material/ZoomIn';
import DeleteIcon from '@mui/icons-material/Delete';
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
    filterItem: {
        minWidth: 200,
    },
    channelSelector: {
        display: 'flex',
        gap: theme.spacing(1),
        flexWrap: 'wrap',
    },
    channelButton: {
        minWidth: 100,
    },
    imageGrid: {
        marginTop: theme.spacing(2),
    },
    imageCard: {
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
    },
    imageMedia: {
        height: 200,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        cursor: 'pointer',
        '&:hover': {
            opacity: 0.9,
        },
    },
    emptyState: {
        textAlign: 'center',
        padding: theme.spacing(4),
        color: theme.palette.text.secondary,
    },
    previewDialog: {
        '& .MuiDialog-paper': {
            maxWidth: '90vw',
            maxHeight: '90vh',
        },
    },
    previewImage: {
        maxWidth: '100%',
        maxHeight: '80vh',
        objectFit: 'contain',
    },
    captureStatus: {
        display: 'flex',
        alignItems: 'center',
        gap: theme.spacing(1),
        marginTop: theme.spacing(2),
    },
}));

// Image save interval options
const SAVE_INTERVALS = [
    { value: 0, label: 'Save All' },
    { value: 1, label: 'Every 1 second' },
    { value: 2, label: 'Every 2 seconds' },
    { value: 5, label: 'Every 5 seconds' },
    { value: 10, label: 'Every 10 seconds' },
];

// Image resolution options
const RESOLUTIONS = [
    { value: 0x01, label: '320×240' },
    { value: 0x02, label: '640×480' },
    { value: 0x03, label: '800×600' },
    { value: 0x04, label: '1024×768' },
    { value: 0x05, label: '176×144' },
    { value: 0x06, label: '352×288' },
    { value: 0x07, label: '704×288' },
    { value: 0x08, label: '704×576' },
];

// Image quality options
const QUALITIES = [
    { value: 1, label: 'Very Low' },
    { value: 2, label: 'Low' },
    { value: 3, label: 'Normal' },
    { value: 4, label: 'High' },
    { value: 5, label: 'Very High' },
];

// Brightness options
const BRIGHTNESS = [
    { value: 0, label: 'Auto' },
    { value: 127, label: 'Medium' },
    { value: 255, label: 'Bright' },
];

// Contrast options
const CONTRAST = [
    { value: 0, label: 'Auto' },
    { value: 127, label: 'Medium' },
    { value: 255, label: 'High' },
];

// Saturation options
const SATURATION = [
    { value: 0, label: 'Auto' },
    { value: 127, label: 'Medium' },
    { value: 255, label: 'Vivid' },
];

// Chroma options
const CHROMA = [
    { value: 0, label: 'Auto' },
    { value: 127, label: 'Normal' },
    { value: 255, label: 'High' },
];

const PhotoCapture = () => {
    const { classes: reportClasses } = useReportStyles();
    const { classes } = useStyles();
    const navigate = useNavigate();
    const t = useTranslation();
    const { deviceId: paramDeviceId } = useParams();
    
    const [devices, setDevices] = useState([]);
    const [fetchingDevices, setFetchingDevices] = useState(true);
    const selectedDeviceId = useSelector((state) => state.devices.selectedId);
    const deviceId = paramDeviceId || selectedDeviceId;

    // Capture settings
    const [selectedChannels, setSelectedChannels] = useState([1]);
    const [saveInterval, setSaveInterval] = useState(0);
    const [resolution, setResolution] = useState(0x03);
    const [quality, setQuality] = useState(3);
    const [brightness, setBrightness] = useState(127);
    const [contrast, setContrast] = useState(127);
    const [saturation, setSaturation] = useState(127);
    const [chroma, setChroma] = useState(127);

    // UI state
    const [isCapturing, setIsCapturing] = useState(false);
    const [capturedImages, setCapturedImages] = useState([]);
    const [loadingImages, setLoadingImages] = useState(false);
    const [previewImage, setPreviewImage] = useState(null);
    const [toast, setToast] = useState({ open: false, message: '', severity: 'info' });

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
    
    const isUnknown = !currentDevice || currentDevice.status === 'unknown' || currentDevice.status === 'offline';

    // Load captured images for the device
    const loadCapturedImages = useCallback(async () => {
        if (!currentDevice?.uniqueId) return;
        
        setLoadingImages(true);
        try {
            // Fetch positions with images for this device
            const response = await fetch(
                `/api/positions?deviceId=${deviceId}&from=${new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()}&to=${new Date().toISOString()}`
            );
            
            if (response.ok) {
                const positions = await response.json();
                // Filter positions that have images
                const imagesFromPositions = positions
                    .filter(p => p.attributes?.image)
                    .map(p => ({
                        id: p.id,
                        url: `/api/media/${currentDevice.uniqueId}/${p.attributes.image}`,
                        timestamp: p.deviceTime || p.fixTime,
                        channel: p.attributes.channel || 'Unknown',
                        thumbnail: `/api/media/${currentDevice.uniqueId}/${p.attributes.image}`,
                    }));
                setCapturedImages(imagesFromPositions);
            }
        } catch (err) {
            console.error('Failed to load images:', err);
            setToast({ open: true, message: 'Failed to load captured images', severity: 'error' });
        } finally {
            setLoadingImages(false);
        }
    }, [currentDevice?.uniqueId, deviceId]);

    // Load images when device changes
    useEffect(() => {
        if (currentDevice?.uniqueId) {
            loadCapturedImages();
        }
    }, [currentDevice?.uniqueId, loadCapturedImages]);

    // Toggle channel selection
    const toggleChannel = (channel) => {
        setSelectedChannels(prev => {
            if (prev.includes(channel)) {
                return prev.filter(c => c !== channel);
            }
            return [...prev, channel].sort();
        });
    };

    // Send capture command
    const handleCapture = async () => {
        if (!deviceId || selectedChannels.length === 0 || isUnknown) return;
        
        setIsCapturing(true);
        
        try {
            // Build channel flags (bitmask)
            const channelFlags = selectedChannels.reduce((acc, ch) => acc | (1 << (ch - 1)), 0);
            
            const payload = {
                attributes: {
                    channel: channelFlags,
                    command: 0, // 0 = take photo
                    interval: saveInterval,
                    saveFlag: 1, // 1 = save, 0 = real-time upload
                    resolution: resolution,
                    quality: quality,
                    brightness: brightness,
                    contrast: contrast,
                    saturation: saturation,
                    chroma: chroma,
                },
                deviceId: parseInt(deviceId, 10),
                type: 'cameraCapture',
                textChannel: false,
            };

            const response = await fetch('/api/commands/send', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });

            if (response.ok) {
                setToast({ 
                    open: true, 
                    message: `Capture command sent for channel(s) ${selectedChannels.join(', ')}. Images will appear shortly.`, 
                    severity: 'success' 
                });
                
                // Refresh images after a delay
                setTimeout(() => {
                    loadCapturedImages();
                }, 5000);
            } else {
                throw new Error('Failed to send capture command');
            }
        } catch (err) {
            setToast({ open: true, message: err.message, severity: 'error' });
        } finally {
            setIsCapturing(false);
        }
    };

    // Download image
    const handleDownload = async (image) => {
        try {
            const response = await fetch(image.url);
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `capture_${currentDevice.uniqueId}_ch${image.channel}_${new Date(image.timestamp).getTime()}.jpg`;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);
        } catch (err) {
            setToast({ open: true, message: 'Failed to download image', severity: 'error' });
        }
    };

    return (
        <PageLayout menu={<ReportsMenu />} breadcrumbs={['reportTitle', 'Photo Capture']}>
            <div className={reportClasses.container}>
                <div className={reportClasses.header}>
                    <div className={reportClasses.filter}>
                        <div className={classes.filterItem}>
                            <Autocomplete
                                options={devices}
                                loading={fetchingDevices}
                                getOptionLabel={(option) => `${option.name} (${option.protocol || option.model || 'Unknown'})`}
                                value={currentDevice || null}
                                onChange={(_, newValue) => {
                                    if (newValue) {
                                        navigate(`/reports/capture/${newValue.id}`);
                                    }
                                }}
                                renderInput={(params) => (
                                    <TextField
                                        {...params}
                                        label="Select Device"
                                        variant="outlined"
                                        size="small"
                                    />
                                )}
                            />
                        </div>
                    </div>
                </div>
                
                <div className={reportClasses.containerMain} style={{ padding: '0 2rem 2rem' }}>
                    {fetchingDevices ? (
                        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
                            <CircularProgress />
                        </Box>
                    ) : devices.length === 0 ? (
                        <Typography variant="h6" align="center" sx={{ mt: 4, color: 'textSecondary' }}>
                            No JT808 devices found in your account.
                        </Typography>
                    ) : !deviceId ? (
                        <Typography variant="h6" align="center" sx={{ mt: 4, color: 'textSecondary' }}>
                            Please select a device for photo capture.
                        </Typography>
                    ) : (
                        <Box className={classes.container}>
                            {/* Capture Controls */}
                            <Paper sx={{ p: 2 }}>
                                <Typography variant="h6" gutterBottom>Capture Settings</Typography>
                                
                                <Box className={classes.controlsRow}>
                                    {/* Channel Selection */}
                                    <Box>
                                        <Typography variant="caption" color="textSecondary">Channels</Typography>
                                        <Box className={classes.channelSelector}>
                                            {[1, 2, 3, 4].map((ch) => (
                                                <Button
                                                    key={ch}
                                                    variant={selectedChannels.includes(ch) ? 'contained' : 'outlined'}
                                                    onClick={() => toggleChannel(ch)}
                                                    size="small"
                                                >
                                                    Ch {ch}
                                                </Button>
                                            ))}
                                        </Box>
                                    </Box>
                                    
                                    {/* Resolution */}
                                    <FormControl size="small" sx={{ minWidth: 120 }}>
                                        <InputLabel>Resolution</InputLabel>
                                        <Select
                                            value={resolution}
                                            label="Resolution"
                                            onChange={(e) => setResolution(e.target.value)}
                                        >
                                            {RESOLUTIONS.map((r) => (
                                                <MenuItem key={r.value} value={r.value}>{r.label}</MenuItem>
                                            ))}
                                        </Select>
                                    </FormControl>
                                    
                                    {/* Quality */}
                                    <FormControl size="small" sx={{ minWidth: 100 }}>
                                        <InputLabel>Quality</InputLabel>
                                        <Select
                                            value={quality}
                                            label="Quality"
                                            onChange={(e) => setQuality(e.target.value)}
                                        >
                                            {QUALITIES.map((q) => (
                                                <MenuItem key={q.value} value={q.value}>{q.label}</MenuItem>
                                            ))}
                                        </Select>
                                    </FormControl>
                                    
                                    {/* Brightness */}
                                    <FormControl size="small" sx={{ minWidth: 100 }}>
                                        <InputLabel>Brightness</InputLabel>
                                        <Select
                                            value={brightness}
                                            label="Brightness"
                                            onChange={(e) => setBrightness(e.target.value)}
                                        >
                                            {BRIGHTNESS.map((b) => (
                                                <MenuItem key={b.value} value={b.value}>{b.label}</MenuItem>
                                            ))}
                                        </Select>
                                    </FormControl>
                                    
                                    {/* Capture Button */}
                                    <Button
                                        variant="contained"
                                        color="primary"
                                        onClick={handleCapture}
                                        disabled={isCapturing || isUnknown || selectedChannels.length === 0}
                                        startIcon={isCapturing ? <CircularProgress size={20} /> : <CameraAltIcon />}
                                    >
                                        {isCapturing ? 'Capturing...' : 'Capture Photo'}
                                    </Button>
                                    
                                    {/* Refresh Button */}
                                    <Tooltip title="Refresh Images">
                                        <IconButton onClick={loadCapturedImages} disabled={loadingImages}>
                                            <RefreshIcon />
                                        </IconButton>
                                    </Tooltip>
                                </Box>
                                
                                {isUnknown && (
                                    <Typography color="error" sx={{ mt: 1 }}>
                                        Device is offline. Photo capture is not available.
                                    </Typography>
                                )}
                            </Paper>
                            
                            {/* Captured Images Gallery */}
                            <Paper sx={{ p: 2 }}>
                                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                                    <Typography variant="h6">
                                        Captured Images
                                        {capturedImages.length > 0 && (
                                            <Chip 
                                                label={capturedImages.length} 
                                                size="small" 
                                                sx={{ ml: 1 }} 
                                            />
                                        )}
                                    </Typography>
                                </Box>
                                
                                {loadingImages ? (
                                    <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
                                        <CircularProgress />
                                    </Box>
                                ) : capturedImages.length === 0 ? (
                                    <Box className={classes.emptyState}>
                                        <CameraAltIcon sx={{ fontSize: 64, opacity: 0.3 }} />
                                        <Typography variant="body1" sx={{ mt: 2 }}>
                                            No captured images in the last 24 hours
                                        </Typography>
                                        <Typography variant="body2">
                                            Use the capture button to take photos from the device camera
                                        </Typography>
                                    </Box>
                                ) : (
                                    <Grid container spacing={2} className={classes.imageGrid}>
                                        {capturedImages.map((image) => (
                                            <Grid item xs={12} sm={6} md={4} lg={3} key={image.id}>
                                                <Card className={classes.imageCard}>
                                                    <CardMedia
                                                        className={classes.imageMedia}
                                                        image={image.thumbnail}
                                                        title={`Channel ${image.channel}`}
                                                        onClick={() => setPreviewImage(image)}
                                                    />
                                                    <CardContent sx={{ py: 1 }}>
                                                        <Typography variant="caption" color="textSecondary">
                                                            {new Date(image.timestamp).toLocaleString()}
                                                        </Typography>
                                                        <Typography variant="body2">
                                                            Channel {image.channel}
                                                        </Typography>
                                                    </CardContent>
                                                    <CardActions sx={{ pt: 0 }}>
                                                        <Tooltip title="View">
                                                            <IconButton 
                                                                size="small" 
                                                                onClick={() => setPreviewImage(image)}
                                                            >
                                                                <ZoomInIcon />
                                                            </IconButton>
                                                        </Tooltip>
                                                        <Tooltip title="Download">
                                                            <IconButton 
                                                                size="small" 
                                                                onClick={() => handleDownload(image)}
                                                            >
                                                                <DownloadIcon />
                                                            </IconButton>
                                                        </Tooltip>
                                                    </CardActions>
                                                </Card>
                                            </Grid>
                                        ))}
                                    </Grid>
                                )}
                            </Paper>
                        </Box>
                    )}
                </div>
            </div>
            
            {/* Image Preview Dialog */}
            <Dialog
                open={!!previewImage}
                onClose={() => setPreviewImage(null)}
                maxWidth="lg"
                className={classes.previewDialog}
            >
                <DialogContent>
                    {previewImage && (
                        <img
                            src={previewImage.url}
                            alt={`Channel ${previewImage.channel}`}
                            className={classes.previewImage}
                        />
                    )}
                </DialogContent>
                <DialogActions>
                    {previewImage && (
                        <Button 
                            startIcon={<DownloadIcon />}
                            onClick={() => handleDownload(previewImage)}
                        >
                            Download
                        </Button>
                    )}
                    <Button onClick={() => setPreviewImage(null)}>Close</Button>
                </DialogActions>
            </Dialog>
            
            {/* Toast notifications */}
            <Snackbar 
                open={toast.open} 
                autoHideDuration={6000} 
                onClose={() => setToast({ ...toast, open: false })}
            >
                <Alert severity={toast.severity} onClose={() => setToast({ ...toast, open: false })}>
                    {toast.message}
                </Alert>
            </Snackbar>
        </PageLayout>
    );
};

export default PhotoCapture;
