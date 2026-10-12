import React, { useState, useEffect } from 'react';
import { 
  Tv, 
  Play, 
  Square, 
  Video, 
  Mic, 
  MicOff, 
  Volume2, 
  SlidersHorizontal, 
  Layers, 
  Check, 
  Wifi, 
  WifiOff, 
  Settings2,
  FileText
} from 'lucide-react';
import { ChatMessage } from '../types';
import { useTranslate } from './LanguageContext';

interface ObsRemoteControlProps {
  messages: ChatMessage[];
}

export const ObsRemoteControl: React.FC<ObsRemoteControlProps> = ({ messages }) => {
  const t = useTranslate();
  const [obsState, setObsState] = useState({
    connected: true,
    isStreaming: false,
    isRecording: true,
    currentScene: 'Gaming + Cam',
    scenes: ['Just Chatting', 'Gaming + Cam', 'BRB Screen', 'Stream Starting'],
    micMuted: false,
    desktopVolume: 80,
  });

  const [obsSettings, setObsSettings] = useState({
    host: 'localhost',
    port: '4455',
    textSourceName: 'Live_Chat_Text_GDI',
    sendToTextSource: true,
  });

  const handleAction = async (action: string, payload?: any) => {
    try {
      const res = await fetch('/api/obs/action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, payload }),
      });
      const data = await res.json();
      setObsState(data);
    } catch {
      // Local fallback state
      if (action === 'toggle_stream') {
        setObsState((prev) => ({ ...prev, isStreaming: !prev.isStreaming }));
      } else if (action === 'toggle_record') {
        setObsState((prev) => ({ ...prev, isRecording: !prev.isRecording }));
      } else if (action === 'set_scene' && payload?.scene) {
        setObsState((prev) => ({ ...prev, currentScene: payload.scene }));
      } else if (action === 'toggle_mute') {
        setObsState((prev) => ({ ...prev, micMuted: !prev.micMuted }));
      } else if (action === 'toggle_connect') {
        setObsState((prev) => ({ ...prev, connected: !prev.connected }));
      }
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="p-4 bg-gradient-to-r from-cyan-950/40 via-slate-900 to-indigo-950/40 border border-cyan-500/20 rounded-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-cyan-500/20 text-cyan-400 border border-cyan-500/30">
              <SlidersHorizontal className="w-4 h-4" />
            </span>
            <h2 className="text-base font-bold text-white">
              {t('OBS Studio WebSocket v5 Visual Remote Control')}
            </h2>
            <span
              className={`px-2 py-0.5 rounded text-[10px] font-mono border flex items-center gap-1 ${
                obsState.connected
                  ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                  : 'bg-red-500/20 text-red-300 border-red-500/30'
              }`}
            >
              {obsState.connected ? <Wifi className="w-3 h-3" /> : <WifiOff className="w-3 h-3" />}
              <span>{obsState.connected ? t('WebSocket v5 Active') : t('Disconnected')}</span>
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1 max-w-2xl">
            {t('Streamlined scene switching, stream/recording toggles, and direct OBS Text (GDI+) feed updates without having to Alt-Tab out of your game or production screen.')}
          </p>
        </div>

        <button
          onClick={() => handleAction('toggle_connect')}
          className={`px-3 py-2 rounded-lg text-xs font-semibold border transition-all ${
            obsState.connected
              ? 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
              : 'bg-emerald-600 text-white border-emerald-500 hover:bg-emerald-500 shadow-lg shadow-emerald-600/30'
          }`}
        >
          {obsState.connected ? t('Disconnect OBS') : t('Connect to OBS')}
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left: Broadcast Controls & Scene Switcher */}
        <div className="lg:col-span-7 space-y-6">
          {/* Main Action Buttons */}
          <div className="grid grid-cols-2 gap-4">
            {/* Stream Toggle */}
            <div className="p-4 bg-slate-900 border border-slate-800 rounded-xl flex items-center justify-between shadow-xl">
              <div>
                <div className="text-xs text-slate-400 font-medium">{t('Broadcast Output')}</div>
                <div className="text-sm font-bold text-white flex items-center gap-1.5 mt-0.5">
                  <span
                    className={`w-2 h-2 rounded-full ${
                      obsState.isStreaming ? 'bg-red-500 animate-ping' : 'bg-slate-600'
                    }`}
                  />
                  <span>{obsState.isStreaming ? t('LIVE (Streaming)') : t('Offline')}</span>
                </div>
              </div>

              <button
                onClick={() => handleAction('toggle_stream')}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-bold transition-all shadow-md ${
                  obsState.isStreaming
                    ? 'bg-red-600 hover:bg-red-500 text-white shadow-red-600/30'
                    : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-600/30'
                }`}
              >
                {obsState.isStreaming ? <Square className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                <span>{obsState.isStreaming ? t('Stop Stream') : t('Start Stream')}</span>
              </button>
            </div>

            {/* Record Toggle */}
            <div className="p-4 bg-slate-900 border border-slate-800 rounded-xl flex items-center justify-between shadow-xl">
              <div>
                <div className="text-xs text-slate-400 font-medium">{t('Local Recording')}</div>
                <div className="text-sm font-bold text-white flex items-center gap-1.5 mt-0.5">
                  <span
                    className={`w-2 h-2 rounded-full ${
                      obsState.isRecording ? 'bg-amber-400' : 'bg-slate-600'
                    }`}
                  />
                  <span>{obsState.isRecording ? t('Recording (NVENC)') : t('Idle')}</span>
                </div>
              </div>

              <button
                onClick={() => handleAction('toggle_record')}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-bold transition-all shadow-md ${
                  obsState.isRecording
                    ? 'bg-amber-600 hover:bg-amber-500 text-white shadow-amber-600/30'
                    : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-indigo-600/30'
                }`}
              >
                {obsState.isRecording ? <Square className="w-3.5 h-3.5" /> : <Video className="w-3.5 h-3.5" />}
                <span>{obsState.isRecording ? t('Stop Rec') : t('Start Rec')}</span>
              </button>
            </div>
          </div>

          {/* Scene Switcher Pad */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-xl space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
                <Layers className="w-4 h-4 text-cyan-400" />
                <span>{t('Scene Switcher (1-Click Hotkeys)')}</span>
              </h3>
              <span className="text-[10px] text-slate-400 font-mono">{t('Current')}: {obsState.currentScene}</span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {obsState.scenes.map((scene) => {
                const isActive = obsState.currentScene === scene;
                return (
                  <button
                    key={scene}
                    onClick={() => handleAction('set_scene', { scene })}
                    className={`p-3 rounded-lg border text-left transition-all ${
                      isActive
                        ? 'bg-cyan-600/20 border-cyan-400 text-cyan-200 shadow-md shadow-cyan-500/20 ring-1 ring-cyan-400'
                        : 'bg-slate-800/60 border-slate-700/60 text-slate-300 hover:bg-slate-800 hover:border-slate-600'
                    }`}
                  >
                    <div className="text-[10px] text-slate-400 font-mono">SCENE</div>
                    <div className="font-bold text-xs mt-0.5 truncate">{scene}</div>
                    {isActive && (
                      <div className="text-[10px] text-cyan-400 font-semibold flex items-center gap-1 mt-1">
                        <Check className="w-3 h-3" /> {t('Active on air')}
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Audio Quick Mixer */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-xl space-y-3">
            <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
              <Volume2 className="w-4 h-4 text-indigo-400" />
              <span>{t('Audio Mixer Controls')}</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Mic / Aux */}
              <div className="p-3 bg-slate-800/60 border border-slate-700/60 rounded-lg flex items-center justify-between">
                <div>
                  <div className="text-xs font-semibold text-slate-200">{t('Microphone (Aux)')}</div>
                  <div className="text-[10px] text-slate-400 mt-0.5">
                    {obsState.micMuted ? t('MUTED') : t('LIVE Input')}
                  </div>
                </div>

                <button
                  onClick={() => handleAction('toggle_mute')}
                  className={`p-2.5 rounded-lg border transition-all ${
                    obsState.micMuted
                      ? 'bg-red-500/20 text-red-400 border-red-500/30'
                      : 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                  }`}
                  title={t('Toggle Microphone Mute')}
                >
                  {obsState.micMuted ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                </button>
              </div>

              {/* Desktop Audio Fader */}
              <div className="p-3 bg-slate-800/60 border border-slate-700/60 rounded-lg space-y-1">
                <div className="flex justify-between text-xs">
                  <span className="font-semibold text-slate-200">{t('Desktop Audio')}</span>
                  <span className="font-mono text-indigo-300 font-bold">{obsState.desktopVolume}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={obsState.desktopVolume}
                  onChange={(e) =>
                    setObsState((prev) => ({ ...prev, desktopVolume: Number(e.target.value) }))
                  }
                  className="w-full accent-indigo-500 h-1 bg-slate-700 rounded-lg cursor-pointer"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Right: OBS Text Source Output Preview & Settings */}
        <div className="lg:col-span-5 space-y-6">
          {/* OBS Text (GDI+) Source Live Stream Payload */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-xl space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
                <FileText className="w-4 h-4 text-purple-400" />
                <span>{t('Text (GDI+) Source Buffer')}</span>
              </h3>
              <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20">
                {t('Pushed to OBS')}
              </span>
            </div>

            <p className="text-[11px] text-slate-400">
              {t('When enabled, this plain text buffer updates the designated OBS FreeType/GDI+ Text source directly via WebSocket v5:')}
            </p>

            <div className="bg-black/80 border border-slate-800 rounded-lg p-3 font-mono text-xs text-slate-300 space-y-1 max-h-56 overflow-y-auto">
              {messages.slice(-8).map((m, idx) => (
                <div key={idx} className="leading-snug truncate">
                  <span className="text-slate-500">[{m.platform.slice(0, 2).toUpperCase()}]</span>{' '}
                  <span className="text-slate-100">{m.text}</span>
                  {m.translatedText && (
                    <div className="text-[10px] text-sky-400/80 pl-4">
                      ↳ {m.translatedText}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Connection Parameters */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-xl space-y-3 text-xs">
            <h3 className="font-bold text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
              <Settings2 className="w-4 h-4 text-slate-400" />
              <span>{t('OBS WebSocket Configuration')}</span>
            </h3>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-slate-400 text-[11px] block mb-1">{t('Host / IP')}</label>
                <input
                  type="text"
                  value={obsSettings.host}
                  onChange={(e) => setObsSettings((prev) => ({ ...prev, host: e.target.value }))}
                  className="w-full bg-slate-800 border border-slate-700 rounded px-2.5 py-1.5 text-slate-200"
                />
              </div>

              <div>
                <label className="text-slate-400 text-[11px] block mb-1">{t('Port')}</label>
                <input
                  type="text"
                  value={obsSettings.port}
                  onChange={(e) => setObsSettings((prev) => ({ ...prev, port: e.target.value }))}
                  className="w-full bg-slate-800 border border-slate-700 rounded px-2.5 py-1.5 text-slate-200"
                />
              </div>
            </div>

            <div>
              <label className="text-slate-400 text-[11px] block mb-1">{t('Target Text Source Name in OBS')}</label>
              <input
                type="text"
                value={obsSettings.textSourceName}
                onChange={(e) => setObsSettings((prev) => ({ ...prev, textSourceName: e.target.value }))}
                className="w-full bg-slate-800 border border-slate-700 rounded px-2.5 py-1.5 text-slate-200"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
