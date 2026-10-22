import { MotionConfig, useAnimate } from 'motion/react';
import { useEffect, useState } from 'react';
import { ensureInitialized } from './actions/init';
import { ChronicleScreen } from './screens/Chronicle';
import { DayMapScreen } from './screens/DayMap';
import { HearthScreen } from './screens/Hearth';
import { HeroScreen } from './screens/Hero';
import { Onboarding } from './screens/Onboarding';
import { QuestEditor } from './screens/QuestEditor';
import { QuestsScreen } from './screens/Quests';
import { RealmScreen, RegionScreen } from './screens/Realm';
import { RitualScreen } from './screens/Ritual';
import { RunScreen } from './screens/Run';
import { SettingsScreen } from './screens/Settings';
import { setHapticsEnabled } from './services/haptics';
import { setSoundEnabled } from './services/sound';
import { useGame, useNow } from './state/data';
import { useRoute } from './state/router';
import { useReminderSync, useSession } from './state/sync';
import { useUi } from './state/ui';
import { EmberField } from './ui/EmberField';
import { Effects } from './ui/Effects';
import { useCalm } from './ui/motion';
import { CaptureFab, Header, TabBar } from './ui/Shell';

function Loading() {
  return (
    <div className="flex h-full items-center justify-center">
      <div className="flicker text-glow font-display text-xl text-ember">Kindling…</div>
    </div>
  );
}

export function App() {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    void ensureInitialized().then(() => setReady(true));
  }, []);
  return ready ? <Game /> : <Loading />;
}

function Game() {
  const now = useNow(30_000);
  const game = useGame(now);
  const calm = useCalm();
  const route = useRoute();
  const shake = useUi((s) => s.shake);
  const [scope, animate] = useAnimate();
  useSession();
  useReminderSync();

  useEffect(() => {
    if (!game) return;
    const s = game.settings;
    document.documentElement.dataset.motion = s.motion === 'system' ? '' : s.motion;
    const theme = game.bonuses.themes.includes(s.theme) ? s.theme : 'ember';
    document.documentElement.dataset.theme = theme;
    setSoundEnabled(s.sound);
    setHapticsEnabled(s.haptics);
  }, [game]);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [route.path]);

  useEffect(() => {
    if (shake && !calm && scope.current) void animate(scope.current, { x: [0, -9, 8, -6, 5, -2, 0], y: [0, 4, -3, 2, 0] }, { duration: 0.45 });
  }, [shake, calm, animate, scope]);

  if (!game) return <Loading />;
  if (!game.settings.onboarded) {
    return (
      <MotionConfig reducedMotion={calm ? 'always' : 'never'}>
        <EmberField calm={calm} />
        <Onboarding />
        <Effects calm={calm} />
      </MotionConfig>
    );
  }

  const [section, id] = route.parts;
  let screen: React.ReactNode;
  let chrome = true;
  switch (section) {
    case undefined:
      screen = <HearthScreen game={game} now={now} />;
      break;
    case 'quests':
      screen = <QuestsScreen game={game} now={now} />;
      break;
    case 'quest':
      screen = <QuestEditor game={game} id={id} now={now} key={id} />;
      chrome = false;
      break;
    case 'realm':
      screen = <RealmScreen game={game} now={now} />;
      break;
    case 'region':
      screen = <RegionScreen game={game} id={id} now={now} />;
      break;
    case 'hero':
      screen = <HeroScreen game={game} tab={id} />;
      break;
    case 'chronicle':
      screen = <ChronicleScreen game={game} now={now} />;
      break;
    case 'ritual':
      screen = <RitualScreen game={game} now={now} />;
      chrome = false;
      break;
    case 'map':
      screen = <DayMapScreen game={game} />;
      break;
    case 'run':
      screen = <RunScreen game={game} query={route.query} />;
      chrome = false;
      break;
    case 'settings':
      screen = <SettingsScreen game={game} />;
      break;
    default:
      screen = <HearthScreen game={game} now={now} />;
  }

  return (
    <MotionConfig reducedMotion={calm ? 'always' : 'never'}>
      <EmberField calm={calm} />
      <div ref={scope} className="relative z-10 min-h-full">
        {chrome && <Header game={game} />}
        <main className={`mx-auto max-w-lg px-4 ${chrome ? 'pb-40 pt-2' : 'pb-10'}`}>{screen}</main>
      </div>
      {chrome && <CaptureFab />}
      {chrome && <TabBar />}
      <Effects calm={calm} />
    </MotionConfig>
  );
}
