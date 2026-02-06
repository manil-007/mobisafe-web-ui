import { useMemo } from 'react';

export default (t) => useMemo(() => ({
  custom: [
    {
      key: 'data',
      name: t('commandData'),
      type: 'string',
    },
  ],
  positionPeriodic: [
    {
      key: 'frequency',
      name: t('commandFrequency'),
      type: 'number',
    },
  ],
  setTimezone: [
    {
      key: 'timezone',
      name: t('commandTimezone'),
      type: 'string',
    },
  ],
  sendSms: [
    {
      key: 'phone',
      name: t('commandPhone'),
      type: 'string',
    },
    {
      key: 'message',
      name: t('commandMessage'),
      type: 'string',
    },
  ],
  message: [
    {
      key: 'message',
      name: t('commandMessage'),
      type: 'string',
    },
  ],
  sendUssd: [
    {
      key: 'phone',
      name: t('commandPhone'),
      type: 'string',
    },
  ],
  sosNumber: [
    {
      key: 'index',
      name: t('commandIndex'),
      type: 'number',
    },
    {
      key: 'phone',
      name: t('commandPhone'),
      type: 'string',
    },
  ],
  silenceTime: [
    {
      key: 'data',
      name: t('commandData'),
      type: 'string',
    },
  ],
  setPhonebook: [
    {
      key: 'data',
      name: t('commandData'),
      type: 'string',
    },
  ],
  voiceMessage: [
    {
      key: 'data',
      name: t('commandData'),
      type: 'string',
    },
  ],
  outputControl: [
    {
      key: 'index',
      name: t('commandIndex'),
      type: 'number',
    },
    {
      key: 'data',
      name: t('commandData'),
      type: 'string',
    },
  ],
  voiceMonitoring: [
    {
      key: 'enable',
      name: t('commandEnable'),
      type: 'boolean',
    },
  ],
  setAgps: [
    {
      key: 'enable',
      name: t('commandEnable'),
      type: 'boolean',
    },
  ],
  setIndicator: [
    {
      key: 'data',
      name: t('commandData'),
      type: 'string',
    },
  ],
  configuration: [
    {
      key: 'data',
      name: t('commandData'),
      type: 'string',
    },
  ],
  setConnection: [
    {
      key: 'server',
      name: t('commandServer'),
      type: 'string',
    },
    {
      key: 'port',
      name: t('commandPort'),
      type: 'number',
    },
  ],
  setOdometer: [
    {
      key: 'data',
      name: t('commandData'),
      type: 'string',
    },
  ],
  modePowerSaving: [
    {
      key: 'enable',
      name: t('commandEnable'),
      type: 'boolean',
    },
  ],
  modeDeepSleep: [
    {
      key: 'enable',
      name: t('commandEnable'),
      type: 'boolean',
    },
  ],
  alarmGeofence: [
    {
      key: 'radius',
      name: t('commandRadius'),
      type: 'number',
    },
  ],
  alarmBattery: [
    {
      key: 'enable',
      name: t('commandEnable'),
      type: 'boolean',
    },
  ],
  alarmSos: [
    {
      key: 'enable',
      name: t('commandEnable'),
      type: 'boolean',
    },
  ],
  alarmRemove: [
    {
      key: 'enable',
      name: t('commandEnable'),
      type: 'boolean',
    },
  ],
  alarmClock: [
    {
      key: 'data',
      name: t('commandData'),
      type: 'string',
    },
  ],
  alarmSpeed: [
    {
      key: 'data',
      name: t('commandData'),
      type: 'string',
    },
  ],
  alarmFall: [
    {
      key: 'enable',
      name: t('commandEnable'),
      type: 'boolean',
    },
  ],
  alarmVibration: [
    {
      key: 'data',
      name: t('commandData'),
      type: 'string',
    },
  ],
  // JT1078 Video Commands
  videoStart: [
    {
      key: 'channel',
      name: t('commandChannel'),
      type: 'number',
    },
    {
      key: 'mediaType',
      name: t('commandMediaType'),
      type: 'number',
      options: [
        { value: 0, label: t('commandMediaTypeAV') },
        { value: 1, label: t('commandMediaTypeVideo') },
        { value: 2, label: t('commandMediaTypeDual') },
        { value: 3, label: t('commandMediaTypeAudio') },
      ],
    },
    {
      key: 'streamType',
      name: t('commandStreamType'),
      type: 'number',
      options: [
        { value: 0, label: t('commandStreamTypeMain') },
        { value: 1, label: t('commandStreamTypeSub') },
      ],
    },
  ],
  videoStop: [
    {
      key: 'channel',
      name: t('commandChannel'),
      type: 'number',
    },
  ],
  videoPause: [
    {
      key: 'channel',
      name: t('commandChannel'),
      type: 'number',
    },
  ],
  videoResume: [
    {
      key: 'channel',
      name: t('commandChannel'),
      type: 'number',
    },
  ],
  videoKeyFrame: [
    {
      key: 'channel',
      name: t('commandChannel'),
      type: 'number',
    },
  ],
  videoPlaybackStart: [
    {
      key: 'channel',
      name: t('commandChannel'),
      type: 'number',
    },
    {
      key: 'mediaType',
      name: t('commandMediaType'),
      type: 'number',
      options: [
        { value: 0, label: t('commandMediaTypeAV') },
        { value: 1, label: t('commandMediaTypeVideo') },
        { value: 2, label: t('commandMediaTypeDual') },
        { value: 3, label: t('commandMediaTypeAudio') },
      ],
    },
    {
      key: 'streamType',
      name: t('commandStreamType'),
      type: 'number',
      options: [
        { value: 0, label: t('commandStreamTypeMain') },
        { value: 1, label: t('commandStreamTypeSub') },
      ],
    },
    {
      key: 'playbackStartTime',
      name: 'Start Time',
      type: 'string',
    },
    {
      key: 'playbackEndTime',
      name: 'End Time',
      type: 'string',
    },
  ],
  videoPlaybackControl: [
    {
      key: 'channel',
      name: t('commandChannel'),
      type: 'number',
    },
    {
      key: 'playbackSpeed',
      name: 'Playback Speed',
      type: 'number',
    },
  ],
  cameraCapture: [
    {
      key: 'channel',
      name: t('commandChannel'),
      type: 'number',
    },
    {
      key: 'captureCommand',
      name: 'Capture Count',
      type: 'number',
    },
    {
      key: 'captureInterval',
      name: 'Interval (seconds)',
      type: 'number',
    },
    {
      key: 'saveFlag',
      name: 'Save to Device',
      type: 'boolean',
    },
    {
      key: 'resolution',
      name: 'Resolution',
      type: 'number',
    },
    {
      key: 'quality',
      name: 'Quality (1-10)',
      type: 'number',
    },
  ],
  audioRecordStart: [
    {
      key: 'channel',
      name: t('commandChannel'),
      type: 'number',
    },
    {
      key: 'duration',
      name: 'Duration (seconds)',
      type: 'number',
    },
    {
      key: 'audioSampleRate',
      name: 'Sample Rate',
      type: 'number',
    },
  ],
  audioRecordStop: [
    {
      key: 'channel',
      name: t('commandChannel'),
      type: 'number',
    },
  ],
  talkStart: [
    {
      key: 'channel',
      name: t('commandChannel'),
      type: 'number',
    },
  ],
  talkStop: [
    {
      key: 'channel',
      name: t('commandChannel'),
      type: 'number',
    },
  ],
  broadcastStart: [
    {
      key: 'channel',
      name: t('commandChannel'),
      type: 'number',
    },
  ],
  broadcastStop: [
    {
      key: 'channel',
      name: t('commandChannel'),
      type: 'number',
    },
  ],
  cloudControl: [
    {
      key: 'channel',
      name: t('commandChannel'),
      type: 'number',
    },
    {
      key: 'ptzDirection',
      name: 'PTZ Direction',
      type: 'number',
    },
    {
      key: 'ptzSpeed',
      name: 'PTZ Speed',
      type: 'number',
    },
    {
      key: 'zoom',
      name: 'Zoom',
      type: 'number',
    },
  ],
  queryResourceList: [
    {
      key: 'channel',
      name: t('commandChannel'),
      type: 'number',
    },
    {
      key: 'mediaType',
      name: t('commandMediaType'),
      type: 'number',
    },
    {
      key: 'playbackStartTime',
      name: 'Start Time',
      type: 'string',
    },
    {
      key: 'playbackEndTime',
      name: 'End Time',
      type: 'string',
    },
  ],
  fileUpload: [
    {
      key: 'channel',
      name: t('commandChannel'),
      type: 'number',
    },
    {
      key: 'playbackStartTime',
      name: 'Start Time',
      type: 'string',
    },
    {
      key: 'playbackEndTime',
      name: 'End Time',
      type: 'string',
    },
  ],
}), [t]);
