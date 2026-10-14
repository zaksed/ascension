/**
 * Examen blanc en conditions réelles.
 * - TOEIC : Listening rythmé par l'audio (une seule écoute, pas de retour en arrière), puis
 *   Reading en 75 minutes avec navigation libre, grille de questions et signets.
 * - TAGE MAGE : 6 sous-tests de 20 minutes ; navigation libre dans le sous-test en cours,
 *   aucun retour à un sous-test terminé.
 * La tentative est enregistrée en continu : on peut quitter et reprendre (le chronomètre s'arrête).
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { db, type MockAttempt } from '../db/db';
import { useApp } from '../store/app';
import { isExamId, useAvailability, useBank } from '../hooks';
import type { Bank } from '../content/bank';
import type { Item } from '../content/items';
import type { Question, SectionId } from '../content/schema';
import { EXAM_LABEL, sectionDef } from '../content/exams';
import { answerWindowSeconds, composeFixedMock, composeRandomMock, planQuestionIds, rebuildPlan, type MockSectionPlan } from '../features/exam/mock';
import { computeMockResult } from '../features/exam/result';
import { addXp, checkBadges, recordAnswer } from '../features/session/record';
import { XP } from '../features/gamification/xp';
import { TranscriptFallback, useListening } from '../features/question/ListeningPanel';
import { transcriptLines } from '../features/audio/script';
import { playListening, stopSpeech } from '../features/audio/tts';
import { MediaView } from '../features/question/MediaView';
import { PassageList } from '../features/question/PassageView';
import { OptionList } from '../features/question/OptionList';
import { Button, Card, EmptyState, LinkButton, Modal, PageTitle, ProgressBar, Spinner } from '../components/ui';
import { IconChevronLeft, IconChevronRight, IconClock, IconFlag, IconHeadphones, IconX } from '../components/icons';
import { formatClock } from '../lib/date';

type Numbering = ReadonlyMap<string, number>;

export default function ExamRunnerPage() {
  const { exam, mockId = '' } = useParams();
  const examId = isExamId(exam) ? exam : 'toeic';
  const { bank } = useBank(examId);
  const av = useAvailability();
  const [existing, setExisting] = useState<MockAttempt | null | undefined>(undefined);
  const [attempt, setAttempt] = useState<MockAttempt | null>(null);
  const [error, setError] = useState('');
  const valid = mockId === 'mock1' || mockId === 'mock2' || mockId === 'random';

  useEffect(() => {
    void db.exams
      .where('exam')
      .equals(examId)
      .filter((a) => a.mockId === mockId && a.status === 'in-progress')
      .first()
      .then((a) => setExisting(a ?? null));
  }, [examId, mockId]);

  if (!valid)
    return (
      <EmptyState title="Examen introuvable">
        <LinkButton to="/examens" className="mt-4">
          Retour aux examens
        </LinkButton>
      </EmptyState>
    );
  if (!bank || existing === undefined) return <Spinner />;
  if (attempt) return <MockRunner bank={bank} initial={attempt} />;

  const start = async () => {
    const id = `${examId}-${mockId}-${Date.now()}`;
    const plan = mockId === 'random' ? composeRandomMock(bank, av, id) : composeFixedMock(bank, mockId);
    if (!plan) {
      setError('La banque débloquée ne suffit pas encore pour composer un examen aléatoire complet.');
      return;
    }
    if (existing) await db.exams.update(existing.id, { status: 'abandoned' });
    const remaining: Record<string, number> = {};
    for (const s of plan.sections) if (s.seconds) remaining[s.id] = s.seconds;
    const a: MockAttempt = {
      id,
      exam: examId,
      mockId,
      status: 'in-progress',
      startedAt: new Date().toISOString(),
      questionIds: planQuestionIds(plan),
      answers: {},
      times: {},
      flagged: [],
      sectionIndex: 0,
      remaining,
      listeningIndex: 0,
    };
    await db.exams.put(a);
    setAttempt(a);
  };

  const title = mockId === 'random' ? 'Examen blanc aléatoire' : `Examen blanc n°${mockId === 'mock2' ? 2 : 1}`;
  return (
    <div className="max-w-xl mx-auto py-4">
      <PageTitle back="/examens" subtitle={EXAM_LABEL[examId]}>
        {title}
      </PageTitle>
      <Card>
        <h2 className="font-bold mb-2">Conditions</h2>
        {examId === 'toeic' ? (
          <ul className="list-disc pl-5 space-y-1.5 text-[0.95rem]">
            <li>200 questions : Listening (100, environ 45 min) puis Reading (100, 75 min).</li>
            <li>Chaque enregistrement n’est diffusé qu’une fois ; l’examen avance tout seul. Utilisez des écouteurs.</li>
            <li>En Reading, vous circulez librement entre les questions et pouvez en marquer pour y revenir.</li>
            <li>Aucune pénalité : répondez à tout, même au hasard.</li>
          </ul>
        ) : (
          <ul className="list-disc pl-5 space-y-1.5 text-[0.95rem]">
            <li>6 sous-tests de 15 questions, 20 minutes chacun, dans l’ordre officiel.</li>
            <li>Vous circulez librement dans le sous-test en cours, mais vous ne pouvez pas revenir à un sous-test terminé.</li>
            <li>Difficulté croissante au sein de chaque sous-test. Calculatrice interdite : prévoyez du brouillon.</li>
            <li>Aucune pénalité pour une mauvaise réponse : ne laissez rien en blanc.</li>
          </ul>
        )}
        <p className="text-sm text-muted mt-3">Si vous quittez, la progression est enregistrée et le chronomètre s’arrête. Pour une mesure fiable, faites l’examen d’une traite.</p>
        {error && <p className="text-bad text-sm mt-3">{error}</p>}
        <div className="flex flex-wrap gap-2 mt-4">
          {existing && (
            <Button size="lg" variant="accent" onClick={() => setAttempt(existing)}>
              Reprendre l’examen en cours
            </Button>
          )}
          <Button size="lg" variant={existing ? 'secondary' : 'primary'} onClick={() => void start()}>
            {existing ? 'Recommencer à zéro' : 'Commencer'}
          </Button>
        </div>
      </Card>
    </div>
  );
}

// ---------------------------------------------------------------------------------------------

function MockRunner({ bank, initial }: { bank: Bank; initial: MockAttempt }) {
  const navigate = useNavigate();
  const plan = useMemo(() => rebuildPlan(bank, initial.mockId, initial.questionIds), [bank, initial]);
  const att = useRef<MockAttempt>(initial);
  const [, setVersion] = useState(0);
  const [phase, setPhase] = useState<'transition' | 'running' | 'finishing'>('transition');
  const finishing = useRef(false);

  // Numérotation : 1-200 en continu au TOEIC, 1-15 par sous-test au TAGE MAGE.
  const numbering = useMemo(() => {
    const map = new Map<string, number>();
    if (bank.exam === 'toeic') plan.sections.flatMap((s) => s.items.flatMap((it) => it.questions)).forEach((q, i) => map.set(q.id, i + 1));
    else for (const s of plan.sections) s.items.flatMap((it) => it.questions).forEach((q, i) => map.set(q.id, i + 1));
    return map;
  }, [plan, bank.exam]);

  const save = useCallback(async (patch: Partial<MockAttempt> = {}) => {
    att.current = { ...att.current, ...patch };
    await db.exams.put(att.current);
  }, []);

  const onAnswer = useCallback(
    (q: Question, choice: number) => {
      att.current = { ...att.current, answers: { ...att.current.answers, [q.id]: choice } };
      setVersion((v) => v + 1);
      void save();
    },
    [save],
  );

  const onFlag = useCallback(
    (qid: string) => {
      const f = new Set(att.current.flagged);
      if (f.has(qid)) f.delete(qid);
      else f.add(qid);
      att.current = { ...att.current, flagged: [...f] };
      setVersion((v) => v + 1);
      void save();
    },
    [save],
  );

  /** Temps passé sur un item, réparti entre ses questions. */
  const addTime = useCallback((item: Item, ms: number) => {
    const per = ms / item.questions.length;
    const times = { ...att.current.times };
    for (const q of item.questions) times[q.id] = (times[q.id] ?? 0) + per;
    att.current = { ...att.current, times };
  }, []);

  const finish = useCallback(async () => {
    if (finishing.current) return;
    finishing.current = true;
    setPhase('finishing');
    stopSpeech();
    const a = att.current;
    for (const id of a.questionIds) {
      const q = bank.byId.get(id);
      if (q) await recordAnswer({ q, choice: a.answers[id] ?? null, ms: a.times[id] ?? 0, mode: 'mock', xp: 0 });
    }
    const result = computeMockResult(bank, a.questionIds, a.answers, a.times);
    await save({ status: 'done', finishedAt: new Date().toISOString(), result });
    await addXp(XP.mockComplete);
    if (a.mockId !== 'random') {
      await useApp.getState().updateProfile((p) => ({ ...p, completedMocks: [...new Set([...p.completedMocks, `${a.exam}-${a.mockId}`])] }));
    }
    const badges = await checkBadges();
    navigate(`/rapport/${encodeURIComponent(a.id)}`, { replace: true, state: { badges: badges.map((b) => b.id) } });
  }, [bank, navigate, save]);

  const endSection = useCallback(async () => {
    stopSpeech();
    const next = att.current.sectionIndex + 1;
    if (next >= plan.sections.length) {
      await finish();
      return;
    }
    await save({ sectionIndex: next });
    setPhase('transition');
    window.scrollTo(0, 0);
  }, [plan, finish, save]);

  const quit = useCallback(async () => {
    stopSpeech();
    await save();
    navigate('/examens');
  }, [navigate, save]);

  if (phase === 'finishing') return <Spinner label="Correction et calcul du score…" />;

  const section = plan.sections[att.current.sectionIndex];
  if (!section) return <Spinner />;

  if (phase === 'transition')
    return <SectionIntro bank={bank} section={section} index={att.current.sectionIndex} count={plan.sections.length} remaining={att.current.remaining[section.id]} onStart={() => setPhase('running')} onQuit={() => void quit()} />;

  if (section.listening)
    return (
      <ListeningSection
        key={section.id}
        section={section}
        startIndex={att.current.listeningIndex ?? 0}
        answers={att.current.answers}
        numbering={numbering}
        onAnswer={onAnswer}
        addTime={addTime}
        onIndex={(i) => void save({ listeningIndex: i })}
        onDone={() => void endSection()}
        onQuit={() => void quit()}
      />
    );

  return (
    <TimedSection
      key={section.id}
      section={section}
      exam={bank.exam}
      answers={att.current.answers}
      flagged={att.current.flagged}
      remaining={att.current.remaining[section.id] ?? section.seconds ?? 0}
      numbering={numbering}
      onAnswer={onAnswer}
      onFlag={onFlag}
      addTime={addTime}
      onTick={(left) => void save({ remaining: { ...att.current.remaining, [section.id]: left } })}
      onEnd={() => void endSection()}
      onQuit={() => void quit()}
    />
  );
}

