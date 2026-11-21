import { Link } from 'react-router-dom';
import { HeartPulse, MessageCircle, Share2, Mail, Globe } from 'lucide-react';
import { useTranslation } from 'react-i18next';

export default function Footer() {
  const { t } = useTranslation();

  return (
    <footer className="bg-[#0b3b2c] text-emerald-50 py-16 font-sans">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-12">
          <div className="lg:col-span-2">
            <div className="flex items-center gap-2 mb-6">
              <div className="bg-emerald-500 p-2 rounded-xl">
                <HeartPulse className="h-6 w-6 text-white" />
              </div>
              <div>
                <span className="text-xl font-bold text-white tracking-tight">{t('common.appName')}</span>
                <p className="text-[10px] text-emerald-200 font-medium">{t('common.tagline')}</p>
              </div>
            </div>
            <div className="flex space-x-4 mb-8">
              <a href="#" className="text-emerald-200 hover:text-white transition-colors" aria-label="Chat"><MessageCircle className="h-5 w-5" /></a>
              <a href="#" className="text-emerald-200 hover:text-white transition-colors" aria-label="Share"><Share2 className="h-5 w-5" /></a>
              <a href="#" className="text-emerald-200 hover:text-white transition-colors" aria-label="Mail"><Mail className="h-5 w-5" /></a>
              <a href="#" className="text-emerald-200 hover:text-white transition-colors" aria-label="Website"><Globe className="h-5 w-5" /></a>
            </div>
            <p className="text-sm text-emerald-400">© 2026 {t('common.appName')}. {t('common.allRightsReserved')}</p>
          </div>

          <div>
            <h3 className="text-sm font-bold text-white tracking-wider mb-4 uppercase">{t('footer.product')}</h3>
            <ul className="space-y-3">
              <li><a href="#how-it-works" className="text-sm text-emerald-200 hover:text-white transition-colors">{t('footer.howItWorks')}</a></li>
              <li><a href="#for-patients" className="text-sm text-emerald-200 hover:text-white transition-colors">{t('footer.forPatients')}</a></li>
              <li><a href="#for-doctors" className="text-sm text-emerald-200 hover:text-white transition-colors">{t('footer.forDoctors')}</a></li>
              <li><a href="#security" className="text-sm text-emerald-200 hover:text-white transition-colors">{t('footer.security')}</a></li>
            </ul>
          </div>

          <div>
            <h3 className="text-sm font-bold text-white tracking-wider mb-4 uppercase">{t('footer.company')}</h3>
            <ul className="space-y-3">
              <li><a href="#about-us" className="text-sm text-emerald-200 hover:text-white transition-colors">{t('footer.aboutUs')}</a></li>
              <li><Link to="#" className="text-sm text-emerald-200 hover:text-white transition-colors">{t('footer.privacyPolicy')}</Link></li>
              <li><Link to="#" className="text-sm text-emerald-200 hover:text-white transition-colors">{t('footer.termsOfService')}</Link></li>
              <li><Link to="#" className="text-sm text-emerald-200 hover:text-white transition-colors">{t('footer.contactUs')}</Link></li>
            </ul>
          </div>

          <div>
            <h3 className="text-sm font-bold text-white tracking-wider mb-4 uppercase">{t('footer.support')}</h3>
            <ul className="space-y-3 mb-8">
              <li><Link to="#" className="text-sm text-emerald-200 hover:text-white transition-colors">{t('footer.helpCenter')}</Link></li>
              <li><Link to="#" className="text-sm text-emerald-200 hover:text-white transition-colors">{t('footer.faqs')}</Link></li>
              <li><Link to="#" className="text-sm text-emerald-200 hover:text-white transition-colors">{t('nav.contactSupport')}</Link></li>
            </ul>
          </div>

          <div className="lg:col-span-1">
            <h3 className="text-sm font-bold text-white tracking-wider mb-4 uppercase">{t('footer.stayUpdated')}</h3>
            <p className="text-sm text-emerald-200 mb-4 leading-relaxed">{t('footer.subscribeDesc')}</p>
          </div>
        </div>
      </div>
    </footer>
  );
}
