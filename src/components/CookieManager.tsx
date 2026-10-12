import React, { useState, useEffect } from 'react';
import { 
  Cookie, 
  Check, 
  Trash2, 
  Save, 
  Key, 
  ShieldCheck, 
  HelpCircle, 
  ExternalLink,
  AlertCircle
} from 'lucide-react';
import { PlatformIcon } from './SiteIcons';

export interface PlatformCookies {
  bilibili: {
    sessdata: string;
    bili_jct: string;
    dedeUserId: string;
    isLoggedIn: boolean;
    username: string;
    fanLevel: number;
  };
  youtube: {
    cookieString: string;
    isLoggedIn: boolean;
    channelName: string;
  };
  missevan: {
    cookieString: string;
    isLoggedIn: boolean;
    username: string;
  };
}

const STORAGE_KEY = 'danmaku_platform_cookies_v2';

export const CookieManager: React.FC = () => {
  const [cookies, setCookies] = useState<PlatformCookies>({
    bilibili: {
      sessdata: '',
      bili_jct: '',
      dedeUserId: '',
      isLoggedIn: true,
      username: '水色之音_Official',
      fanLevel: 28,
    },
    youtube: {
      cookieString: '',
      isLoggedIn: true,
      channelName: 'Ya-chan Ch. 矢野ちゃんねる',
    },
    missevan: {
      cookieString: '',
      isLoggedIn: false,
      username: '',
    },
  });

  const [activeSite, setActiveSite] = useState<'bilibili' | 'youtube' | 'missevan'>('bilibili');
  const [savedSuccess, setSavedSuccess] = useState(false);

  // Raw inputs for editing
  const [biliSessdata, setBiliSessdata] = useState('');
  const [biliJct, setBiliJct] = useState('');
  const [biliUid, setBiliUid] = useState('');
  const [ytRawCookie, setYtRawCookie] = useState('');
  const [meRawCookie, setMeRawCookie] = useState('');

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          setCookies(parsed);
          setBiliSessdata(parsed.bilibili?.sessdata || '');
          setBiliJct(parsed.bilibili?.bili_jct || '');
          setBiliUid(parsed.bilibili?.dedeUserId || '');
          setYtRawCookie(parsed.youtube?.cookieString || '');
          setMeRawCookie(parsed.missevan?.cookieString || '');
        } catch {
          // ignore
        }
      }
    }
  }, []);

  const handleSave = () => {
    const updated: PlatformCookies = {
      bilibili: {
        sessdata: biliSessdata.trim(),
        bili_jct: biliJct.trim(),
        dedeUserId: biliUid.trim(),
        isLoggedIn: !!biliSessdata.trim(),
        username: biliSessdata.trim() ? (cookies.bilibili.username || 'B站已授权主播') : '',
        fanLevel: 28,
      },
      youtube: {
        cookieString: ytRawCookie.trim(),
        isLoggedIn: !!ytRawCookie.trim(),
        channelName: ytRawCookie.trim() ? (cookies.youtube.channelName || 'YouTube已授权频道') : '',
      },
      missevan: {
        cookieString: meRawCookie.trim(),
        isLoggedIn: !!meRawCookie.trim(),
        username: meRawCookie.trim() ? '猫耳FM已授权用户' : '',
      },
    };

    setCookies(updated);
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    }

    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 2500);
  };

  const handleClear = (platform: 'bilibili' | 'youtube' | 'missevan') => {
    const updated = { ...cookies };
    if (platform === 'bilibili') {
      updated.bilibili = { sessdata: '', bili_jct: '', dedeUserId: '', isLoggedIn: false, username: '', fanLevel: 0 };
      setBiliSessdata('');
      setBiliJct('');
      setBiliUid('');
    } else if (platform === 'youtube') {
      updated.youtube = { cookieString: '', isLoggedIn: false, channelName: '' };
      setYtRawCookie('');
    } else {
      updated.missevan = { cookieString: '', isLoggedIn: false, username: '' };
      setMeRawCookie('');
    }

    setCookies(updated);
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="p-4 bg-gradient-to-r from-amber-950/40 via-slate-900 to-indigo-950/40 border border-amber-500/20 rounded-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-amber-500/20 text-amber-400 border border-amber-500/30">
              <Cookie className="w-4 h-4" />
            </span>
            <h2 className="text-base font-bold text-white">
              平台 Cookies 凭证管理 (免注册免登录)
            </h2>
            <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-bold">
              Local Browser Storage Only
            </span>
          </div>
          <p className="text-xs text-slate-300 mt-1 max-w-2xl leading-relaxed">
            保留原始仓库的 <strong>Cookies 凭证登录模式</strong>：用户<strong>无需在任何网站或App上注册账号</strong>。凭证仅保存在您当前浏览器的本地缓存中，仅用于主播身份跨平台发送弹幕、使用专属表情包及粉丝牌互动。
          </p>
        </div>

        <button
          onClick={handleSave}
          className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold shadow-lg shadow-emerald-600/30 transition-all shrink-0"
        >
          {savedSuccess ? <Check className="w-4 h-4 text-emerald-200" /> : <Save className="w-4 h-4" />}
          <span>{savedSuccess ? '凭证已安全保存！' : '保存本地凭证'}</span>
        </button>
      </div>

      {/* Main Cookie Editor Card */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left 4 cols: Platform selection */}
        <div className="lg:col-span-4 space-y-2">
          <div className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
            选择目标推流平台:
          </div>

          {[
            {
              id: 'bilibili' as const,
              name: '哔哩哔哩 (Bilibili)',
              sub: '用于发送弹幕、粉丝勋章专属表情、大航海舰长表情',
              status: cookies.bilibili.isLoggedIn ? `已授权: ${cookies.bilibili.username}` : '未配置',
              isOk: cookies.bilibili.isLoggedIn,
            },
            {
              id: 'youtube' as const,
              name: 'YouTube Live',
              sub: '用于以频道身份发送 Member Stamps 表情与聊天',
              status: cookies.youtube.isLoggedIn ? `已授权: ${cookies.youtube.channelName}` : '未配置',
              isOk: cookies.youtube.isLoggedIn,
            },
            {
              id: 'missevan' as const,
              name: '猫耳FM (MissEvan)',
              sub: '用于深夜电台房间聊天互动',
              status: cookies.missevan.isLoggedIn ? '已配置凭证' : '未配置',
              isOk: cookies.missevan.isLoggedIn,
            },
          ].map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveSite(item.id)}
              className={`w-full p-3 rounded-xl border text-left transition-all flex items-start gap-3 ${
                activeSite === item.id
                  ? 'bg-slate-800 border-indigo-500 shadow-md ring-1 ring-indigo-500/40'
                  : 'bg-slate-900/80 border-slate-800 hover:bg-slate-800/60'
              }`}
            >
              <div className="p-2 rounded-lg bg-slate-950 border border-slate-800 shrink-0 mt-0.5">
                <PlatformIcon platform={item.id} size={20} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <div className="font-bold text-xs text-white">{item.name}</div>
                  <span
                    className={`text-[10px] font-mono px-1.5 py-0.2 rounded ${
                      item.isOk
                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                        : 'bg-slate-800 text-slate-500'
                    }`}
                  >
                    {item.isOk ? '有效' : '未登录'}
                  </span>
                </div>
                <div className="text-[11px] text-slate-400 mt-0.5 truncate">{item.sub}</div>
                <div className="text-[10px] text-indigo-400 font-mono mt-1">{item.status}</div>
              </div>
            </button>
          ))}
        </div>

        {/* Right 8 cols: Cookie Credentials Form */}
        <div className="lg:col-span-8 bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-xl space-y-5">
          {activeSite === 'bilibili' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div className="flex items-center gap-2">
                  <PlatformIcon platform="bilibili" size={20} />
                  <div>
                    <h3 className="font-bold text-sm text-white">Bilibili 凭证配置</h3>
                    <p className="text-[11px] text-slate-400">
                      填入 SESSDATA 与 bili_jct 即可激活专属表情与弹幕发言
                    </p>
                  </div>
                </div>

                {cookies.bilibili.isLoggedIn && (
                  <button
                    onClick={() => handleClear('bilibili')}
                    className="flex items-center gap-1 text-xs text-red-400 hover:text-red-300 px-2.5 py-1 rounded bg-red-950/20 border border-red-900/30"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>清除凭证</span>
                  </button>
                )}
              </div>

              <div className="space-y-3 text-xs">
                <div>
                  <label className="text-slate-300 font-medium block mb-1">
                    SESSDATA (核心会话密钥)
                  </label>
                  <input
                    type="password"
                    value={biliSessdata}
                    onChange={(e) => setBiliSessdata(e.target.value)}
                    placeholder="粘贴 F12 Application > Cookies 中的 SESSDATA 值..."
                    className="w-full bg-slate-800/90 border border-slate-700 rounded-lg px-3 py-2 text-slate-200 font-mono text-xs focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-slate-300 font-medium block mb-1">
                      bili_jct (CSRF Token)
                    </label>
                    <input
                      type="password"
                      value={biliJct}
                      onChange={(e) => setBiliJct(e.target.value)}
                      placeholder="粘贴 bili_jct 值..."
                      className="w-full bg-slate-800/90 border border-slate-700 rounded-lg px-3 py-2 text-slate-200 font-mono text-xs focus:outline-none focus:border-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="text-slate-300 font-medium block mb-1">
                      DedeUserID (B站数字 UID)
                    </label>
                    <input
                      type="text"
                      value={biliUid}
                      onChange={(e) => setBiliUid(e.target.value)}
                      placeholder="例如: 12345678"
                      className="w-full bg-slate-800/90 border border-slate-700 rounded-lg px-3 py-2 text-slate-200 font-mono text-xs focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                </div>

                <div className="p-3 rounded-lg bg-sky-950/20 border border-sky-800/30 text-[11px] text-sky-300/90 space-y-1">
                  <div className="font-bold flex items-center gap-1 text-sky-300">
                    <ShieldCheck className="w-3.5 h-3.5" />
                    <span>纯本地存储隐私保护</span>
                  </div>
                  <p>
                    凭证仅保存在您这台设备的浏览器缓存里，绝不上报给任何云端第三方服务器。无需注册本站点账号，关闭即焚或随时清除。
                  </p>
                </div>
              </div>
            </div>
          )}

          {activeSite === 'youtube' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div className="flex items-center gap-2">
                  <PlatformIcon platform="youtube" size={20} />
                  <div>
                    <h3 className="font-bold text-sm text-white">YouTube 凭证配置</h3>
                    <p className="text-[11px] text-slate-400">
                      填入 YouTube 导出的 Cookie 字符串即可发言或使用专属会员表情
                    </p>
                  </div>
                </div>

                {cookies.youtube.isLoggedIn && (
                  <button
                    onClick={() => handleClear('youtube')}
                    className="flex items-center gap-1 text-xs text-red-400 hover:text-red-300 px-2.5 py-1 rounded bg-red-950/20 border border-red-900/30"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>清除凭证</span>
                  </button>
                )}
              </div>

              <div className="space-y-3 text-xs">
                <div>
                  <label className="text-slate-300 font-medium block mb-1">
                    YouTube Cookie 字符串 (包含 LOGIN_INFO)
                  </label>
                  <textarea
                    rows={4}
                    value={ytRawCookie}
                    onChange={(e) => setYtRawCookie(e.target.value)}
                    placeholder="粘贴从浏览器导出或复制的完整 YouTube Cookie 字符串..."
                    className="w-full bg-slate-800/90 border border-slate-700 rounded-lg p-3 text-slate-200 font-mono text-xs focus:outline-none focus:border-red-500 resize-none"
                  />
                </div>
              </div>
            </div>
          )}

          {activeSite === 'missevan' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div className="flex items-center gap-2">
                  <PlatformIcon platform="missevan" size={20} />
                  <div>
                    <h3 className="font-bold text-sm text-white">猫耳FM (MissEvan) 凭证配置</h3>
                    <p className="text-[11px] text-slate-400">
                      填入猫耳 Cookie 字符串即可连接直播间并以账号身份发言
                    </p>
                  </div>
                </div>

                {cookies.missevan.isLoggedIn && (
                  <button
                    onClick={() => handleClear('missevan')}
                    className="flex items-center gap-1 text-xs text-red-400 hover:text-red-300 px-2.5 py-1 rounded bg-red-950/20 border border-red-900/30"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>清除凭证</span>
                  </button>
                )}
              </div>

              <div className="space-y-3 text-xs">
                <div>
                  <label className="text-slate-300 font-medium block mb-1">
                    猫耳FM (MissEvan) Cookie 字符串
                  </label>
                  <textarea
                    rows={3}
                    value={meRawCookie}
                    onChange={(e) => setMeRawCookie(e.target.value)}
                    placeholder="粘贴猫耳FM Cookie (可在 missevan.com 网页控制台 F12 > Network 或 Application > Cookies 复制)..."
                    className="w-full bg-slate-800/90 border border-slate-700 rounded-lg p-3 text-slate-200 font-mono text-xs focus:outline-none focus:border-orange-500 resize-none"
                  />
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
