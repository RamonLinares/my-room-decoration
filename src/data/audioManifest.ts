export type AudioBusName = 'ui' | 'world' | 'ambience';

export type AudioCueDefinition = {
  id: string;
  bus: AudioBusName;
  urls: readonly string[];
  volume: number;
  cooldownMs: number;
  loop?: boolean;
};

const audioAsset = (path: string) =>
  `${import.meta.env.BASE_URL}assets/audio/${path}`;

export const AUDIO_MANIFEST = [
  {
    id: 'ambience.room',
    bus: 'ambience',
    urls: [audioAsset('ambience/cozy-room-loop.mp3')],
    volume: 0.48,
    cooldownMs: 0,
    loop: true,
  },
  {
    id: 'ui.select',
    bus: 'ui',
    urls: [audioAsset('ui/select-soft.mp3')],
    volume: 0.34,
    cooldownMs: 45,
  },
  {
    id: 'ui.confirm',
    bus: 'ui',
    urls: [audioAsset('ui/confirm-warm.mp3')],
    volume: 0.3,
    cooldownMs: 90,
  },
  {
    id: 'ui.cancel',
    bus: 'ui',
    urls: [audioAsset('ui/cancel-soft.mp3')],
    volume: 0.42,
    cooldownMs: 90,
  },
  {
    id: 'world.place',
    bus: 'world',
    urls: [
      audioAsset('world/place-wood-01.mp3'),
      audioAsset('world/place-wood-02.mp3'),
    ],
    volume: 0.38,
    cooldownMs: 85,
  },
  {
    id: 'world.remove',
    bus: 'world',
    urls: [audioAsset('world/remove-soft.mp3')],
    volume: 0.5,
    cooldownMs: 120,
  },
  {
    id: 'world.invalid',
    bus: 'world',
    urls: [audioAsset('world/invalid-gentle.mp3')],
    volume: 0.52,
    cooldownMs: 180,
  },
  {
    id: 'world.rotate',
    bus: 'world',
    urls: [audioAsset('world/rotate-soft.mp3')],
    volume: 0.34,
    cooldownMs: 70,
  },
  {
    id: 'world.camera',
    bus: 'world',
    urls: [audioAsset('world/camera-vintage.mp3')],
    volume: 0.34,
    cooldownMs: 350,
  },
  {
    id: 'world.step.wood',
    bus: 'world',
    urls: [audioAsset('world/step-wood.mp3')],
    volume: 0.2,
    cooldownMs: 230,
  },
  {
    id: 'world.step.rug',
    bus: 'world',
    urls: [audioAsset('world/step-rug.mp3')],
    volume: 0.22,
    cooldownMs: 230,
  },
] as const satisfies readonly AudioCueDefinition[];

export type AudioCueId = (typeof AUDIO_MANIFEST)[number]['id'];
