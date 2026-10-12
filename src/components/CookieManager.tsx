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
import { useTranslate } from './LanguageContext';

export interface PlatformCookies {
  bilibili: {
    cookieString: string;
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

export const readSavedBilibiliCookie = (): string => {
  if (typeof window === 'undefined') return '';
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (!saved) return '';
    const parsed = JSON.parse(saved) as {
      bilibili?: {
        cookieString?: unknown;
        sessdata?: unknown;
        bili_jct?: unknown;
        dedeUserId?: unknown;
      };
    };
    if (typeof parsed.bilibili?.cookieString === 'string') return parsed.bilibili.cookieString;
    return [
      ['SESSDATA', parsed.bilibili?.sessdata],
      ['bili_jct', parsed.bilibili?.bili_jct],
      ['DedeUserID', parsed.bilibili?.dedeUserId],
    ]
      .filter((entry): entry is [string, string] => typeof entry[1] === 'string' && Boolean(entry[1].trim()))
      .map(([name, value]) => `${name}=${value.trim()}`)
      .join('; ');
  } catch {
    return '';
  }
};

export const readSavedYoutubeCookie = (): string => {
  if (typeof window === 'undefined') return '';
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (!saved) return '';
    const parsed = JSON.parse(saved) as { youtube?: { cookieString?: unknown } };
    return typeof parsed.youtube?.cookieString === 'string' ? parsed.youtube.cookieString : '';
  } catch {
    return '';
  }
};

interface CookieManagerProps {
  bilibiliCookie: string;
  bilibiliLoginStatus?: 'not_configured' | 'pending' | 'verified' | 'invalid';
  onBilibiliCookieChange: (cookie: string) => void;
  onYoutubeCookieChange: (cookie: string) => void;
}

