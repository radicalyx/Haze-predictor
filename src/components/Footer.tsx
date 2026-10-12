import React from 'react';
import { ExternalLink, ShieldAlert } from 'lucide-react';

interface FooterProps {
  onOpenHealth: () => void;
  lastUpdated?: string;
}

export const Footer: React.FC<FooterProps> = ({ onOpenHealth, lastUpdated }) => {
  return (
    <footer className="w-full border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 mt-16 transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
        {/* Attribution & Legal Notice */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-start">
          <div className="md:col-span-7 space-y-3">
            <div className="flex items-center gap-2 text-slate-900 dark:text-white font-bold text-sm">
              <ShieldAlert className="w-4 h-4 text-emerald-500" />
              <span>Official Air Quality Attribution & Disclaimers</span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              Historical and current PSI readings are sourced from official Singapore government datasets published by the National Environment Agency (NEA) via data.gov.sg where available. The 30-day PSI forecasts are independently generated statistical projections and are not official forecasts or advisories issued by the National Environment Agency (NEA). Forecast uncertainty increases over longer horizons.
            </p>
            {lastUpdated && (
              <div className="text-[11px] text-slate-400">
                Last Observation Feed Update: <span className="font-mono text-slate-600 dark:text-slate-300">{new Date(lastUpdated).toLocaleString('en-SG', { timeZone: 'Asia/Singapore' })} SGT</span>
              </div>
            )}
          </div>

          <div className="md:col-span-5 flex flex-col space-y-2 text-xs">
            <span className="font-semibold text-slate-900 dark:text-white mb-1">Authoritative Portals & Licences</span>
            <a
              href="https://data.gov.sg/open-data-licence"
              target="_blank"
              rel="noreferrer noopener"
              className="inline-flex items-center gap-1.5 text-slate-600 dark:text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors"
            >
              <span>Singapore Open Data Licence</span>
              <ExternalLink className="w-3 h-3" />
            </a>
            <a
              href="https://data.gov.sg"
              target="_blank"
              rel="noreferrer noopener"
              className="inline-flex items-center gap-1.5 text-slate-600 dark:text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors"
            >
              <span>data.gov.sg Environmental Datasets</span>
              <ExternalLink className="w-3 h-3" />
            </a>
            <a
              href="https://www.haze.gov.sg"
              target="_blank"
              rel="noreferrer noopener"
              className="inline-flex items-center gap-1.5 text-slate-600 dark:text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors"
            >
              <span>Official NEA Haze & Air Quality Bulletins</span>
              <ExternalLink className="w-3 h-3" />
            </a>
            <button
              onClick={onOpenHealth}
              className="inline-flex items-center gap-1 text-slate-600 dark:text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors cursor-pointer text-left pt-1"
            >
              <span>API Diagnostics & System Health</span>
            </button>
          </div>
        </div>

        {/* Bottom copyright */}
        <div className="pt-6 border-t border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-400">
          <div>
            Singapore PSI Tracker & 30-Day Forecast · Built for Singapore Environmental Monitoring
          </div>
          <div>
            Not affiliated with or officially endorsed by the Government of Singapore.
          </div>
        </div>
      </div>
    </footer>
  );
};