// ---------------------------------------------------------------------------------------------

function SectionIntro({ bank, section, index, count, remaining, onStart, onQuit }: { bank: Bank; section: MockSectionPlan; index: number; count: number; remaining?: number; onStart: () => void; onQuit: () => void }) {
  const voicePrefs = useApp((s) => s.settings.voicePrefs);
  const nQuestions = section.items.reduce((s, it) => s + it.questions.length, 0);
  const resumed = section.seconds !== undefined && remaining !== undefined && remaining < section.seconds;
  const soundCheck = () =>
    void playListening('sound-check', [{ speaker: 'Test', voice: 'US-F', text: 'This is a sound check. If you can hear this sentence clearly, you are ready to begin.' }], { rate: 1, voicePrefs });

  return (
    <div className="max-w-xl mx-auto py-6 anim-rise">
      <p className="text-sm font-semibold text-muted">
        {bank.exam === 'toeic' ? 'Section' : 'Sous-test'} {index + 1} sur {count}
      </p>
      <h1 className="text-2xl font-extrabold mt-1">{section.label}</h1>
      <p className="text-muted mt-1">
        {nQuestions} questions ·{' '}
        {section.seconds ? (resumed ? `${formatClock(remaining!)} restantes` : `${Math.round(section.seconds / 60)} minutes`) : 'environ 45 minutes, rythmé par l’audio'}
      </p>
      <Card className="mt-4 space-y-3">
        {section.sections.map((id) => (
          <div key={id}>
            <h2 className="font-semibold text-sm">{sectionDef(id).label}</h2>
            <p lang={bank.exam === 'toeic' ? 'en' : 'fr'} className="text-sm text-muted">
              {sectionDef(id).directions}
            </p>
          </div>
        ))}
        {bank.exam === 'tagemage' && <p className="text-sm font-semibold">Rappel : aucune pénalité, répondez à toutes les questions.</p>}
        {section.listening && (
          <div className="rounded-xl bg-surface-2 p-3 text-sm space-y-2">
            <p className="flex items-center gap-2 font-semibold">
              <IconHeadphones size={18} /> Vérifiez le son avant de commencer
            </p>
            <p className="text-muted">Sans voix anglaise sur l’appareil, la transcription s’affichera à la place de l’audio.</p>
            <Button size="sm" variant="secondary" onClick={soundCheck}>
              Tester le son
            </Button>
          </div>
        )}
      </Card>
      <div className="flex flex-wrap gap-2 mt-4">
        <Button size="lg" onClick={onStart} autoFocus>
          {resumed ? 'Reprendre' : 'Commencer'}
        </Button>
        <Button size="lg" variant="ghost" onClick={onQuit}>
          Quitter (reprise possible)
        </Button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------------------------

interface ItemViewProps {
  item: Item;
  answers: Record<string, number | null>;
  onAnswer: (q: Question, choice: number) => void;
  numbering: Numbering;
  flagged?: string[];
  onFlag?: (qid: string) => void;
  /** Affiche le texte des options des Parties 1-2 (repli sans audio). */
  showText?: boolean;
}

/** Item d'examen : document affiché une fois, puis toutes ses questions. */
function ExamItemView({ item, answers, onAnswer, numbering, flagged, onFlag, showText }: ItemViewProps) {
  const [focus, setFocus] = useState(0);
  const q0 = item.questions[0];
  const lang = q0.exam === 'toeic' ? 'en' : 'fr';
  const p12 = q0.section === 'part1' || q0.section === 'part2';
  return (
    <div className="space-y-5">
      {item.group?.media && <MediaView media={item.group.media} />}
      {item.group?.passages && <PassageList passages={item.group.passages} currentBlank={q0.section === 'part6' ? (item.groupIndex?.[focus] ?? focus + 1) : undefined} lang={lang} />}
      {item.questions.map((q, i) => {
        const hide = p12 && !showText;
        const isFlagged = flagged?.includes(q.id);
        return (
          <div key={q.id} role="group" aria-labelledby={`q-${q.id}`} className="space-y-2" onFocus={() => setFocus(i)} onClick={() => setFocus(i)}>
            {!item.group && q.media && <MediaView media={q.media} />}
            <div className="flex items-start gap-2">
              <h2 id={`q-${q.id}`} lang={lang} className="flex-1 font-semibold leading-snug whitespace-pre-line">
                <span className="text-muted mr-1.5">{numbering.get(q.id)}.</span>
                {q.section === 'part1' ? (
                  <span lang="fr" className="text-muted font-normal">
                    Choisissez la phrase qui décrit le mieux l’image.
                  </span>
                ) : q.section === 'part2' && hide ? (
                  <span lang="fr" className="text-muted font-normal italic">
                    Écoutez la question et les trois réponses.
                  </span>
                ) : (
                  q.prompt
                )}
              </h2>
              {onFlag && (
                <button
                  type="button"
                  onClick={() => onFlag(q.id)}
                  aria-pressed={isFlagged}
                  className={`shrink-0 inline-flex items-center gap-1 rounded-lg border px-2 py-1 text-xs font-semibold ${isFlagged ? 'border-accent-bright bg-accent-soft text-accent' : 'border-line text-muted hover:bg-surface-2'}`}
                >
                  <IconFlag size={14} /> {isFlagged ? 'Marquée' : 'Marquer'}
                </button>
              )}
            </div>
            {q.section === 'conditions-minimales' && <p className="text-xs text-muted">{sectionDef('conditions-minimales').directions}</p>}
            <OptionList name={q.id} options={q.options} selected={answers[q.id] ?? null} onSelect={(c) => onAnswer(q, c)} hideText={hide} lang={lang} keyboard={item.questions.length === 1} />
          </div>
        );
      })}
    </div>
  );
}

// ---------------------------------------------------------------------------------------------

interface ListeningSectionProps {
  section: MockSectionPlan;
  startIndex: number;
  answers: Record<string, number | null>;
  numbering: Numbering;
  onAnswer: (q: Question, choice: number) => void;
  addTime: (item: Item, ms: number) => void;
  onIndex: (i: number) => void;
  onDone: () => void;
  onQuit: () => void;
}

function ListeningSection({ section, startIndex, answers, numbering, onAnswer, addTime, onIndex, onDone, onQuit }: ListeningSectionProps) {
  const items = section.items;
  const partOf = (i: number) => items[i]?.questions[0].section;
  const needsIntro = (i: number) => i === 0 || partOf(i) !== partOf(i - 1);
  const [index, setIndex] = useState(Math.min(startIndex, items.length - 1));
  const [ready, setReady] = useState(!needsIntro(Math.min(startIndex, items.length - 1)));
  const total = items.reduce((s, it) => s + it.questions.length, 0);
  const done = items.slice(0, index).reduce((s, it) => s + it.questions.length, 0);

  const next = (ms: number) => {
    addTime(items[index], ms);
    const n = index + 1;
    if (n >= items.length) {
      onDone();
      return;
    }
    onIndex(n);
    setIndex(n);
    setReady(!needsIntro(n));
    window.scrollTo(0, 0);
  };

  const part = partOf(index) as SectionId;
  return (
    <div className="max-w-2xl mx-auto">
      <div className="flex items-center gap-3 sticky top-0 bg-canvas/95 backdrop-blur py-2 z-10 mb-3">
        <button type="button" onClick={onQuit} className="p-2 -ml-2 rounded-lg hover:bg-surface-2" aria-label="Quitter l’examen (reprise possible)">
          <IconX />
        </button>
        <ProgressBar value={done} max={total} label={`Listening : ${done} questions sur ${total}`} tone="toeic" />
        <span className="text-sm text-muted tabular-nums whitespace-nowrap">
          {done}/{total}
        </span>
      </div>
      {!ready ? (
        <Card className="anim-rise">
          <h1 className="text-xl font-extrabold">{sectionDef(part).label}</h1>
          <p lang="en" className="text-muted mt-2">
            {sectionDef(part).directions}
          </p>
          <Button size="lg" className="mt-4" onClick={() => setReady(true)} autoFocus>
            Lancer la partie
          </Button>
        </Card>
      ) : (
        <ListeningStep key={items[index].key} item={items[index]} answers={answers} numbering={numbering} onAnswer={onAnswer} onNext={next} />
      )}
    </div>
  );
}

function ListeningStep({ item, answers, numbering, onAnswer, onNext }: { item: Item; answers: Record<string, number | null>; numbering: Numbering; onAnswer: (q: Question, c: number) => void; onNext: (ms: number) => void }) {
  const { play, stop } = useListening(item);
  const [left, setLeft] = useState<number | null>(null);
  const [noAudio, setNoAudio] = useState(false);
  const shownAt = useRef(performance.now());
  const advanced = useRef(false);
  // Référence stable : le décompte ne doit pas redémarrer quand le parent se ré-affiche.
  const onNextRef = useRef(onNext);
  useEffect(() => {
    onNextRef.current = onNext;
  }, [onNext]);

  const go = useCallback(() => {
    if (advanced.current) return;
    advanced.current = true;
    stop();
    onNextRef.current(performance.now() - shownAt.current);
  }, [stop]);

  // Une seule diffusion, à vitesse normale, puis fenêtre de réponse.
  useEffect(() => {
    let alive = true;
    void play(1).then((used) => {
      if (!alive) return;
      const none = used === 'none';
      // Sans voix disponible : temps de lecture de la transcription ajouté (≈ 2,5 mots/s).
      const words = none ? transcriptLines(item).reduce((s, l) => s + l.text.split(/\s+/).length, 0) : 0;
      setNoAudio(none);
      setLeft(answerWindowSeconds(item) + Math.ceil(words / 2.5));
    });
    return () => {
      alive = false;
      stop();
    };
    // Lecture lancée une seule fois par item (le composant est recréé à chaque item).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (left === null) return;
    if (left <= 0) {
      go();
      return;
    }
    const t = setTimeout(() => setLeft((l) => (l === null ? l : l - 1)), 1000);
    return () => clearTimeout(t);
  }, [left, go]);

  return (
    <div className="space-y-4 anim-rise">
      <div className="rounded-xl border border-line bg-surface-2 p-3 flex flex-wrap items-center gap-3" aria-live="polite">
        <IconHeadphones />
        {left === null ? (
          <span className="font-semibold">Écoute en cours…</span>
        ) : (
          <span className="font-semibold tabular-nums">Temps pour répondre : {left} s</span>
        )}
        {left !== null && (
          <Button size="sm" variant="secondary" className="ml-auto" onClick={go}>
            Suite <IconChevronRight size={16} />
          </Button>
        )}
      </div>
      {noAudio &&
        (item.group?.transcript ? (
          <TranscriptFallback item={item} />
        ) : (
          <p className="rounded-xl bg-surface-2 p-3 text-sm text-muted">Audio indisponible (aucune voix anglaise sur cet appareil) : le texte est affiché à la place.</p>
        ))}
      <ExamItemView item={item} answers={answers} onAnswer={onAnswer} numbering={numbering} showText={noAudio} />
    </div>
  );
}

// ---------------------------------------------------------------------------------------------

interface TimedSectionProps {
  section: MockSectionPlan;
  exam: Bank['exam'];
  answers: Record<string, number | null>;
  flagged: string[];
  remaining: number;
  numbering: Numbering;
  onAnswer: (q: Question, choice: number) => void;
  onFlag: (qid: string) => void;
  addTime: (item: Item, ms: number) => void;
  onTick: (left: number) => void;
  onEnd: () => void;
  onQuit: () => void;
}

function TimedSection({ section, exam, answers, flagged, remaining, numbering, onAnswer, onFlag, addTime, onTick, onEnd, onQuit }: TimedSectionProps) {
  const items = section.items;
  const questions = useMemo(() => items.flatMap((it, itemIndex) => it.questions.map((q) => ({ q, itemIndex }))), [items]);
  const [index, setIndex] = useState(() => Math.max(0, items.findIndex((it) => it.questions.some((q) => answers[q.id] === undefined))));
  const [left, setLeft] = useState(remaining);
  const [grid, setGrid] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const deadline = useRef(Date.now() + remaining * 1000);
  const shownAt = useRef(performance.now());
  const ended = useRef(false);
  const lastSaved = useRef(remaining);

  // Horloge murale : le décompte reste juste même si l'onglet est mis en arrière-plan.
  useEffect(() => {
    const t = setInterval(() => setLeft(Math.max(0, Math.ceil((deadline.current - Date.now()) / 1000))), 500);
    return () => clearInterval(t);
  }, []);

  const end = useCallback(() => {
    if (ended.current) return;
    ended.current = true;
    addTime(items[index], performance.now() - shownAt.current);
    onTick(0);
    onEnd();
  }, [addTime, items, index, onTick, onEnd]);

  useEffect(() => {
    if (left <= 0) {
      end();
      return;
    }
    if (lastSaved.current - left >= 10) {
      lastSaved.current = left;
      onTick(left);
    }
  }, [left, end, onTick]);

  const go = (i: number) => {
    if (i === index || i < 0 || i >= items.length) return;
    addTime(items[index], performance.now() - shownAt.current);
    shownAt.current = performance.now();
    setIndex(i);
    setGrid(false);
    window.scrollTo(0, 0);
  };

  const quit = () => {
    addTime(items[index], performance.now() - shownAt.current);
    shownAt.current = performance.now();
    onTick(left);
    onQuit();
  };

  const unanswered = questions.filter(({ q }) => answers[q.id] === undefined || answers[q.id] === null).length;
  const item = items[index];
  const first = numbering.get(item.questions[0].id);
  const last = numbering.get(item.questions[item.questions.length - 1].id);

  return (
    <div className="max-w-3xl mx-auto">
      <div className="flex items-center gap-2 sticky top-0 bg-canvas/95 backdrop-blur py-2 z-10 mb-3">
        <button type="button" onClick={quit} className="p-2 -ml-2 rounded-lg hover:bg-surface-2" aria-label="Quitter l’examen (reprise possible)">
          <IconX />
        </button>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold truncate">{section.label}</p>
          <p className="text-xs text-muted">
            Question{first !== last ? `s ${first}–${last}` : ` ${first}`} · {questions.length - unanswered}/{questions.length} répondues
          </p>
        </div>
        <span className={`inline-flex items-center gap-1 font-bold tabular-nums ${left <= 60 ? 'text-bad' : left <= 300 ? 'text-accent' : ''}`} role="timer" aria-label={`Temps restant ${formatClock(left)}`}>
          <IconClock size={18} /> {formatClock(left)}
        </span>
        <Button size="sm" variant="secondary" onClick={() => setGrid((g) => !g)} aria-expanded={grid}>
          Grille
        </Button>
      </div>

      {grid && (
        <Card className="mb-4">
          <div className="grid grid-cols-8 sm:grid-cols-10 gap-1.5">
            {questions.map(({ q, itemIndex }) => {
              const answered = answers[q.id] !== undefined && answers[q.id] !== null;
              const isFlag = flagged.includes(q.id);
              return (
                <button
                  key={q.id}
                  type="button"
                  onClick={() => go(itemIndex)}
                  className={`relative h-9 rounded-lg text-sm font-semibold tabular-nums border ${itemIndex === index ? 'border-brand border-2' : 'border-line'} ${answered ? 'bg-brand-soft text-brand-strong' : 'bg-surface'}`}
                  aria-label={`Question ${numbering.get(q.id)}${answered ? ', répondue' : ', sans réponse'}${isFlag ? ', marquée' : ''}`}
                >
                  {numbering.get(q.id)}
                  {isFlag && <span className="absolute -top-1 -right-1 h-2.5 w-2.5 rounded-full bg-accent-bright" aria-hidden="true" />}
                </button>
              );
            })}
          </div>
          <p className="text-xs text-muted mt-2">Fond coloré : répondue · point orange : marquée.</p>
        </Card>
      )}

      <div key={item.key} className="anim-rise">
        <ExamItemView item={item} answers={answers} onAnswer={onAnswer} numbering={numbering} flagged={flagged} onFlag={onFlag} />
      </div>

      <div className="flex items-center justify-between gap-2 mt-6 pb-8">
        <Button variant="secondary" onClick={() => go(index - 1)} disabled={index === 0}>
          <IconChevronLeft size={18} /> Précédent
        </Button>
        {index < items.length - 1 ? (
          <Button onClick={() => go(index + 1)}>
            Suivant <IconChevronRight size={18} />
          </Button>
        ) : (
          <Button variant="accent" onClick={() => setConfirm(true)}>
            Terminer {exam === 'toeic' ? 'la section' : 'le sous-test'}
          </Button>
        )}
      </div>
      {index < items.length - 1 && (
        <p className="text-center -mt-4 pb-8">
          <button type="button" className="text-sm text-muted underline" onClick={() => setConfirm(true)}>
            Terminer {exam === 'toeic' ? 'la section' : 'le sous-test'} maintenant
          </button>
        </p>
      )}

      <Modal open={confirm} onClose={() => setConfirm(false)} title={`Terminer ${exam === 'toeic' ? 'la section' : 'le sous-test'} ?`}>
        <p>
          {unanswered > 0 ? `${unanswered} question${unanswered > 1 ? 's' : ''} sans réponse.` : 'Toutes les questions ont une réponse.'} Il vous reste {formatClock(left)}.
        </p>
        <p className="text-sm text-muted mt-1">
          {exam === 'tagemage' ? 'Vous ne pourrez plus revenir à ce sous-test. Rappel : aucune pénalité, mieux vaut répondre au hasard que laisser un blanc.' : 'Vous ne pourrez plus modifier vos réponses.'}
        </p>
        <div className="flex justify-end gap-2 mt-4">
          <Button variant="secondary" onClick={() => setConfirm(false)}>
            Continuer à travailler
          </Button>
          <Button
            variant="accent"
            onClick={() => {
              setConfirm(false);
              end();
            }}
          >
            Terminer
          </Button>
        </div>
      </Modal>
    </div>
  );
}
