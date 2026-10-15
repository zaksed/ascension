/** Fiche « notion à connaître » façon flashcard : la question, puis la réponse à la demande. */
import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useApp } from '../store/app';
import { useBank, useToday, isExamId } from '../hooks';
import { loadNotions, notionOfTheDay, randomNotion, type NotionCard } from '../features/notions/notions';
import { skillLabel } from '../content/bank';
import { Button, Card, EmptyState, LinkButton, PageTitle, Spinner } from '../components/ui';
import { IconBulb, IconRefresh } from '../components/icons';
import { EXAM_LABEL } from '../content/exams';

export default function NotionPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const activeExam = useApp((s) => s.settings.activeExam);
  const today = useToday();
  const [cards, setCards] = useState<NotionCard[] | null>(null);
  const [error, setError] = useState(false);
  const [revealed, setRevealed] = useState(false);

  useEffect(() => {
    loadNotions().then(setCards, () => setError(true));
  }, []);
  useEffect(() => setRevealed(false), [id]);

  const card = cards ? (id ? cards.find((c) => c.id === id) : notionOfTheDay(cards, activeExam, today)) : undefined;
  const exam = card?.exam ?? activeExam;
  const { bank } = useBank(isExamId(exam) ? exam : 'toeic');

  if (error) return <EmptyState title="Fiches indisponibles pour le moment." />;
  if (!cards) return <Spinner />;
  if (!card)
    return (
      <EmptyState title="Fiche introuvable">
        <LinkButton to="/notion" className="mt-4">
          Voir la notion du jour
        </LinkButton>
      </EmptyState>
    );

  const next = () => {
    const n = randomNotion(cards, card.exam, card.id);
    if (n) navigate(`/notion/${n.id}`);
  };

  return (
    <div className="max-w-xl mx-auto space-y-4">
      <PageTitle back="/" subtitle={EXAM_LABEL[card.exam]}>
        Notion à connaître
      </PageTitle>
      <Card className="anim-rise">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted flex items-center gap-1.5">
          <IconBulb size={16} className="text-accent" /> {card.skill && bank ? skillLabel(bank, card.skill) : 'Méthode'}
        </p>
        <h2 className="text-xl font-extrabold mt-2 leading-snug">{card.front}</h2>
        {revealed ? (
          <div className="mt-4 space-y-3 anim-rise" aria-live="polite">
            <p className="text-[1.02rem] leading-relaxed">{card.back}</p>
            {card.example && (
              <p lang={card.exam === 'toeic' ? 'en' : 'fr'} className="rounded-xl bg-brand-soft px-3 py-2 text-sm">
                <span className="font-semibold">Exemple : </span>
                {card.example}
              </p>
            )}
          </div>
        ) : (
          <Button size="lg" className="mt-5 w-full" onClick={() => setRevealed(true)} autoFocus>
            Voir la réponse
          </Button>
        )}
      </Card>
      {revealed && (
        <div className="flex flex-wrap gap-2">
          {card.skill && (
            <LinkButton to={`/entrainement/seance/${card.exam}?type=skill&value=${card.skill}`}>M’entraîner sur cette notion</LinkButton>
          )}
          <Button variant="secondary" onClick={next}>
            <IconRefresh size={16} /> Une autre notion
          </Button>
        </div>
      )}
    </div>
  );
}
