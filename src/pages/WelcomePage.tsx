/** Écran de bienvenue : présentation rapide puis choix des voix anglaises (4 accents). */
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../store/app';
import { Logo } from '../components/Logo';
import { Button, Card } from '../components/ui';
import { VoicePicker } from '../features/audio/VoicePicker';
import { stopSpeech } from '../features/audio/tts';
import { NotificationSettings } from '../features/notifications/NotificationSettings';

export default function WelcomePage() {
  const settings = useApp((s) => s.settings);
  const update = useApp((s) => s.updateSettings);
  const navigate = useNavigate();
  const [prefs, setPrefs] = useState(settings.voicePrefs);

  const finish = async () => {
    stopSpeech();
    await update({ voicePrefs: prefs, voicesChosen: true });
    navigate('/', { replace: true });
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 pt-safe space-y-5 anim-rise">
      <header className="text-center">
        <div className="inline-block">
          <Logo size={56} />
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold mt-2">Bienvenue dans Ascension</h1>
        <p className="text-muted mt-1">Révisions TOEIC et TAGE MAGE, hors ligne, sans compte : vos données restent sur cet appareil.</p>
      </header>

      <Card>
        <h2 className="font-bold text-lg">Choisissez vos voix anglaises</h2>
        <p className="text-sm text-muted mt-1">
          Le Listening du TOEIC mélange quatre accents : américain, britannique, canadien et australien. Pour chacun, choisissez une voix féminine et une voix
          masculine, ou gardez le choix automatique. Touchez « Écouter » pour comparer.
        </p>
        <div className="mt-4">
          <VoicePicker prefs={prefs} onChange={setPrefs} rate={settings.speechRate} />
        </div>
        <p className="text-xs text-muted mt-3">
          Astuce iPhone : pour des voix plus naturelles, téléchargez les voix « améliorées » dans Réglages › Accessibilité › Contenu énoncé › Voix › Anglais. Vous
          pourrez changer ce choix à tout moment dans les réglages d’Ascension.
        </p>
      </Card>

      <Card>
        <h2 className="font-bold text-lg">Rappels et notions du jour</h2>
        <p className="text-sm text-muted mt-1 mb-2">Recevez 1 à 3 fiches « notion à connaître » par jour et un rappel pour garder votre série. Facultatif, modifiable à tout moment dans les réglages.</p>
        <NotificationSettings compact />
      </Card>

      <div className="flex justify-end pb-6">
        <Button size="lg" onClick={() => void finish()}>
          C’est parti
        </Button>
      </div>
    </div>
  );
}
