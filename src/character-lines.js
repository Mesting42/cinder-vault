// Pre-rendered natural speech; no online synthesis during gameplay.
export const CHARACTER_LINES={
  "shooter": [
    {
      "text": "枪膛里还有余火。这趟，我来开路。",
      "audio": "/audio/voice-shooter-1-29d8459c49.mp3"
    },
    {
      "text": "别替我数子弹。替他们敲钟。",
      "audio": "/audio/voice-shooter-2-09e3fabb85.mp3"
    }
  ],
  "mage": [
    {
      "text": "把灯交给我。黑暗，也会在霜中安静。",
      "audio": "/audio/voice-mage-1-5b27ffa070.mp3"
    },
    {
      "text": "钟声留给亡者。活着的人，跟紧我的霜灯。",
      "audio": "/audio/voice-mage-2-03ee971d29.mp3"
    }
  ],
  "warrior": [
    {
      "text": "站到我身后。这一刀，劈开前路。",
      "audio": "/audio/voice-warrior-1-07dd760c0e.mp3"
    },
    {
      "text": "门若不开，就让它记住我的剑。",
      "audio": "/audio/voice-warrior-2-ec87cc52fd.mp3"
    }
  ]
};
export const VOICE_PROFILES={
  "shooter": {
    "voice": "zh-CN-YunxiNeural",
    "rate": "+3%",
    "pitch": "-2Hz",
    "description": "清晰利落的青年男声"
  },
  "mage": {
    "voice": "zh-CN-XiaoyiNeural",
    "rate": "-5%",
    "pitch": "+3Hz",
    "description": "轻柔少女音"
  },
  "warrior": {
    "voice": "zh-CN-YunjianNeural",
    "rate": "-8%",
    "pitch": "-12Hz",
    "description": "低沉有力量的男声"
  }
};
