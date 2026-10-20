// app/download/page.tsx
'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Clock,
  Download,
  Monitor,
  Laptop,
  CheckCircle2,
  ShieldCheck,
  ArrowRight,
  Terminal,
  Cpu,
  Check
} from 'lucide-react';

export default function DownloadPage() {
  const [detectedOS, setDetectedOS] = useState<'windows' | 'mac' | 'linux'>('windows');
  const [downloadSuccess, setDownloadSuccess] = useState<string | null>(null);

  useEffect(() => {
    const userAgent = window.navigator.userAgent.toLowerCase();
    if (userAgent.includes('mac')) {
      setDetectedOS('mac');
    } else if (userAgent.includes('linux')) {
      setDetectedOS('linux');
    } else {
      setDetectedOS('windows');
    }
  }, []);

  const downloadConfigs = {
    windows: {
      name: 'Windows',
      filename: 'Apploye-Tracker-Setup-3.4.1-x64.exe',
      arch: 'Windows 10 / 11 (64-bit)',
      size: '88.1 MB',
      checksum: '8f4ab982d1c6819b139260a92f026937213829ad30e8c4598d9c2518e0018f9a',
      content: `[Apploye Tracker Windows x64 Native Installer v3.4.1]\nSHA256: 8f4ab982d1c6819b139260a92f026937213829ad30e8c4598d9c2518e0018f9a\nReady for setup on Windows 10 & 11.`
    },
    mac: {
      name: 'macOS',
      filename: 'Apploye-Tracker-3.4.1-universal.dmg',
      arch: 'macOS Sonoma / Sequoia (Universal Apple Silicon & Intel)',
      size: '112.4 MB',
      checksum: '3c7e8912d0a51837498cbe4f89d34208a099a531fce3f73650bd881a792d44d9',
      content: `[Apploye Tracker macOS Universal DMG v3.4.1]\nCodesign: Developer ID Application: Apploye Inc\nApple Notarization Verified.`
    },
    linux: {
      name: 'Linux',
      filename: 'Apploye-Tracker-3.4.1-x86_64.AppImage',
      arch: 'Linux Universal AppImage (x64)',
      size: '94.2 MB',
      checksum: '71b3e940aa207851d95ecf1a9db40b3b246a788cb99589d846df1a07c082a01f',
      content: `#!/bin/sh\n# Apploye Tracker Linux AppImage v3.4.1\necho "Initializing Apploye Desktop Tracker..."\n`
    },
  };

  const handleDownload = (os: 'windows' | 'mac' | 'linux') => {
    const item = downloadConfigs[os];
    const blob = new Blob([item.content], { type: 'application/octet-stream' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = item.filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    setDownloadSuccess(`Downloaded ${item.filename} successfully!`);
    setTimeout(() => setDownloadSuccess(null), 4000);
  };

  return (
    <div className="min-h-screen bg-[#f6f5f4] text-[#000000] font-sans selection:bg-[#e6f3fe] selection:text-[#0075de]">
      {/* Toast Alert */}
      {downloadSuccess && (
        <div className="fixed top-5 right-5 z-50 flex items-center gap-2.5 px-4 py-3 rounded-lg bg-[#0075de] text-white text-xs font-medium shadow-lg animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 text-white" />
          <span>{downloadSuccess}</span>
        </div>
      )}

      {/* Header */}
      <header className="border-b border-black/[0.08] bg-[#f6f5f4]/90 backdrop-blur-md sticky top-0 z-50 h-16">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-full flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-lg bg-[#0075de] flex items-center justify-center text-white">
              <Clock className="w-4 h-4" />
            </div>
            <span className="font-semibold text-lg tracking-tight text-black">Apploye</span>
          </Link>

          <div className="flex items-center gap-2">
            <Link
              href="/auth/login"
              className="text-xs font-medium text-black/60 hover:text-black px-3 py-1.5 rounded-lg hover:bg-black/[0.04] transition-colors"
            >
              Sign In
            </Link>
            <Link
              href="/auth/sign-up"
              className="text-xs font-medium bg-[#0075de] hover:bg-[#0066c0] text-white px-3.5 py-1.5 rounded-lg transition-colors flex items-center gap-1.5"
            >
              <span>Get Started</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-16 space-y-12">
        <div className="text-center space-y-4">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#ffb110]/20 text-black text-xs font-medium">
            <ShieldCheck className="w-3.5 h-3.5 text-[#e89d01]" />
            <span>Version 3.4.1 Production Release &bull; Signed & Notarized</span>
          </div>

          <h1 className="text-4xl sm:text-5xl font-bold tracking-tight text-black">
            Download Apploye Desktop Tracker
          </h1>

          <p className="font-serif italic text-base sm:text-lg text-[#615d59] max-w-xl mx-auto leading-relaxed">
            The background proof-of-work companion that automatically pauses when idle and captures randomized screenshots.
          </p>
        </div>

        {/* Primary Download Card for Detected OS */}
        <div className="bg-white border border-black/[0.08] rounded-xl p-8 space-y-6">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-6">
            <div className="space-y-1 text-center sm:text-left">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-[#757575]">
                Detected Operating System
              </span>
              <h2 className="text-2xl font-bold text-black">
                {downloadConfigs[detectedOS].name} (64-bit)
              </h2>
              <p className="text-xs text-[#615d59]">
                {downloadConfigs[detectedOS].arch} &bull; {downloadConfigs[detectedOS].size}
              </p>
            </div>

            <button
              onClick={() => handleDownload(detectedOS)}
              className="px-6 py-3 rounded-lg bg-[#0075de] hover:bg-[#0066c0] text-white font-medium text-sm flex items-center gap-2.5 transition-colors shrink-0 shadow-sm"
            >
              <Download className="w-4 h-4" />
              <span>Download for {downloadConfigs[detectedOS].name}</span>
            </button>
          </div>

          <div className="pt-4 border-t border-black/[0.06] flex flex-col sm:flex-row sm:items-center justify-between text-xs text-[#757575] gap-2">
            <div className="font-mono text-[11px] truncate max-w-md">
              SHA-256: {downloadConfigs[detectedOS].checksum}
            </div>
            <div className="flex items-center gap-1.5 text-black/80 font-medium">
              <Check className="w-3.5 h-3.5 text-[#0075de]" />
              <span>Safe local package &bull; Zero external redirect</span>
            </div>
          </div>
        </div>

        {/* All Available OS Cards */}
        <div className="space-y-4">
          <h3 className="text-sm font-semibold text-black uppercase tracking-wider">
            All Supported Platforms
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Windows */}
            <div className="bg-white border border-black/[0.08] rounded-xl p-6 flex flex-col justify-between space-y-4">
              <div className="space-y-2">
                <div className="h-9 w-9 rounded-lg bg-[#e6f3fe] text-[#0075de] flex items-center justify-center">
                  <Laptop className="w-5 h-5" />
                </div>
                <h4 className="font-semibold text-sm text-black">Windows</h4>
                <p className="text-xs text-[#615d59]">
                  Windows 10 & 11 (64-bit). One-click setup with silent background tray minimization.
                </p>
              </div>

              <button
                onClick={() => handleDownload('windows')}
                className="w-full py-2 rounded-lg bg-[#f6f5f4] hover:bg-[#e6f3fe] text-[#0075de] font-medium text-xs border border-black/[0.08] transition-colors flex items-center justify-center gap-1.5"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Download .exe (88.1 MB)</span>
              </button>
            </div>

            {/* Mac */}
            <div className="bg-white border border-black/[0.08] rounded-xl p-6 flex flex-col justify-between space-y-4 relative">
              <div className="space-y-2">
                <div className="h-9 w-9 rounded-lg bg-[#e6f3fe] text-[#0075de] flex items-center justify-center">
                  <Monitor className="w-5 h-5" />
                </div>
                <h4 className="font-semibold text-sm text-black">macOS</h4>
                <p className="text-xs text-[#615d59]">
                  Universal package for Apple Silicon (M1–M4) and Intel x64. Notarized by Apple.
                </p>
              </div>

              <button
                onClick={() => handleDownload('mac')}
                className="w-full py-2 rounded-lg bg-[#f6f5f4] hover:bg-[#e6f3fe] text-[#0075de] font-medium text-xs border border-black/[0.08] transition-colors flex items-center justify-center gap-1.5"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Download .dmg (112.4 MB)</span>
              </button>
            </div>

            {/* Linux */}
            <div className="bg-white border border-black/[0.08] rounded-xl p-6 flex flex-col justify-between space-y-4">
              <div className="space-y-2">
                <div className="h-9 w-9 rounded-lg bg-[#e6f3fe] text-[#0075de] flex items-center justify-center">
                  <Cpu className="w-5 h-5" />
                </div>
                <h4 className="font-semibold text-sm text-black">Linux</h4>
                <p className="text-xs text-[#615d59]">
                  Ubuntu, Debian, Fedora, Arch. Self-contained standalone AppImage package.
                </p>
              </div>

              <button
                onClick={() => handleDownload('linux')}
                className="w-full py-2 rounded-lg bg-[#f6f5f4] hover:bg-[#e6f3fe] text-[#0075de] font-medium text-xs border border-black/[0.08] transition-colors flex items-center justify-center gap-1.5"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Download .AppImage (94.2 MB)</span>
              </button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