export const CookieManager: React.FC<CookieManagerProps> = ({
  bilibiliCookie,
  bilibiliLoginStatus = 'not_configured',
  onBilibiliCookieChange,
  onYoutubeCookieChange,
}) => {
  const t = useTranslate();
  const [cookies, setCookies] = useState<PlatformCookies>({
    bilibili: {
      cookieString: bilibiliCookie,
      isLoggedIn: Boolean(bilibiliCookie),
      username: bilibiliCookie ? t('B站 Cookie 已保存') : '',
      fanLevel: 0,
    },
    youtube: {
      cookieString: '',
      isLoggedIn: false,
      channelName: '',
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
  const [biliCookieString, setBiliCookieString] = useState(bilibiliCookie);
  const [ytRawCookie, setYtRawCookie] = useState('');
  const [meRawCookie, setMeRawCookie] = useState('');

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          setCookies((current) => ({
            ...current,
            ...parsed,
            bilibili: {
              ...current.bilibili,
              cookieString: bilibiliCookie,
              isLoggedIn: Boolean(bilibiliCookie),
              username: bilibiliCookie ? t('B站 Cookie 已保存') : '',
              fanLevel: 0,
            },
            youtube: {
              ...current.youtube,
              ...parsed.youtube,
              cookieString: typeof parsed.youtube?.cookieString === 'string'
                ? parsed.youtube.cookieString
                : '',
              isLoggedIn: typeof parsed.youtube?.cookieString === 'string'
                && Boolean(parsed.youtube.cookieString.trim()),
            },
          }));
          setYtRawCookie(parsed.youtube?.cookieString || '');
          setMeRawCookie(parsed.missevan?.cookieString || '');
        } catch {
          // ignore
        }
      }
    }
  }, [bilibiliCookie]);

  useEffect(() => {
    setBiliCookieString(bilibiliCookie);
  }, [bilibiliCookie]);

  const handleSave = () => {
    const updated: PlatformCookies = {
      bilibili: {
        cookieString: biliCookieString.trim(),
        isLoggedIn: Boolean(biliCookieString.trim()),
        username: biliCookieString.trim() ? t('B站 Cookie 已保存') : '',
        fanLevel: 0,
      },
      youtube: {
        cookieString: ytRawCookie.trim(),
        isLoggedIn: !!ytRawCookie.trim(),
        channelName: ytRawCookie.trim() ? (cookies.youtube.channelName || t('YouTube已授权频道')) : '',
      },
      missevan: {
        cookieString: meRawCookie.trim(),
        isLoggedIn: !!meRawCookie.trim(),
        username: meRawCookie.trim() ? t('猫耳FM已授权用户') : '',
      },
    };

    setCookies(updated);
    onBilibiliCookieChange(updated.bilibili.cookieString);
    onYoutubeCookieChange(updated.youtube.cookieString);
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    }

    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 2500);
  };

  const handleClear = (platform: 'bilibili' | 'youtube' | 'missevan') => {
    const updated = { ...cookies };
    if (platform === 'bilibili') {
      updated.bilibili = { cookieString: '', isLoggedIn: false, username: '', fanLevel: 0 };
      setBiliCookieString('');
      onBilibiliCookieChange('');
    } else if (platform === 'youtube') {
      updated.youtube = { cookieString: '', isLoggedIn: false, channelName: '' };
      setYtRawCookie('');
      onYoutubeCookieChange('');
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
              {t('平台 Cookies 凭证管理 (免注册免登录)')}
            </h2>
            <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-bold">
              Local Browser Storage Only
            </span>
          </div>
          <p className="text-xs text-slate-300 mt-1 max-w-2xl leading-relaxed">
            {t('B站只需粘贴浏览器复制的完整 Cookie，无需拆分填写 SESSDATA、bili_jct 或 DedeUserID。Cookie 保存在本机浏览器，并在连接时发送到本地 Chatsync 服务。')}
          </p>
        </div>

        <button
          onClick={handleSave}
          className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold shadow-lg shadow-emerald-600/30 transition-all shrink-0"
        >
          {savedSuccess ? <Check className="w-4 h-4 text-emerald-200" /> : <Save className="w-4 h-4" />}
          <span>{savedSuccess ? t('凭证已安全保存！') : t('保存本地凭证')}</span>
        </button>
      </div>

      {/* Main Cookie Editor Card */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left 4 cols: Platform selection */}
        <div className="lg:col-span-4 space-y-2">
          <div className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
            {t('选择目标推流平台')}
          </div>

          {[
            {
              id: 'bilibili' as const,
              name: '哔哩哔哩 (Bilibili)',
              sub: t('用于发送弹幕、粉丝勋章专属表情、大航海舰长表情'),
              status: !cookies.bilibili.isLoggedIn
                ? t('未配置')
                : bilibiliLoginStatus === 'verified'
                  ? t('登录已验证')
                  : bilibiliLoginStatus === 'invalid'
                    ? t('Cookie 无效')
                    : bilibiliLoginStatus === 'pending'
                      ? t('验证中')
                      : t('尚未验证'),
              badge: !cookies.bilibili.isLoggedIn
                ? t('未登录')
                : bilibiliLoginStatus === 'verified'
                  ? t('登录已验证')
                  : bilibiliLoginStatus === 'invalid'
                    ? t('Cookie 无效')
                    : t('已保存'),
              isOk: bilibiliLoginStatus === 'verified',
              isInvalid: bilibiliLoginStatus === 'invalid',
            },
            {
              id: 'youtube' as const,
              name: 'YouTube Live',
              sub: t('用于以频道身份发送 Member Stamps 表情与聊天'),
              status: cookies.youtube.isLoggedIn ? t('已保存完整 Cookie') : t('未配置'),
              badge: cookies.youtube.isLoggedIn ? t('有效') : t('未登录'),
              isOk: cookies.youtube.isLoggedIn,
              isInvalid: false,
            },
            {
              id: 'missevan' as const,
              name: '猫耳FM (MissEvan)',
              sub: t('用于深夜电台房间聊天互动'),
              status: cookies.missevan.isLoggedIn ? t('已配置凭证') : t('未配置'),
              badge: cookies.missevan.isLoggedIn ? t('有效') : t('未登录'),
              isOk: cookies.missevan.isLoggedIn,
              isInvalid: false,
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
                      item.isInvalid
                        ? 'bg-red-500/20 text-red-300 border border-red-500/30'
                        : item.isOk
                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                        : 'bg-slate-800 text-slate-500'
                    }`}
                  >
                    {item.badge}
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
                    <h3 className="font-bold text-sm text-white">{t('Bilibili 凭证配置')}</h3>
                    <p className="text-[11px] text-slate-400">
                      {t('粘贴完整 Cookie（可选）')}
                    </p>
                  </div>
                </div>

                {cookies.bilibili.isLoggedIn && (
                  <button
                    onClick={() => handleClear('bilibili')}
                    className="flex items-center gap-1 text-xs text-red-400 hover:text-red-300 px-2.5 py-1 rounded bg-red-950/20 border border-red-900/30"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>{t('清除凭证')}</span>
                  </button>
                )}
              </div>

              <div className="space-y-3 text-xs">
                <div>
                  <label className="text-slate-300 font-medium block mb-1">{t('Bilibili 完整 Cookie')}</label>
                  <input
                    type="password"
                    autoComplete="off"
                    spellCheck={false}
                    value={biliCookieString}
                    onChange={(event) => setBiliCookieString(event.target.value)}
                    placeholder={t('粘贴完整 Cookie，例如 SESSDATA=...; bili_jct=...; DedeUserID=...')}
                    className="w-full bg-slate-800/90 border border-slate-700 rounded-lg px-3 py-2 text-slate-200 font-mono text-xs focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <p className="text-[11px] text-slate-400">
                  {t('Cookie 通常可从浏览器开发者工具中整段复制；公开弹幕无需登录，Cookie 仅在你选择提供时使用。')}
                </p>

                <div className="p-3 rounded-lg bg-sky-950/20 border border-sky-800/30 text-[11px] text-sky-300/90 space-y-1">
                  <div className="font-bold flex items-center gap-1 text-sky-300">
                    <ShieldCheck className="w-3.5 h-3.5" />
                    <span>{t('纯本地存储隐私保护')}</span>
                  </div>
                  <p>
                    {t('凭证仅保存在您这台设备的浏览器缓存里，不会上传到云端。无需注册本站账号，关闭页面后可随时清除。')}
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
                    <h3 className="font-bold text-sm text-white">{t('YouTube 凭证配置')}</h3>
                    <p className="text-[11px] text-slate-400">
                      {t('填入 YouTube 导出的 Cookie 字符串即可发言或使用专属会员表情')}
                    </p>
                  </div>
                </div>

                {cookies.youtube.isLoggedIn && (
                  <button
                    onClick={() => handleClear('youtube')}
                    className="flex items-center gap-1 text-xs text-red-400 hover:text-red-300 px-2.5 py-1 rounded bg-red-950/20 border border-red-900/30"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>{t('清除凭证')}</span>
                  </button>
                )}
              </div>

              <div className="space-y-3 text-xs">
                <div>
                  <label className="text-slate-300 font-medium block mb-1">
                    {t('YouTube Cookie 字符串 (包含 LOGIN_INFO)')}
                  </label>
                  <textarea
                    rows={4}
                    value={ytRawCookie}
                    onChange={(e) => setYtRawCookie(e.target.value)}
                    placeholder={t('粘贴从浏览器导出或复制的完整 YouTube Cookie 字符串...')}
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
                    <h3 className="font-bold text-sm text-white">{t('猫耳FM (MissEvan) 凭证配置')}</h3>
                    <p className="text-[11px] text-slate-400">
                      {t('填入猫耳 Cookie 字符串即可连接直播间并以账号身份发言')}
                    </p>
                  </div>
                </div>

                {cookies.missevan.isLoggedIn && (
                  <button
                    onClick={() => handleClear('missevan')}
                    className="flex items-center gap-1 text-xs text-red-400 hover:text-red-300 px-2.5 py-1 rounded bg-red-950/20 border border-red-900/30"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>{t('清除凭证')}</span>
                  </button>
                )}
              </div>

              <div className="space-y-3 text-xs">
                <div>
                  <label className="text-slate-300 font-medium block mb-1">
                    {t('猫耳FM (MissEvan) Cookie 字符串')}
                  </label>
                  <textarea
                    rows={3}
                    value={meRawCookie}
                    onChange={(e) => setMeRawCookie(e.target.value)}
                    placeholder={t('粘贴猫耳FM Cookie (可在 missevan.com 网页控制台 F12 > Network 或 Application > Cookies 复制)...')}
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
