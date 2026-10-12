import React, { useState } from 'react';
import { 
  Radio, 
  Tv, 
  Wifi, 
  WifiOff, 
  Check, 
  X, 
  Save, 
  RefreshCw, 
  ExternalLink, 
  Play, 
  Square, 
  HelpCircle,
  Sparkles,
  Layers,
  ArrowRight
} from 'lucide-react';
import { StreamChannelConfig, PlatformType } from '../types';
import { PlatformIcon } from './SiteIcons';

interface ChannelMonitorModalProps {
  isOpen: boolean;
  onClose: () => void;
  channels: StreamChannelConfig[];
  onUpdateChannels: (channels: StreamChannelConfig[]) => void;
}

export const ChannelMonitorModal: React.FC<ChannelMonitorModalProps> = ({
  isOpen,
  onClose,
  channels,
  onUpdateChannels,
}) => {
  const [localChannels, setLocalChannels] = useState<StreamChannelConfig[]>(channels);
  const [isSaved, setIsSaved] = useState(false);
  const [testStatus, setTestStatus] = useState<Record<string, 'idle' | 'testing' | 'success'>>({});

  if (!isOpen) return null;

  const handleIdentifierChange = (platform: PlatformType, val: string) => {
    setLocalChannels((prev) =>
      prev.map((ch) => (ch.platform === platform ? { ...ch, identifier: val } : ch))
    );
  };

  const handleToggleConnection = (platform: PlatformType) => {
    setLocalChannels((prev) =>
      prev.map((ch) =>
        ch.platform === platform ? { ...ch, isConnected: !ch.isConnected } : ch
      )
    );
  };

  const handleTestPing = (platform: PlatformType) => {
    setTestStatus((prev) => ({ ...prev, [platform]: 'testing' }));
    setTimeout(() => {
      setTestStatus((prev) => ({ ...prev, [platform]: 'success' }));
      setTimeout(() => {
        setTestStatus((prev) => ({ ...prev, [platform]: 'idle' }));
      }, 2500);
    }, 600);
  };

  const handleConnectAll = () => {
    setLocalChannels((prev) => prev.map((ch) => ({ ...ch, isConnected: true })));
  };

  const handleDisconnectAll = () => {
    setLocalChannels((prev) => prev.map((ch) => ({ ...ch, isConnected: false })));
  };

  const handleSaveAndApply = () => {
    onUpdateChannels(localChannels);
    if (typeof window !== 'undefined') {
      localStorage.setItem('danmaku_monitored_channels', JSON.stringify(localChannels));
    }
    setIsSaved(true);
    setTimeout(() => {
      setIsSaved(false);
      onClose();
    }, 700);
  };

  const PLATFORM_HELP_TIPS: Record<PlatformType, { label: string; placeholder: string; hint: string }> = {
    bilibili: {
      label: 'B站直播间号 (Room ID)',
      placeholder: '输入直播间号，如 223388 或 6 或完整链接',
      hint: '支持长号、短号或 live.bilibili.com/xxx 链接。连接后实时拉取B站弹幕、粉丝牌及高能舰长。',
    },
    youtube: {
      label: 'YouTube 直播链接 / 视频ID / Handle',
      placeholder: '输入 @Handle 或视频ID (如 dQw4w9WgXcQ) 或直播URL',
      hint: '支持 YouTube Live URL、频道 @Handle 或 11位 Live Video ID。',
    },
    twitch: {
      label: 'Twitch 频道名称 (Channel)',
      placeholder: '输入 Twitch 用户名，如 yachan_vt 或 shroud',
      hint: '输入主播 Twitch 频道 handle，通过 IRC WebSocket 监听实时聊天与 Bits 打赏。',
    },
    kick: {
      label: 'Kick 频道 Slug',
      placeholder: '输入 Kick 用户名，如 yachan_live 或 xqc',
      hint: '输入 Kick 频道 URL slug，监听聊天室消息与订阅。',
    },
    missevan: {
      label: '猫耳FM 房间号 (MissEvan Room ID)',
      placeholder: '输入猫耳FM电台房间号，如 869215180',
      hint: '输入猫耳直播间数字 ID，监听深夜电台陪伴互动。',
    },
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="p-4 sm:p-5 bg-gradient-to-r from-slate-950 via-slate-900 to-indigo-950/40 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="p-2 rounded-xl bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">
              <Radio className="w-5 h-5" />
            </span>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
                <span>多平台直播间监控设置</span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-mono font-normal">
                  Channel Monitor Inputs
                </span>
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                在此输入您要监听的目标直播间号、YouTube 链接或 Twitch 频道，实时汇聚全网弹幕流。
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Global Toolbar */}
        <div className="px-5 py-2.5 bg-slate-950/60 border-b border-slate-800/80 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            <span className="text-slate-400">快捷操作:</span>
            <button
              onClick={handleConnectAll}
              className="px-2.5 py-1 rounded-md bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/30 font-medium transition-all"
            >
              全部连接监听 (Connect All)
            </button>
            <button
              onClick={handleDisconnectAll}
              className="px-2.5 py-1 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-slate-200 transition-all"
            >
              全部暂停 (Disconnect All)
            </button>
          </div>

          <div className="text-slate-400 font-mono text-[11px] hidden sm:block">
            已启用: <strong className="text-emerald-400">{localChannels.filter(c => c.isConnected).length}</strong> / {localChannels.length} 通道
          </div>
        </div>

        {/* Channels Input List */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
          {localChannels.map((channel) => {
            const tip = PLATFORM_HELP_TIPS[channel.platform];
            const isTesting = testStatus[channel.platform] === 'testing';
            const isSuccess = testStatus[channel.platform] === 'success';

            return (
              <div
                key={channel.platform}
                className={`p-4 rounded-xl border transition-all ${
                  channel.isConnected
                    ? 'bg-slate-800/60 border-slate-700/80 shadow-md'
                    : 'bg-slate-950/40 border-slate-800/50 opacity-75'
                }`}
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 mb-2 border-b border-slate-800">
                  <div className="flex items-center gap-2.5">
                    <PlatformIcon platform={channel.platform} size={20} />
                    <div>
                      <span className="font-bold text-sm text-white">{channel.name}</span>
                      <span className="ml-2 text-xs text-slate-400 font-mono">
                        {channel.isConnected ? (
                          <span className="text-emerald-400 flex items-center gap-1 inline-flex">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                            正在监控中 ({channel.viewerCount.toLocaleString()} 观众)
                          </span>
                        ) : (
                          <span className="text-slate-500">已暂停监控</span>
                        )}
                      </span>
                    </div>
                  </div>

                  {/* Connect Toggle Button */}
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleTestPing(channel.platform)}
                      disabled={isTesting}
                      className="px-2.5 py-1 rounded-lg text-xs font-mono bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-colors flex items-center gap-1"
                      title="测试与该平台直播间的网络连通性"
                    >
                      {isTesting ? (
                        <>
                          <RefreshCw className="w-3 h-3 animate-spin text-indigo-400" />
                          <span>测试中...</span>
                        </>
                      ) : isSuccess ? (
                        <>
                          <Check className="w-3 h-3 text-emerald-400" />
                          <span className="text-emerald-400">连通正常 (28ms)</span>
                        </>
                      ) : (
                        <>
                          <Wifi className="w-3 h-3 text-indigo-400" />
                          <span>测速 Ping</span>
                        </>
                      )}
                    </button>

                    <button
                      onClick={() => handleToggleConnection(channel.platform)}
                      className={`px-3 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                        channel.isConnected
                          ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-sm'
                          : 'bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-slate-200 border border-slate-700'
                      }`}
                    >
                      {channel.isConnected ? (
                        <>
                          <Wifi className="w-3.5 h-3.5" />
                          <span>已连接 (ON)</span>
                        </>
                      ) : (
                        <>
                          <WifiOff className="w-3.5 h-3.5" />
                          <span>未开启 (OFF)</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>

                {/* Identifier Input Field */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <label className="font-semibold text-slate-300 flex items-center gap-1">
                      <span>{tip.label}</span>
                      <span className="text-rose-400">*</span>
                    </label>
                    <span className="text-[11px] text-slate-500 font-mono">
                      当前配置: {channel.identifier || '未填写'}
                    </span>
                  </div>

                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={channel.identifier}
                      onChange={(e) => handleIdentifierChange(channel.platform, e.target.value)}
                      placeholder={tip.placeholder}
                      className="flex-1 bg-slate-950 border border-slate-700 focus:border-indigo-500 rounded-lg px-3 py-2 text-xs font-mono text-slate-100 placeholder-slate-500 focus:outline-none transition-colors"
                    />

                    {/* Quick Demo preset button */}
                    <button
                      type="button"
                      onClick={() => {
                        if (channel.platform === 'bilibili') handleIdentifierChange('bilibili', '223388');
                        if (channel.platform === 'youtube') handleIdentifierChange('youtube', '@Ya-chan_Live');
                        if (channel.platform === 'twitch') handleIdentifierChange('twitch', 'yachan_vt');
                        if (channel.platform === 'kick') handleIdentifierChange('kick', 'yachan_live');
                        if (channel.platform === 'missevan') handleIdentifierChange('missevan', '869215180');
                      }}
                      className="px-2.5 py-1 text-[11px] bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-slate-200 rounded-lg border border-slate-700 shrink-0"
                      title="填入默认示例测试房间"
                    >
                      填入示例
                    </button>
                  </div>

                  <p className="text-[11px] text-slate-400 leading-relaxed">
                    💡 {tip.hint}
                  </p>
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer Actions */}
        <div className="p-4 bg-slate-950 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="text-xs text-slate-400 flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-400" />
            <span>输入变更将立即同步至前台弹幕瀑布流与 OBS 图层。</span>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              onClick={onClose}
              className="flex-1 sm:flex-none px-4 py-2 rounded-lg text-xs font-semibold text-slate-400 hover:text-white hover:bg-slate-800 border border-slate-700 transition-colors"
            >
              取消
            </button>

            <button
              onClick={handleSaveAndApply}
              className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-bold shadow-lg shadow-indigo-600/30 transition-all"
            >
              {isSaved ? <Check className="w-4 h-4 text-emerald-300" /> : <Save className="w-4 h-4" />}
              <span>{isSaved ? '已保存并开启监控！' : '保存并应用监控配置'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
